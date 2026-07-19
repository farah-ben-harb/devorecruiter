import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ObjectLiteral, Repository } from 'typeorm';
import { CandidateQuizService } from './candidate-quiz.service';
import { CandidateQuizResult, QuizResultStatus } from '../../entities/candidate-quiz-results/candidate-quiz-result.entity';
import { Invitation, InvitationStatus } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import { TechnicalEvaluation, EvaluationStatus } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { SubmitQuizDto, QuizAnswerDto } from '../../dtos/candidate-quiz/candidate-quiz.dto';
import { QuizAnswerKey, QuizQuestionPublic } from '../../templates/quiz-evaluation.template';

// ─── Mock repo type ───────────────────────────────────────────────────────────

type RepoMock<T extends ObjectLiteral> = jest.Mocked<Pick<Repository<T>, 'findOne' | 'find' | 'save' | 'create'>>;

// ─── Factories ────────────────────────────────────────────────────────────────

function makeEvaluation(overrides: Partial<TechnicalEvaluation> = {}): TechnicalEvaluation {
  return {
    id: 10,
    jobPostId: 1,
    title: 'NestJS Quiz',
    status: EvaluationStatus.PENDING,
    driveFileId: null,
    driveFileUrl: null,
    version: '1.0',
    htmlContent: null,
    gitRepoUrl: null,
    pdfUrl: null,
    index: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    jobPost: null as never,
    quizContent: JSON.stringify([
      {
        id: 1,
        question: 'What is NestJS?',
        type: 'single_choice',
        options: ['A framework', 'A library', 'A database', 'A language'],
        domain: 'NestJS',
        difficulty: 'easy',
      } satisfies QuizQuestionPublic,
    ]),
    quizAnswerKey: JSON.stringify([
      {
        id: 1,
        question: 'What is NestJS?',
        correct_answer: 'A framework',
        explanation: 'NestJS is a Node.js framework.',
        domain: 'NestJS',
        difficulty: 'easy',
      } satisfies QuizAnswerKey,
    ]),
    ...overrides,
  };
}

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  const evaluation = makeEvaluation();
  return {
    id: 1,
    candidateId: 'candidate-uuid',
    candidateName: 'Doe',
    candidateFirstName: 'John',
    candidateEmail: 'john.doe@example.com',
    jobPostId: 1,
    evaluationId: evaluation.id,
    dueDate: '2099-12-31',
    status: InvitationStatus.SENT,
    sentAt: new Date('2024-01-01'),
    candidateResumeFileId: null,
    gitRepoUrl: null,
    evaluation,
    quizToken: 'valid-token',
    ...overrides,
  };
}

