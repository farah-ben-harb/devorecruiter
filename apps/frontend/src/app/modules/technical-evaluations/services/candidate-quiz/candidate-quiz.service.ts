import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  QuizPublicView,
  QuizSubmitPayload,
  QuizSubmitResult,
} from '../../models/technical-evaluation/technical-evaluation.model';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

@Injectable({ providedIn: 'root' })
export class CandidateQuizService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/quiz';
  getQuizByToken(token: string): Observable<QuizPublicView> {
    return this.http.get<QuizPublicView>(`${this.base}/${token}`);
  }

  submitQuiz(token: string, payload: QuizSubmitPayload): Observable<QuizSubmitResult> {
    return this.http.post<QuizSubmitResult>(`${this.base}/${token}/submit`, payload);
  }

  // ── Privé (RH) ─────────────────────────────────────────────────────────
  getResultsByEvaluation(evaluationId: number): Observable<CandidateQuizResult[]> {
    return this.http.get<CandidateQuizResult[]>(`${this.base}/results/evaluation/${evaluationId}`);
  }

  getResultByInvitation(invitationId: number): Observable<CandidateQuizResult | null> {
    return this.http.get<CandidateQuizResult | null>(
      `${this.base}/results/invitation/${invitationId}`,
    );
  }
}
