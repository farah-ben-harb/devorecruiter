import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { JobPostService } from './job-posts.service';
import { environment } from '@env/environment';

describe('JobPostService', () => {
  let service: JobPostService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/job-posts`;
  const scoringUrl = `${environment.apiUrl}/scoringresume`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [JobPostService],
    });
    service = TestBed.inject(JobPostService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getAll() appelle le bon endpoint avec page et limit', () => {
    service.getAll(1, 10).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/all?page=1&limit=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], total: 0, totalPages: 1 });
  });

  it('getAll() utilise les valeurs par défaut page=1 limit=10', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/all?page=1&limit=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], total: 0, totalPages: 1 });
  });

  it('getImportedFileIds() appelle le bon endpoint', () => {
    service.getImportedFileIds().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/imported-file-ids`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('process() envoie le payload au bon endpoint', () => {
    const payload = {
      googleDriveFileId: 'drive-1',
      name: 'Fiche test',
      type: 'application/pdf',
      url: 'https://example.com/file.pdf',
    };
    service.process(payload).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/process`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: {} });
  });

  it("delete() appelle le bon endpoint avec l'id", () => {
    service.delete('5').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok', id: 5, action: 'deleted' });
  });

  it('delete() fonctionne aussi avec un id numérique', () => {
    service.delete(5).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok', id: 5, action: 'reset' });
  });

  it('download() appelle le bon endpoint avec le docId', () => {
    service.download('doc-123').subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === `${baseUrl}/download/doc-123` && r.params.get('mimeType') === 'application/pdf',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: 'base64==', mimeType: 'application/pdf', fileName: 'file.pdf' });
  });

  it("triggerUnification() appelle le bon endpoint avec l'id", () => {
    service.triggerUnification(5).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/5/unify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ message: 'ok' });
  });

  it('syncFromDrive() appelle le bon endpoint avec brutFolderId seulement', () => {
    service.syncFromDrive('folder-brut').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url.includes('/sync-drive') && r.url.includes('folderId=folder-brut'),
    );
    expect(req.request.method).toBe('POST');
    req.flush({ added: 1, removed: 0 });
  });

  it('syncFromDrive() inclut unifiedFolderId si fourni', () => {
    service.syncFromDrive('folder-brut', 'folder-unified').subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/sync-drive') &&
        r.url.includes('folderId=folder-brut') &&
        r.url.includes('unifiedFolderId=folder-unified'),
    );
    expect(req.request.method).toBe('POST');
    req.flush({ added: 2, removed: 1 });
  });

  it('listDriveFiles() appelle le bon endpoint avec folderId', () => {
    service.listDriveFiles('folder-123').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url.includes('/drive-files') && r.url.includes('folderId=folder-123'),
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'f1', name: 'File1', mimeType: 'application/pdf' }]);
  });

  it('downloadDriveFile() appelle le bon endpoint avec fileId et mimeType encodé', () => {
    service.downloadDriveFile('file-1', 'application/pdf').subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/drive-files/file-1/download') &&
        r.url.includes(`mimeType=${encodeURIComponent('application/pdf')}`),
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('uploadFile() envoie un FormData au bon endpoint', () => {
    const file = new File(['content'], 'fiche.pdf', { type: 'application/pdf' });
    service.uploadFile(file).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);
    req.flush({ message: 'ok', data: {} });
  });

  it('triggerAllScoring() envoie le payload au bon endpoint', () => {
    const payload = { jobPostGoogleDriveFileId: 'doc-1', jobPostId: 42 };
    service.triggerAllScoring(payload).subscribe();
    const req = httpMock.expectOne(`${scoringUrl}/trigger-all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush([]);
  });

  it('getScoringsByJobPost() appelle le bon endpoint avec jobPostId', () => {
    service.getScoringsByJobPost(42).subscribe();
    const req = httpMock.expectOne(`${scoringUrl}/job-post/42`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it("deleteScoring() appelle le bon endpoint avec l'id", () => {
    service.deleteScoring(99).subscribe();
    const req = httpMock.expectOne(`${scoringUrl}/99`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
