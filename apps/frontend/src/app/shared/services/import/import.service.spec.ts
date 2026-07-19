import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { ImportService } from './import.service';

describe('ImportService', () => {
  let service: ImportService;
  let httpMock: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    httpMock = {
      post: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: httpMock }],
    });

    service = TestBed.inject(ImportService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('importUsers() posts the selected file in FormData', () => {
    const file = new File(['id,name\n1,Alice'], 'users.csv', { type: 'text/csv' });
    const response = { added: 1, ignored: 0, errors: [] as string[] };

    httpMock.post.mockReturnValue(of(response));

    service.importUsers(file).subscribe((result) => {
      expect(result).toEqual(response);
    });

    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith(
      expect.stringContaining('/import/users'),
      expect.any(FormData),
    );

    const [, formData] = httpMock.post.mock.calls[0];
    expect((formData as FormData).get('file')).toBe(file);
  });
});
