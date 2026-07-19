import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, timeout } from 'rxjs/operators';
import { DriveFile, PaginatedResponse } from '@shared/models/shared.model';
import {
  CandidateRaw,
  ResumeListItem,
  ScoringResult,
  TriggerScoringResponse,
} from '../models/candidate.model';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class CandidatesService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/candidates`;
  private readonly scoringUrl = `${environment.apiUrl}/scoring-job-post`;
  private readonly jobPostUrl = `${environment.apiUrl}/job-posts`;

  getAll(page = 1, limit = 10): Observable<PaginatedResponse<ResumeListItem>> {
    return this.http.get<PaginatedResponse<ResumeListItem>>(
      `${this.apiUrl}?page=${page}&limit=${limit}`,
    );
  }

  uploadResume(file: File, folderId: string): Observable<CandidateRaw> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<CandidateRaw>(`${this.apiUrl}/upload?folderId=${folderId}`, form);
  }

  deleteResume(id: string, type: 'brut' | 'unifie'): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      params: { type },
    });
  }

  triggerUnification(id: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.apiUrl}/${id}/unify`, {})
      .pipe(timeout(150000));
  }

  syncDrive(): Observable<{ added: number; removed: number }> {
    return this.http.post<{ added: number; removed: number }>(`${this.apiUrl}/sync-drive`, {});
  }

  getScoringResult(candidateId: string): Observable<ScoringResult | null> {
    return this.http.get<ScoringResult | null>(
      `${this.scoringUrl}/candidates/${candidateId}/results`,
    );
  }

  triggerScoring(candidateId: string): Observable<TriggerScoringResponse> {
    return this.http.post<TriggerScoringResponse>(
      `${this.scoringUrl}/candidates/${candidateId}/trigger`,
      {},
    );
  }

  downloadJobPost(fileId: string): Observable<{ data: string; mimeType: string }> {
    return this.http.get<{ data: string; mimeType: string }>(
      `${this.jobPostUrl}/download/${fileId}`,
    );
  }

  // ── Drive via backend (token géré côté serveur) ───────────────────────────

  listDriveFiles(folderId: string): Observable<DriveFile[]> {
    return this.http.get<DriveFile[]>(`${this.apiUrl}/drive-files?folderId=${folderId}`);
  }

  downloadDriveFile(driveId: string): Observable<Blob> {
    return this.http
      .get<{ data: string; mimeType: string }>(`${this.apiUrl}/download/${driveId}`)
      .pipe(
        map((response) => {
          const bytes = atob(response.data);
          const arr = new Uint8Array(bytes.length);
          for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
          return new Blob([arr], { type: 'application/pdf' });
        }),
      );
  }

  updateFields(
    id: string,
    fields: { githubUsername?: string; email?: string },
  ): Observable<CandidateRaw> {
    return this.http.patch<CandidateRaw>(`${this.apiUrl}/${id}/fields`, fields);
  }
}
