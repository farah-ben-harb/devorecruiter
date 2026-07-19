import { Invitation } from '../evaluation-invitations/evaluation-invitation.entity';
import { CandidateQuizResult, QuizResultStatus } from './candidate-quiz-result.entity';

describe('CandidateQuizResult Entity', () => {
  it('should create a valid entity instance', () => {
    const entity = new CandidateQuizResult();

    entity.id = 1;
    entity.invitationId = 10;
    entity.candidateId = 'clk7h2x0f0000qzrmf4k3j8ab';
    entity.evaluationId = 5;

    entity.answersJson = JSON.stringify([
      { questionId: 1, answer: 'Option A' },
      { questionId: 2, answer: 'Option C' },
    ]);

    entity.totalQuestions = 15;
    entity.correctAnswers = 11;
    entity.scorePercent = 73;

    entity.detailJson = JSON.stringify([
      {
        questionId: 1,
        question: 'Q1',
        yourAnswer: 'A',
        correctAnswer: 'A',
        isCorrect: true,
        explanation: 'Correct',
        domain: 'NestJS',
        difficulty: 'easy',
      },
    ]);

    entity.aiFeedbackJson = JSON.stringify({
      globalScore: 80,
      recommendation: 'hire',
      globalFeedback: 'Very good',
      strengths: ['logic', 'clean code'],
      weaknesses: ['speed'],
      domainAnalysis: {},
      interviewRecommendations: 'Proceed',
    });

    entity.durationSeconds = 1245;
    entity.status = QuizResultStatus.COMPLETED;

    expect(entity).toBeDefined();
    expect(entity.id).toBe(1);
    expect(entity.invitationId).toBe(10);
    expect(entity.candidateId).toBe('clk7h2x0f0000qzrmf4k3j8ab');
    expect(entity.evaluationId).toBe(5);
    expect(entity.totalQuestions).toBe(15);
    expect(entity.correctAnswers).toBe(11);
    expect(entity.scorePercent).toBe(73);
    expect(entity.status).toBe(QuizResultStatus.COMPLETED);
  });

  it('should handle JSON fields correctly', () => {
    const entity = new CandidateQuizResult();

    const answers = [
      { questionId: 1, answer: 'A' },
      { questionId: 2, answer: 'B' },
    ];

    const detail = [
      {
        questionId: 1,
        question: 'What is NestJS?',
        yourAnswer: 'A',
        correctAnswer: 'A',
        isCorrect: true,
        explanation: 'Correct answer',
        domain: 'Backend',
        difficulty: 'medium',
      },
    ];

    const aiFeedback = {
      globalScore: 90,
      recommendation: 'hire',
      globalFeedback: 'Excellent performance',
      strengths: ['architecture', 'logic'],
      weaknesses: ['testing'],
      domainAnalysis: {},
      interviewRecommendations: 'Hire immediately',
    };

    entity.answersJson = JSON.stringify(answers);
    entity.detailJson = JSON.stringify(detail);
    entity.aiFeedbackJson = JSON.stringify(aiFeedback);

    expect(JSON.parse(entity.answersJson)).toHaveLength(2);
    expect(JSON.parse(entity.detailJson!)[0].questionId).toBe(1);
    expect(JSON.parse(entity.aiFeedbackJson!).globalScore).toBe(90);
  });

  it('should initialize nullable fields as null', () => {
    const entity = new CandidateQuizResult();

    entity.detailJson = null;
    entity.aiFeedbackJson = null;
    entity.durationSeconds = null;

    expect(entity.detailJson).toBeNull();
    expect(entity.aiFeedbackJson).toBeNull();
    expect(entity.durationSeconds).toBeNull();
  });

  it('should respect QuizResultStatus enum values', () => {
    expect(QuizResultStatus.PENDING).toBe('pending');
    expect(QuizResultStatus.COMPLETED).toBe('completed');
  });

  it('should validate score logic consistency', () => {
    const entity = new CandidateQuizResult();

    entity.totalQuestions = 10;
    entity.correctAnswers = 8;
    entity.scorePercent = Math.round((8 / 10) * 100);

    expect(entity.scorePercent).toBe(80);
  });

  it('should handle invitation relation', () => {
    const entity = new CandidateQuizResult();

    entity.invitation = {
      id: 50,
      candidateEmail: 'test@mail.com',
    } as Invitation;

    expect(entity.invitation.id).toBe(50);
    expect(entity.invitation.candidateEmail).toBe('test@mail.com');
  });

  it('should store submittedAt as Date', () => {
    const entity = new CandidateQuizResult();

    entity.submittedAt = new Date('2025-01-15T14:30:00.000Z');

    expect(entity.submittedAt instanceof Date).toBe(true);
    expect(entity.submittedAt.toISOString()).toBe('2025-01-15T14:30:00.000Z');
  });
});