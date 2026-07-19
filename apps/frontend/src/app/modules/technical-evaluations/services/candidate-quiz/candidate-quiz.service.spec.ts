import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { CandidateQuizService } from './candidate-quiz.service';
import {
  QuizPublicView,
  QuizSubmitPayload,
  QuizSubmitResult,
} from '../../models/technical-evaluation/technical-evaluation.model';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

// ─── BUILDERS ───
const defaultQuizPublicView = (): QuizPublicView => ({
  invitationId: 1,
  evaluationId: 1,
  candidateFirstName: 'Jean',
  candidateName: 'Dupont',
  title: 'Quiz Test',
  description: 'Description',
  durationMinutes: 30,
  dueDate: new Date().toISOString(),
  questions: [
    {
      id: 1,
      question: 'Q1',
      type: 'single_choice',
      options: ['A', 'B'],
      domain: 'JS',
      difficulty: 'easy',
    },
  ],
});

const defaultQuizSubmitPayload = (): QuizSubmitPayload => ({
  answers: [{ questionId: 1, answer: 'A' }],
  durationSeconds: 1200,
});

const defaultQuizSubmitResult = (): QuizSubmitResult => ({
  scorePercent: 85,
  correctAnswers: 8,
  totalQuestions: 10,
  detail: [],
  aiFeedback: {
    globalScore: 85,
    recommendation: 'hire',
    globalFeedback: 'Excellent',
    strengths: ['Bonne logique'],
    weaknesses: ['Manque de tests'],
    domainAnalysis: [{ domain: 'JS', mastery: 'strong', comment: 'Très bon' }],
    interviewRecommendations: ['Approfondir'],
  },
});

const defaultCandidateQuizResult = (): CandidateQuizResult => ({
  id: 1,
  invitationId: 1,
  candidateId: 'candidate-1',
  evaluationId: 1,
  totalQuestions: 10,
  correctAnswers: 8,
  scorePercent: 80,
  detailJson: null,
  aiFeedbackJson: null,
  durationSeconds: 1200,
  submittedAt: new Date().toISOString(),
});

// ─── MOCK HTTP ───
const createHttpClientMock = () => ({
  get: vi.fn<(url: string, options?: object) => Observable<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Observable<unknown>>(),
});

describe('CandidateQuizService', () => {
  let service: CandidateQuizService;
  let httpMock: ReturnType<typeof createHttpClientMock>;

  beforeEach(() => {
    httpMock = createHttpClientMock();

    TestBed.configureTestingModule({
      providers: [CandidateQuizService, { provide: HttpClient, useValue: httpMock }],
    });

    service = TestBed.inject(CandidateQuizService);
  });

  describe('getQuizByToken', () => {
    it('appelle GET /api/quiz/:token', () => {
      const response = defaultQuizPublicView();
      httpMock.get.mockReturnValue(of(response));

      service.getQuizByToken('token-123').subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.get).toHaveBeenCalledWith('/api/quiz/token-123');
    });
  });

  describe('submitQuiz', () => {
    it('appelle POST /api/quiz/:token/submit avec payload', () => {
      const payload = defaultQuizSubmitPayload();
      const response = defaultQuizSubmitResult();
      httpMock.post.mockReturnValue(of(response));

      service.submitQuiz('token-123', payload).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.post).toHaveBeenCalledWith('/api/quiz/token-123/submit', payload);
    });
  });

  describe('getResultsByEvaluation', () => {
    it('appelle GET /api/quiz/results/evaluation/:evaluationId', () => {
      const response = [defaultCandidateQuizResult()];
      httpMock.get.mockReturnValue(of(response));

      service.getResultsByEvaluation(1).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.get).toHaveBeenCalledWith('/api/quiz/results/evaluation/1');
    });
  });

  describe('getResultByInvitation', () => {
    it('appelle GET /api/quiz/results/invitation/:invitationId', () => {
      const response = defaultCandidateQuizResult();
      httpMock.get.mockReturnValue(of(response));

      service.getResultByInvitation(1).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.get).toHaveBeenCalledWith('/api/quiz/results/invitation/1');
    });

    it('gère résultat null', () => {
      httpMock.get.mockReturnValue(of(null));

      service.getResultByInvitation(99).subscribe((result) => {
        expect(result).toBeNull();
      });

      expect(httpMock.get).toHaveBeenCalledWith('/api/quiz/results/invitation/99');
    });
  });
});
