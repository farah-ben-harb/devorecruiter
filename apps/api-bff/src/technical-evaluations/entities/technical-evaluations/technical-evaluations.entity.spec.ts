import { TechnicalEvaluation, EvaluationStatus } from "./technical-evaluations.entity";

describe('TechnicalEvaluation Entity', () => {
  it('should create a valid entity instance', () => {
    const entity = new TechnicalEvaluation();

    entity.id = 1;
    entity.jobPostId = 10;
    entity.title = 'Backend NestJS Evaluation';
    entity.status = EvaluationStatus.PENDING;
    entity.driveFileId = 'drive-123';
    entity.driveFileUrl = 'https://drive.google.com/file/d/123';
    entity.version = '1.0';
    entity.htmlContent = '<h1>Test</h1>';
    entity.gitRepoUrl = 'https://github.com/org/repo';
    entity.pdfUrl = 'https://drive.google.com/file/d/pdf';
    entity.index = 1;
    entity.quizContent = null;
    entity.quizAnswerKey = null;

    expect(entity).toBeDefined();
    expect(entity.id).toBe(1);
    expect(entity.jobPostId).toBe(10);
    expect(entity.title).toBe('Backend NestJS Evaluation');
    expect(entity.status).toBe(EvaluationStatus.PENDING);
    expect(entity.version).toBe('1.0');
  });

  it('should initialize with null optional fields correctly', () => {
    const entity = new TechnicalEvaluation();

    entity.driveFileId = null;
    entity.driveFileUrl = null;
    entity.htmlContent = null;
    entity.gitRepoUrl = null;
    entity.pdfUrl = null;
    entity.index = null;
    entity.quizContent = null;
    entity.quizAnswerKey = null;

    expect(entity.driveFileId).toBeNull();
    expect(entity.driveFileUrl).toBeNull();
    expect(entity.htmlContent).toBeNull();
    expect(entity.gitRepoUrl).toBeNull();
    expect(entity.pdfUrl).toBeNull();
    expect(entity.index).toBeNull();
    expect(entity.quizContent).toBeNull();
    expect(entity.quizAnswerKey).toBeNull();
  });

  it('should respect EvaluationStatus enum values', () => {
    expect(EvaluationStatus.PENDING).toBe('pending');
    expect(EvaluationStatus.IN_PROGRESS).toBe('in_progress');
    expect(EvaluationStatus.COMPLETED).toBe('completed');
    expect(EvaluationStatus.APPROVED).toBe('approved');
    expect(EvaluationStatus.REJECTED).toBe('rejected');
  });

  it('should handle quiz content and answer key JSON strings', () => {
    const entity = new TechnicalEvaluation();

    const quizContent = JSON.stringify([
      {
        id: 1,
        question: 'What is NestJS?',
        options: ['A', 'B', 'C', 'D'],
        difficulty: 'easy',
      },
    ]);

    const quizAnswerKey = JSON.stringify([
      {
        id: 1,
        correctAnswer: 'A',
        explanation: 'NestJS is a Node.js framework',
      },
    ]);

    entity.quizContent = quizContent;
    entity.quizAnswerKey = quizAnswerKey;

    expect(typeof entity.quizContent).toBe('string');
    expect(typeof entity.quizAnswerKey).toBe('string');

    expect(JSON.parse(entity.quizContent!)[0].question).toBe('What is NestJS?');
    expect(JSON.parse(entity.quizAnswerKey!)[0].correctAnswer).toBe('A');
  });

  it('should handle jobPost relation assignment', () => {
    const entity = new TechnicalEvaluation();

    entity.jobPost = {
      id: 99,
      title: 'Senior Backend Dev',
    } as any;

    expect(entity.jobPost.id).toBe(99);
    expect(entity.jobPost.title).toBe('Senior Backend Dev');
  });

  it('should allow status transitions', () => {
    const entity = new TechnicalEvaluation();

    entity.status = EvaluationStatus.PENDING;
    expect(entity.status).toBe(EvaluationStatus.PENDING);

    entity.status = EvaluationStatus.IN_PROGRESS;
    expect(entity.status).toBe(EvaluationStatus.IN_PROGRESS);

    entity.status = EvaluationStatus.COMPLETED;
    expect(entity.status).toBe(EvaluationStatus.COMPLETED);

    entity.status = EvaluationStatus.APPROVED;
    expect(entity.status).toBe(EvaluationStatus.APPROVED);
  });
});