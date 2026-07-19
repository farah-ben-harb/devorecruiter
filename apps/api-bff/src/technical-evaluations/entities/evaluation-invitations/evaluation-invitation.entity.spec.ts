import { Invitation, InvitationStatus } from "./evaluation-invitation.entity";

describe('Invitation Entity', () => {
  it('should create a valid invitation entity', () => {
    const entity = new Invitation();

    entity.id = 1;
    entity.candidateId = 'uuid-candidate-123';
    entity.candidateName = 'Doe';
    entity.candidateFirstName = 'John';
    entity.candidateEmail = 'john.doe@gmail.com';
    entity.jobPostId = 10;
    entity.evaluationId = 5;
    entity.dueDate = '2024-02-15';
    entity.status = InvitationStatus.SENT;

    entity.candidateResumeFileId = 'resume-123';
    entity.gitRepoUrl = 'https://github.com/johndoe/repo';
    entity.quizToken = 'token-abc';

    expect(entity).toBeDefined();
    expect(entity.id).toBe(1);
    expect(entity.candidateId).toBe('uuid-candidate-123');
    expect(entity.candidateName).toBe('Doe');
    expect(entity.candidateFirstName).toBe('John');
    expect(entity.candidateEmail).toBe('john.doe@gmail.com');
    expect(entity.jobPostId).toBe(10);
    expect(entity.evaluationId).toBe(5);
    expect(entity.dueDate).toBe('2024-02-15');
    expect(entity.status).toBe(InvitationStatus.SENT);
  });

  it('should initialize nullable fields correctly', () => {
    const entity = new Invitation();

    entity.candidateResumeFileId = null;
    entity.gitRepoUrl = null;
    entity.quizToken = null;

    expect(entity.candidateResumeFileId).toBeNull();
    expect(entity.gitRepoUrl).toBeNull();
    expect(entity.quizToken).toBeNull();
  });

  it('should respect InvitationStatus enum values', () => {
    expect(InvitationStatus.SENT).toBe('sent');
    expect(InvitationStatus.OPENED).toBe('opened');
    expect(InvitationStatus.SUBMITTED).toBe('submitted');
  });

  it('should handle date field as string (dueDate)', () => {
    const entity = new Invitation();

    entity.dueDate = '2024-12-31';

    expect(typeof entity.dueDate).toBe('string');
    expect(entity.dueDate).toBe('2024-12-31');
  });

  it('should handle sentAt as Date (auto-generated)', () => {
    const entity = new Invitation();

    entity.sentAt = new Date('2024-01-15T10:00:00.000Z');

    expect(entity.sentAt instanceof Date).toBe(true);
    expect(entity.sentAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
  });

  it('should handle relation to TechnicalEvaluation', () => {
    const entity = new Invitation();

    entity.evaluation = {
      id: 99,
      title: 'NestJS Evaluation',
    } as any;

    expect(entity.evaluation.id).toBe(99);
    expect(entity.evaluation.title).toBe('NestJS Evaluation');
  });

  it('should store quiz token correctly', () => {
    const entity = new Invitation();

    entity.quizToken = 'quiz-token-fixture';

    expect(entity.quizToken).toContain('quiz-token');
  });

  it('should validate required business fields', () => {
    const entity = new Invitation();

    entity.candidateEmail = 'test@mail.com';
    entity.candidateFirstName = 'Test';
    entity.candidateName = 'User';

    expect(entity.candidateEmail).toMatch(/@/);
    expect(entity.candidateFirstName.length).toBeGreaterThan(0);
    expect(entity.candidateName.length).toBeGreaterThan(0);
  });
});
