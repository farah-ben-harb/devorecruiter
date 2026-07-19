import { Test, TestingModule } from '@nestjs/testing';
import { QuizTechnicalEvaluationService } from './quiz-technical-evaluations.service';
import { GoogleDriveService } from '../../../common/google-drive/google-drive.service';
import { PdfGeneratorService } from '../pdfs-generator/pdf-generator.service';
import { TECHNICAL_EVALUATION_REPOSITORY } from '../../interfaces/technical-evaluations/technical-evaluations.interface';
import { JobPost } from '../../../job-posts/entities/job-post.entity';
import { CreateTechnicalEvaluationDto } from '../../dtos/technical-evaluations/technical-evaluations.dto';
import { QuizData } from '../../templates/quiz-evaluation.template';

// ── Mock fetch global ─────────────────────────────────────────────────────────
const buildFetchMock = () =>
  jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: 'Quiz JavaScript',
              description: 'Évaluation des connaissances JS',
              duration_minutes: 30,
              questions: [
                {
                  id: 1,
                  question: 'Quel mot-clé déclare une variable en JS ?',
                  options: ['var', 'let', 'const', 'Toutes les réponses'],
                  correct_answer: 'D',
                  explanation: 'var, let et const déclarent tous des variables.',
                  domain: 'JavaScript',
                  difficulty: 'easy',
                  type: 'qcm',
                },
                {
                  id: 2,
                  question: "Qu'est-ce qu'une closure ?",
                  options: [
                    'Une fonction sans retour',
                    'Une fonction avec accès à son scope parent',
                    'Un objet immuable',
                    'Un type primitif',
                  ],
                  correct_answer: 'B',
                  explanation: 'Une closure capture les variables du scope englobant.',
                  domain: 'JavaScript',
                  difficulty: 'medium',
                  type: 'qcm',
                },
              ],
            } as QuizData),
          },
        },
      ],
    }),
  });

// ── Types pour les mocks ──────────────────────────────────────────────────────
interface MockRepo {
  create: jest.Mock;
  findAll: jest.Mock;
}

interface MockGoogleDrive {
  uploadFile: jest.Mock;
}

interface MockPdfGenerator {
  generateFromRawHtml: jest.Mock;
}

describe('QuizTechnicalEvaluationService', () => {
  let service: QuizTechnicalEvaluationService;
  let repoMock: MockRepo;
  let googleDriveMock: MockGoogleDrive;
  let pdfMock: MockPdfGenerator;

  beforeEach(async () => {
    repoMock = {
      create: jest.fn().mockImplementation((x: Record<string, unknown>) => ({ id: 1, ...x })),
      findAll: jest.fn().mockResolvedValue([]),
    };

    googleDriveMock = {
      uploadFile: jest.fn().mockResolvedValue({
        id: 'drive123',
        webViewLink: 'https://drive.google.com/file/d/drive123/view',
      }),
    };

    pdfMock = {
      generateFromRawHtml: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
    };

    global.fetch = buildFetchMock() as typeof global.fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizTechnicalEvaluationService,
        { provide: TECHNICAL_EVALUATION_REPOSITORY, useValue: repoMock },
        { provide: GoogleDriveService, useValue: googleDriveMock },
        { provide: PdfGeneratorService, useValue: pdfMock },
      ],
    }).compile();

    service = module.get<QuizTechnicalEvaluationService>(
      QuizTechnicalEvaluationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should generate quiz', async () => {
    const jobPost: JobPost = {
      id: 1,
      name: 'Développeur JS',
      evaluationsFolderId: 'folder-123',
    } as JobPost;

    const dto: CreateTechnicalEvaluationDto = {
      jobPostId: 1,
    } as CreateTechnicalEvaluationDto;

    const result = await service.generateQuiz(
      1,
      jobPost,
      dto,
      '<h1>Fiche de poste JS</h1>',
      '1.0.0',
      'fake-openrouter-key',
    );

    expect(result).toBeDefined();
    expect(pdfMock.generateFromRawHtml).toHaveBeenCalledTimes(1);
    expect(googleDriveMock.uploadFile).toHaveBeenCalledTimes(1);
    expect(repoMock.create).toHaveBeenCalledTimes(1);
  });

  it('should split quiz data correctly', () => {
    const quizData: QuizData = {
      title: 'Quiz Test',
      description: 'desc',
      duration_minutes: 20,
      questions: [
        {
          id: 1,
          question: 'Quelle est la capitale de la France ?',
          options: ['Berlin', 'Paris', 'Rome', 'Madrid'],
          correct_answer: 'B',
          explanation: 'Paris est la capitale de la France.',
          domain: 'Culture générale',
          difficulty: 'easy',
          type: 'qcm',
        },
      ],
    };

    const result = service['splitQuizData'](quizData);

    expect(result.quizForCandidate).toHaveLength(1);
    expect(result.quizForCandidate[0]).not.toHaveProperty('correct_answer');
    expect(result.quizForCandidate[0]).not.toHaveProperty('explanation');
    expect(result.quizForCandidate[0].options).toHaveLength(4);

    expect(result.quizAnswerKey).toHaveLength(1);
    expect(result.quizAnswerKey[0].correct_answer).toBe('B');
    expect(result.quizAnswerKey[0].explanation).toBe(
      'Paris est la capitale de la France.',
    );
  });

  it('should compute next index from existing evaluations', async () => {
    repoMock.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const index = await service['nextIndex'](1);

    expect(index).toBe(3);
  });
});