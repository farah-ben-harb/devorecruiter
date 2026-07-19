import { Test, TestingModule } from '@nestjs/testing';
import { CandidateQuizController } from './candidate-quiz.controller';
import { CandidateQuizService } from '../../services/candidate-quiz/candidate-quiz.service';
import { SubmitQuizDto } from '../../dtos/candidate-quiz/candidate-quiz.dto';

describe('CandidateQuizController', () => {
  let controller: CandidateQuizController;
  let service: CandidateQuizService;

  const mockQuizService = {
    getQuizByToken: jest.fn(),
    submitQuiz: jest.fn(),
    getResultsByEvaluation: jest.fn(),
    getResultByInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateQuizController],
      providers: [
        {
          provide: CandidateQuizService,
          useValue: mockQuizService,
        },
      ],
    }).compile();

    controller = module.get<CandidateQuizController>(CandidateQuizController);
    service = module.get<CandidateQuizService>(CandidateQuizService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────── GET QUIZ (public) ─────────────────────────
  it('should return quiz by token', async () => {
    const token = 'test-token';

    const expected = {
      title: 'Quiz NestJS',
      questions: [],
    };

    mockQuizService.getQuizByToken.mockResolvedValue(expected);

    const result = await controller.getQuiz(token);

    expect(service.getQuizByToken).toHaveBeenCalledWith(token);
    expect(result).toEqual(expected);
  });

  // ─────────────────────── SUBMIT QUIZ (public) ───────────────────────
  it('should submit quiz answers', async () => {
    const token = 'test-token';

    const dto: SubmitQuizDto = {
      answers: [
        { questionId: 1, answer: 'A' },
        { questionId: 2, answer: 'B' },
      ],
    };

    const expected = {
      scorePercent: 80,
      correctAnswers: 8,
      totalQuestions: 10,
    };

    mockQuizService.submitQuiz.mockResolvedValue(expected);

    const result = await controller.submitQuiz(token, dto);

    expect(service.submitQuiz).toHaveBeenCalledWith(token, dto);
    expect(result).toEqual(expected);
  });

  // ─────────────────── RESULTS BY EVALUATION (RH) ────────────────────
  it('should get results by evaluation id', async () => {
    const evaluationId = 5;

    const expected = [
      { id: 1, score: 80 },
      { id: 2, score: 65 },
    ];

    mockQuizService.getResultsByEvaluation.mockResolvedValue(expected);

    const result = await controller.getResultsByEvaluation(evaluationId);

    expect(service.getResultsByEvaluation).toHaveBeenCalledWith(evaluationId);
    expect(result).toEqual(expected);
  });

  // ─────────────────── RESULT BY INVITATION (RH) ────────────────────
  it('should get result by invitation id', async () => {
    const invitationId = 10;

    const expected = {
      scorePercent: 75,
      invitationId: 10,
    };

    mockQuizService.getResultByInvitation.mockResolvedValue(expected);

    const result = await controller.getResultByInvitation(invitationId);

    expect(service.getResultByInvitation).toHaveBeenCalledWith(invitationId);
    expect(result).toEqual(expected);
  });
});