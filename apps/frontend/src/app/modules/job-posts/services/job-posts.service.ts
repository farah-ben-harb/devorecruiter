import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  PostApiResponse,
  DownloadResponse,
  DriveFile,
  PaginatedResponse,
  ScoringResume,
  JobPostCriteria,
  CandidateSearchResult,
  JobPostActivityStatus,
} from '../models/job-post.model';

@Injectable({ providedIn: 'root' })
export class JobPostService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/job-posts`;
  private readonly scoringApi = `${environment.apiUrl}/scoringresume`;

  getAll(
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
    jobStatus?: string,
  ): Observable<PaginatedResponse<PostApiResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (search?.trim()) params = params.set('search', search.trim());
    if (status && status !== 'all') params = params.set('status', status);
    if (jobStatus && jobStatus !== 'all') params = params.set('jobStatus', jobStatus); // ← NOUVEAU
    return this.http.get<PaginatedResponse<PostApiResponse>>(`${this.apiUrl}/all`, { params });
  }

  getAllWithEvaluations(
    page = 1,
    limit = 10,
    search?: string,
  ): Observable<PaginatedResponse<PostApiResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PaginatedResponse<PostApiResponse>>(`${this.apiUrl}/with-evaluations`, {
      params,
    });
  }

  getImportedFileIds(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/imported-file-ids`);
  }

  process(payload: {
    googleDriveFileId: string;
    name: string;
    type: string;
    url: string;
  }): Observable<{ data: PostApiResponse }> {
    return this.http.post<{ data: PostApiResponse }>(`${this.apiUrl}/process`, payload);
  }

  delete(
    id: string | number,
  ): Observable<{ message: string; id: number; action: 'deleted' | 'reset' }> {
    return this.http.delete<{
      message: string;
      id: number;
      action: 'deleted' | 'reset';
    }>(`${this.apiUrl}/${id}`);
  }

  download(docId: string, mimeType = 'application/pdf'): Observable<DownloadResponse> {
    const params = new HttpParams().set('mimeType', mimeType);
    return this.http.get<DownloadResponse>(`${this.apiUrl}/download/${docId}`, { params });
  }

  triggerUnification(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/unify`, {});
  }

  syncFromDrive(
    brutFolderId: string,
    unifiedFolderId?: string,
  ): Observable<{ added: number; removed: number }> {
    let url = `${this.apiUrl}/sync-drive?folderId=${brutFolderId}`;
    if (unifiedFolderId) url += `&unifiedFolderId=${unifiedFolderId}`;
    return this.http.post<{ added: number; removed: number }>(url, {});
  }

  listDriveFiles(folderId: string): Observable<DriveFile[]> {
    return this.http.get<DriveFile[]>(`${this.apiUrl}/drive-files?folderId=${folderId}`);
  }

  downloadDriveFile(fileId: string, mimeType: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/drive-files/${fileId}/download?mimeType=${encodeURIComponent(mimeType)}`,
      { responseType: 'blob' },
    );
  }

  uploadFile(file: File): Observable<{ message: string; data: PostApiResponse }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ message: string; data: PostApiResponse }>(
      `${this.apiUrl}/upload`,
      formData,
    );
  }

  triggerAllScoring(payload: {
    jobPostGoogleDriveFileId: string;
    jobPostId: number;
  }): Observable<ScoringResume[]> {
    return this.http.post<ScoringResume[]>(`${this.scoringApi}/trigger-all`, payload);
  }

  getScoringsByJobPost(jobPostId: number): Observable<ScoringResume[]> {
    return this.http.get<ScoringResume[]>(`${this.scoringApi}/job-post/${jobPostId}`);
  }

  deleteScoring(id: number): Observable<void> {
    return this.http.delete<void>(`${this.scoringApi}/${id}`);
  }

  getById(id: number): Observable<PostApiResponse> {
    return this.http.get<PostApiResponse>(`${this.apiUrl}/${id}`);
  }

  updateRequiresCoding(id: number, requiresCoding: boolean | null) {
    return this.http.patch(`${this.apiUrl}/${id}/requires-coding`, { requiresCoding });
  }

  updateHasQcm(id: number, hasQcm: boolean | null) {
    return this.http.patch(`${this.apiUrl}/${id}/has-qcm`, { hasQcm });
  }

  updateTitle(id: number, title: string, company: string) {
    return this.http.patch(`${this.apiUrl}/${id}/title`, { title, company });
  }

  duplicate(
    id: number,
    payload: { title: string; company: string; hasQcm: boolean; requiresCoding: boolean },
  ): Observable<PostApiResponse> {
    return this.http.post<PostApiResponse>(`${this.apiUrl}/${id}/duplicate`, payload);
  }

  getDocxUrl(id: number): Observable<{ url: string; docxId: string | null }> {
    return this.http.get<{ url: string; docxId: string | null }>(`${this.apiUrl}/${id}/docx-url`);
  }

  downloadUnifiedPdf(id: number): Observable<DownloadResponse> {
    return this.http.get<DownloadResponse>(`${this.apiUrl}/${id}/download-pdf`);
  }

  getCriteria(id: number): Observable<JobPostCriteria> {
    return this.http.get<JobPostCriteria>(`${this.apiUrl}/${id}/criteria`);
  }

  updateCriteria(id: number, payload: Partial<JobPostCriteria>): Observable<JobPostCriteria> {
    return this.http.patch<JobPostCriteria>(`${this.apiUrl}/${id}/criteria`, payload);
  }

  updateJobStatus(
    id: number,
    jobStatus: JobPostActivityStatus | null,
    linkedCandidateIds?: string[],
  ): Observable<PostApiResponse> {
    return this.http.patch<PostApiResponse>(`${this.apiUrl}/${id}/job-status`, {
      jobStatus,
      linkedCandidateIds,
    });
  }

  searchCandidates(q?: string, ids?: string[]): Observable<CandidateSearchResult[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (ids?.length) params = params.set('ids', ids.join(','));
    return this.http.get<CandidateSearchResult[]>(`${this.apiUrl}/candidates/search`, { params });
  }

  rescoreOne(evaluationId: number): Observable<ScoringResume> {
    return this.http.post<ScoringResume>(`${this.scoringApi}/${evaluationId}/rescore`, {});
  }
}
