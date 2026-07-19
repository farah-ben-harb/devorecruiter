import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';

@Injectable({ providedIn: 'root' })
export class CandidateCodeEvaluationService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/technical-evaluations/candidate-code';

  evaluate(invitationId: number): Observable<CandidateCodeEvaluation> {
    return this.http.post<CandidateCodeEvaluation>(`${this.base}/${invitationId}/evaluate`, {});
  }

  getByInvitation(invitationId: number): Observable<CandidateCodeEvaluation | null> {
    return this.http
      .get<CandidateCodeEvaluation>(`${this.base}/invitation/${invitationId}`)
      .pipe(catchError(() => of(null)));
  }

  getByEvaluation(evaluationId: number): Observable<CandidateCodeEvaluation[]> {
    return this.http.get<CandidateCodeEvaluation[]>(`${this.base}/by-evaluation/${evaluationId}`);
  }
}
