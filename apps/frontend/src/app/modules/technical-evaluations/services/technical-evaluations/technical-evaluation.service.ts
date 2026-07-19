import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TechnicalEvaluation,
  RegenerateDto,
} from '../../models/technical-evaluation/technical-evaluation.model';
import { environment } from '../../../../../environments/environment';
import { EditContentPayload } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

@Injectable({ providedIn: 'root' })
export class TechnicalEvaluationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/technical-evaluations`;

  generate(jobPostId: number, mode: 'coding' | 'quiz'): Observable<TechnicalEvaluation> {
    return this.http.post<TechnicalEvaluation>(`${this.baseUrl}/generate`, { jobPostId, mode });
  }

  regenerate(dto: RegenerateDto): Observable<TechnicalEvaluation> {
    return this.http.post<TechnicalEvaluation>(`${this.baseUrl}/regenerate`, dto);
  }

  findAll(jobPostId: number, mode?: 'coding' | 'quiz'): Observable<TechnicalEvaluation[]> {
    const params: Record<string, string | number> = { jobPostId };
    if (mode) params['mode'] = mode;
    return this.http.get<TechnicalEvaluation[]>(this.baseUrl, { params });
  }
  findByJobPost(jobPostId: number): Observable<TechnicalEvaluation[]> {
    return this.http.get<TechnicalEvaluation[]>(`${this.baseUrl}/by-job-post`, {
      params: { jobPostId },
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  approve(id: number, status: 'approved' | 'rejected'): Observable<TechnicalEvaluation> {
    return this.http.patch<TechnicalEvaluation>(`${this.baseUrl}/${id}/approve`, { status });
  }

  updateContent(id: number, payload: EditContentPayload): Observable<TechnicalEvaluation> {
    return this.http.patch<TechnicalEvaluation>(`${this.baseUrl}/${id}/content`, payload);
  }

  createGitRepo(id: number): Observable<TechnicalEvaluation> {
    return this.http.post<TechnicalEvaluation>(`${this.baseUrl}/${id}/git-repo`, {});
  }
}
