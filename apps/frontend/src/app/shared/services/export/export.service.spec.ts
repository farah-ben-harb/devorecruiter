import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;
  let httpMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T10:15:30.000Z'));

    httpMock = {
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: httpMock }],
    });

    service = TestBed.inject(ExportService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    ['exportUsersExcel', '/export/users', 'utilisateurs_2026-05-01.xlsx'],
    ['exportJobPostsExcel', '/export/job-posts/excel', 'fiches_poste_2026-05-01.xlsx'],
    ['exportJobPostsZip', '/export/job-posts/zip', 'fiches_poste_2026-05-01.zip'],
    ['exportCandidatesExcel', '/export/candidates/excel', 'candidats_2026-05-01.xlsx'],
    ['exportCandidatesZip', '/export/candidates/zip', 'candidats_2026-05-01.zip'],
  ])(
    '%s downloads from the expected endpoint with the expected filename',
    (method, url, filename) => {
      const blob = new Blob(['export-data'], { type: 'application/octet-stream' });
      const createObjectUrlSpy = vi
        .spyOn(window.URL, 'createObjectURL')
        .mockReturnValue('blob:url');
      const revokeObjectUrlSpy = vi
        .spyOn(window.URL, 'revokeObjectURL')
        .mockImplementation(() => undefined);
      const clickSpy = vi.fn();
      const removeSpy = vi.fn();
      const anchor = {
        href: '',
        download: '',
        click: clickSpy,
        remove: removeSpy,
      } as unknown as HTMLAnchorElement;
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => anchor);

      httpMock.get.mockReturnValue(of(blob));

      (service as unknown as Record<string, () => void>)[method]();

      expect(httpMock.get).toHaveBeenCalledWith(expect.stringContaining(url), {
        responseType: 'blob',
      });
      expect(createObjectUrlSpy).toHaveBeenCalledWith(blob);
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(anchor.href).toBe('blob:url');
      expect(anchor.download).toBe(filename);
      expect(appendChildSpy).toHaveBeenCalledWith(anchor);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:url');
    },
  );

  it('logs export errors without throwing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    httpMock.get.mockReturnValue(throwError(() => new Error('boom')));

    service.exportUsersExcel();

    expect(errorSpy).toHaveBeenCalledWith('Erreur export :', expect.any(Error));
  });
});
