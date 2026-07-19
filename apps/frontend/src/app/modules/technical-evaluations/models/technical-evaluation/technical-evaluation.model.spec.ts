import { describe, it, expect } from 'vitest';
import {
  TechnicalEvaluation,
  RegenerateDto,
  QuizQuestionPublic,
  QuizPublicView,
  QuizSubmitPayload,
  QuizSubmitResult,
  EvaluationStatus,
} from './technical-evaluation.model';

describe('Technical Evaluation Models', () => {
  it('devrait définir correctement EvaluationStatus', () => {
    const statuses: EvaluationStatus[] = [
      'pending',
      'in_progress',
      'completed',
      'approved',
      'rejected',
    ];
    expect(statuses).toHaveLength(5);
  });

  describe('TechnicalEvaluation', () => {
    it('devrait créer un objet valide', () => {
      const evaluation: TechnicalEvaluation = {
        id: 1,
        jobPostId: 42,
        name: null, // ← ajouté
        title: 'Développeur Full Stack',
        status: 'completed',
        version: '2.1',
        index: 0,
        htmlContent: '<h1>Test</h1>',
        quizContent: null,
        quizAnswerKey: null,
        createdAt: '2025-05-01T10:00:00Z',
        updatedAt: '2025-05-10T14:30:00Z',
        driveFileId: '1abc123',
        driveFileUrl: 'https://drive.google.com/...',
      };

      expect(evaluation.id).toBe(1);
      expect(evaluation.status).toBe('completed');
      expect(evaluation.htmlContent).toBeDefined();
      expect(evaluation.quizContent).toBeNull();
    });

    it('devrait accepter les champs optionnels absents', () => {
      const minimal: TechnicalEvaluation = {
        id: 999,
        jobPostId: 10,
        name: null,
        title: 'Minimal Eval',
        status: 'pending',
        version: '1.0',
        index: null,
      };

      expect(minimal).toBeDefined();
      expect(minimal.driveFileUrl).toBeUndefined();
      expect(minimal.htmlContent).toBeUndefined();
    });
  });

  it('devrait créer un RegenerateDto valide', () => {
    const dto: RegenerateDto = {
      jobPostId: 42,
      evaluationId: 123,
      prompt: 'Améliore le contenu technique',
    };

    expect(dto.jobPostId).toBe(42);
    expect(dto.evaluationId).toBe(123);
  });

  describe('Quiz Models', () => {
    it('devrait créer un QuizQuestionPublic', () => {
      const question: QuizQuestionPublic = {
        id: 101,
        question: 'Quelle est la capitale de la France ?',
        type: 'single_choice',
        options: ['Paris', 'Berlin', 'Madrid'],
        domain: 'Géographie',
        difficulty: 'easy',
      };

      expect(question.difficulty).toBe('easy');
    });

    it('devrait créer un QuizPublicView complet', () => {
      const quizView: QuizPublicView = {
        invitationId: 50,
        evaluationId: 123,
        candidateFirstName: 'Jean',
        candidateName: 'Dupont',
        title: 'Quiz Technique',
        description: 'Testez vos connaissances',
        durationMinutes: 45,
        dueDate: '2025-06-01T23:59:59Z',
        questions: [],
      };

      expect(quizView.durationMinutes).toBe(45);
    });

    it('devrait créer un QuizSubmitResult complet', () => {
      const result: QuizSubmitResult = {
        scorePercent: 85,
        correctAnswers: 17,
        totalQuestions: 20,
        detail: [],
        aiFeedback: {
          globalScore: 85,
          recommendation: 'hire',
          globalFeedback: 'Bon niveau technique',
          strengths: ['Algorithmes', 'Angular'],
          weaknesses: ['System Design'],
          domainAnalysis: [],
          interviewRecommendations: ['Parler plus des expériences'],
        },
      };

      expect(result.scorePercent).toBe(85);
      expect(result.aiFeedback.recommendation).toBe('hire');
    });
  });

  it('devrait respecter les types de QuizSubmitPayload', () => {
    const payload: QuizSubmitPayload = {
      answers: [
        { questionId: 101, answer: 'Paris' },
        { questionId: 102, answer: '42' },
      ],
      durationSeconds: 2340,
    };

    expect(payload.answers).toHaveLength(2);
  });
});
