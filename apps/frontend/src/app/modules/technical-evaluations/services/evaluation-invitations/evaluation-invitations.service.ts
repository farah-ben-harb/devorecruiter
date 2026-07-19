import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import {
  EvaluationInvitation,
  EvaluationInvitationSummary,
  SendEvaluationInvitationsPayload,
} from '../../models/evaluation-invitation/evaluation-invitation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationInvitationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/invitations`;

  send(payload: SendEvaluationInvitationsPayload): Observable<void> {
    return this.http.post<void>(`${this.base}/send`, payload);
  }

  getByResume(resumeFileId: string): Observable<EvaluationInvitation[]> {
    return this.http.get<EvaluationInvitation[]>(`${this.base}/by-resume/${resumeFileId}`);
  }

  getByJobPost(jobPostId: number): Observable<EvaluationInvitationSummary[]> {
    return this.http.get<EvaluationInvitationSummary[]>(`${this.base}/by-job-post/${jobPostId}`);
  }

  delete(invitationId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${invitationId}`);
  }

  getByEvaluation(evaluationId: number): Observable<EvaluationInvitation[]> {
    return this.http.get<EvaluationInvitation[]>(`${this.base}/by-evaluation/${evaluationId}`);
  }

  findByResumeFileId(driveFileId: string): Observable<EvaluationInvitation[]> {
    return this.http.get<EvaluationInvitation[]>(`${this.base}/by-resume/${driveFileId}`);
  }
}