function makeQuizResult(overrides: Partial<CandidateQuizResult> = {}): CandidateQuizResult {
  return {
    id: 1,
    invitationId: 1,
    candidateId: 'candidate-uuid',
    evaluationId: 10,
    answersJson: '[]',
    totalQuestions: 1,
    correctAnswers: 1,
    scorePercent: 100,
    detailJson: null,
    aiFeedbackJson: null,
    durationSeconds: null,
    status: QuizResultStatus.COMPLETED,
    invitation: null as never,
    submittedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeSubmitDto(overrides: Partial<SubmitQuizDto> = {}): SubmitQuizDto {
  const answer = new QuizAnswerDto();
  answer.questionId = 1;
  answer.answer = 'A framework';

  const dto = new SubmitQuizDto();
  dto.answers = [answer];
  dto.durationSeconds = undefined;
  return { ...dto, ...overrides };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CandidateQuizService', () => {
  let service: CandidateQuizService;
  let resultRepo: RepoMock<CandidateQuizResult>;
  let invitationRepo: RepoMock<Invitation>;
  let evaluationRepo: RepoMock<TechnicalEvaluation>;

  beforeEach(async () => {
    resultRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    invitationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    evaluationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateQuizService,
        { provide: getRepositoryToken(CandidateQuizResult), useValue: resultRepo },
        { provide: getRepositoryToken(Invitation), useValue: invitationRepo },
        { provide: getRepositoryToken(TechnicalEvaluation), useValue: evaluationRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<CandidateQuizService>(CandidateQuizService);
  });

  // ── getQuizByToken ────────────────────────────────────────────────────────

  describe('getQuizByToken', () => {
    it('should return the quiz public view for a valid token', async () => {
      const invitation = makeInvitation();
      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);

      const result = await service.getQuizByToken('valid-token');

      expect(invitationRepo.findOne).toHaveBeenCalledWith({
        where: { quizToken: 'valid-token' },
        relations: ['evaluation'],
      });
      expect(result.invitationId).toBe(invitation.id);
      expect(result.evaluationId).toBe(invitation.evaluation.id);
      expect(result.candidateFirstName).toBe('John');
      expect(result.candidateName).toBe('Doe');
      expect(result.title).toBe('NestJS Quiz');
      expect(result.dueDate).toBe('2099-12-31');
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).not.toHaveProperty('correct_answer');
    });

    it('should throw NotFoundException when token is invalid', async () => {
      invitationRepo.findOne.mockResolvedValue(null);

      await expect(service.getQuizByToken('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when due date is passed', async () => {
      const invitation = makeInvitation({ dueDate: '2000-01-01' });
      invitationRepo.findOne.mockResolvedValue(invitation);

      await expect(service.getQuizByToken('valid-token')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quiz was already submitted', async () => {
      const invitation = makeInvitation();
      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(makeQuizResult());

      await expect(service.getQuizByToken('valid-token')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when evaluation has no quizContent', async () => {
      const invitation = makeInvitation({
        evaluation: makeEvaluation({ quizContent: null }),
      });
      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);

      await expect(service.getQuizByToken('valid-token')).rejects.toThrow(NotFoundException);
    });
  });

  // ── submitQuiz ────────────────────────────────────────────────────────────

  describe('submitQuiz', () => {
    it('should score the quiz and persist the result', async () => {
      const invitation = makeInvitation();
      const dto = makeSubmitDto();
      const created = makeQuizResult({ scorePercent: 100, correctAnswers: 1, totalQuestions: 1 });

      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue(created);
      resultRepo.save.mockResolvedValue(created);

      const result = await service.submitQuiz('valid-token', dto);

      expect(result.scorePercent).toBe(100);
      expect(result.correctAnswers).toBe(1);
      expect(result.totalQuestions).toBe(1);
      expect(result.detail).toHaveLength(1);
      expect(result.detail[0].isCorrect).toBe(true);
      expect(result.detail[0].correctAnswer).toBe('A framework');
    });

    it('should mark an answer as incorrect when the answer does not match', async () => {
      const invitation = makeInvitation();
      const dto = makeSubmitDto();
      dto.answers[0].answer = 'A library';

      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue(makeQuizResult({ scorePercent: 0, correctAnswers: 0 }));
      resultRepo.save.mockResolvedValue(makeQuizResult());

      const result = await service.submitQuiz('valid-token', dto);

      expect(result.detail[0].isCorrect).toBe(false);
      expect(result.scorePercent).toBe(0);
    });

    it('should use "(sans réponse)" when a question has no submitted answer', async () => {
      const invitation = makeInvitation();
      const dto = makeSubmitDto({ answers: [] });

      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue(makeQuizResult());
      resultRepo.save.mockResolvedValue(makeQuizResult());

      const result = await service.submitQuiz('valid-token', dto);

      expect(result.detail[0].yourAnswer).toBe('(sans réponse)');
      expect(result.detail[0].isCorrect).toBe(false);
    });

    it('should persist durationSeconds when provided', async () => {
      const invitation = makeInvitation();
      const dto = makeSubmitDto({ durationSeconds: 600 });
      const created = makeQuizResult({ durationSeconds: 600 });

      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue(created);
      resultRepo.save.mockResolvedValue(created);

      await service.submitQuiz('valid-token', dto);

      expect(resultRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ durationSeconds: 600 }),
      );
    });

    it('should persist null durationSeconds when not provided', async () => {
      const invitation = makeInvitation();
      const dto = makeSubmitDto({ durationSeconds: undefined });

      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue(makeQuizResult());
      resultRepo.save.mockResolvedValue(makeQuizResult());

      await service.submitQuiz('valid-token', dto);

      expect(resultRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ durationSeconds: null }),
      );
    });

    it('should throw NotFoundException when token is invalid', async () => {
      invitationRepo.findOne.mockResolvedValue(null);

      await expect(service.submitQuiz('bad-token', makeSubmitDto())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when due date is passed', async () => {
      const invitation = makeInvitation({ dueDate: '2000-01-01' });
      invitationRepo.findOne.mockResolvedValue(invitation);

      await expect(service.submitQuiz('valid-token', makeSubmitDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when quiz was already submitted', async () => {
      const invitation = makeInvitation();
      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(makeQuizResult());

      await expect(service.submitQuiz('valid-token', makeSubmitDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when evaluation has no quizAnswerKey', async () => {
      const invitation = makeInvitation({
        evaluation: makeEvaluation({ quizAnswerKey: null }),
      });
      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);

      await expect(service.submitQuiz('valid-token', makeSubmitDto())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should correctly calculate scorePercent with multiple questions', async () => {
      const answerKey: QuizAnswerKey[] = [
        { id: 1, question: 'Q1', correct_answer: 'A', explanation: '', domain: 'X', difficulty: 'easy' },
        { id: 2, question: 'Q2', correct_answer: 'B', explanation: '', domain: 'X', difficulty: 'easy' },
        { id: 3, question: 'Q3', correct_answer: 'C', explanation: '', domain: 'X', difficulty: 'easy' },
        { id: 4, question: 'Q4', correct_answer: 'D', explanation: '', domain: 'X', difficulty: 'easy' },
      ];
      const invitation = makeInvitation({
        evaluation: makeEvaluation({ quizAnswerKey: JSON.stringify(answerKey) }),
      });

      const a1 = new QuizAnswerDto(); a1.questionId = 1; a1.answer = 'A';
      const a2 = new QuizAnswerDto(); a2.questionId = 2; a2.answer = 'WRONG';
      const a3 = new QuizAnswerDto(); a3.questionId = 3; a3.answer = 'C';
      const a4 = new QuizAnswerDto(); a4.questionId = 4; a4.answer = 'WRONG';
      const dto = makeSubmitDto({ answers: [a1, a2, a3, a4] });

      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue(makeQuizResult());
      resultRepo.save.mockResolvedValue(makeQuizResult());

      const result = await service.submitQuiz('valid-token', dto);

      expect(result.correctAnswers).toBe(2);
      expect(result.totalQuestions).toBe(4);
      expect(result.scorePercent).toBe(50);
    });

    it('should save answersJson and detailJson as stringified JSON', async () => {
      const invitation = makeInvitation();
      const dto = makeSubmitDto();

      invitationRepo.findOne.mockResolvedValue(invitation);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue(makeQuizResult());
      resultRepo.save.mockResolvedValue(makeQuizResult());

      await service.submitQuiz('valid-token', dto);

      const createCall = resultRepo.create.mock.calls[0][0] as {
        answersJson: string;
        detailJson: string;
      };
      expect(() => JSON.parse(createCall.answersJson)).not.toThrow();
      expect(() => JSON.parse(createCall.detailJson)).not.toThrow();
    });
  });

  // ── getResultsByEvaluation ────────────────────────────────────────────────

  describe('getResultsByEvaluation', () => {
    it('should return all results for a given evaluation ordered by submittedAt DESC', async () => {
      const results = [makeQuizResult({ id: 2 }), makeQuizResult({ id: 1 })];
      resultRepo.find.mockResolvedValue(results);

      const outcome = await service.getResultsByEvaluation(10);

      expect(resultRepo.find).toHaveBeenCalledWith({
        where: { evaluationId: 10 },
        order: { submittedAt: 'DESC' },
      });
      expect(outcome).toEqual(results);
    });

    it('should return an empty array when no results exist', async () => {
      resultRepo.find.mockResolvedValue([]);

      const outcome = await service.getResultsByEvaluation(999);

      expect(outcome).toEqual([]);
    });
  });

  // ── getResultByInvitation ─────────────────────────────────────────────────

  describe('getResultByInvitation', () => {
    it('should return the result for a given invitation', async () => {
      const result = makeQuizResult({ invitationId: 5 });
      resultRepo.findOne.mockResolvedValue(result);

      const outcome = await service.getResultByInvitation(5);

      expect(resultRepo.findOne).toHaveBeenCalledWith({ where: { invitationId: 5 } });
      expect(outcome).toEqual(result);
    });

    it('should return null when no result exists for the invitation', async () => {
      resultRepo.findOne.mockResolvedValue(null);

      const outcome = await service.getResultByInvitation(999);

      expect(outcome).toBeNull();
    });
  });
});