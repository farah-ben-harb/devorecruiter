import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CandidateCodeEvaluationService } from './candidate-code-evaluation.service';
import { CandidateCodeEvaluation } from '../../entities/candidate-code-evaluations/candidate-code-evaluations.entity';
import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { GithubService } from '../github/github.service';

// ── Types pour les mocks ──────────────────────────────────────────────────────
interface MockRepo<T> {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
}

interface MockGithub {
  listBranches: jest.Mock;
  getRepoTree: jest.Mock;
  getFileContent: jest.Mock;
}

interface MockConfig {
  get: jest.Mock;
  getOrThrow: jest.Mock;
}

// ── Helper pour créer un repo mock ─────────────────────────────────────────────
function createMockRepo<T>(): MockRepo<T> {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    save: jest.fn(),
  };
}

describe('CandidateCodeEvaluationService', () => {
  let service: CandidateCodeEvaluationService;
  let codeRepo: MockRepo<CandidateCodeEvaluation>;
  let invitationRepo: MockRepo<Invitation>;
  let evaluationRepo: MockRepo<TechnicalEvaluation>;
  let mockGithub: MockGithub;
  let mockConfig: MockConfig;

  beforeEach(async () => {
    codeRepo = createMockRepo<CandidateCodeEvaluation>();
    invitationRepo = createMockRepo<Invitation>();
    evaluationRepo = createMockRepo<TechnicalEvaluation>();

    mockGithub = {
      listBranches: jest.fn().mockResolvedValue([]),
      getRepoTree: jest.fn().mockResolvedValue([]),
      getFileContent: jest.fn().mockResolvedValue(''),
    };

    mockConfig = {
      get: jest.fn().mockReturnValue('fake-api-key'),
      getOrThrow: jest.fn().mockReturnValue('fake-api-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateCodeEvaluationService,
        { provide: GithubService, useValue: mockGithub },
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getRepositoryToken(CandidateCodeEvaluation),
          useValue: codeRepo,
        },
        {
          provide: getRepositoryToken(Invitation),
          useValue: invitationRepo,
        },
        {
          provide: getRepositoryToken(TechnicalEvaluation),
          useValue: evaluationRepo,
        },
      ],
    }).compile();

    service = module.get<CandidateCodeEvaluationService>(
      CandidateCodeEvaluationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Test 1 : invitation introuvable → NotFoundException ───────────────────
  it('should reject when repo empty', async () => {
    invitationRepo.findOne.mockResolvedValue(null);

    await expect(service.evaluateCandidateWork(1)).rejects.toThrow(
      'Invitation introuvable',
    );
  });

  // ── Test 2 : évaluation introuvable → NotFoundException ──────────────────
  it('should throw when evaluation not found', async () => {
    invitationRepo.findOne.mockResolvedValue({
      id: 1,
      evaluationId: 10,
      candidateId: 'c1',
      gitRepoUrl: 'https://github.com/org/repo',
    });

    evaluationRepo.findOne.mockResolvedValue(null);

    await expect(service.evaluateCandidateWork(1)).rejects.toThrow(
      'Évaluation introuvable',
    );
  });

  // ── Test 3 : repo Git absent → NotFoundException ──────────────────────────
  it('should throw when git repo url is missing', async () => {
    invitationRepo.findOne.mockResolvedValue({
      id: 1,
      evaluationId: 10,
      candidateId: 'c1',
      gitRepoUrl: null,
    });

    evaluationRepo.findOne.mockResolvedValue({
      id: 10,
      title: 'Test Eval',
      htmlContent: '<p>Sujet</p>',
    });

    await expect(service.evaluateCandidateWork(1)).rejects.toThrow(
      'Repo Git introuvable pour cette invitation',
    );
  });

  // ── Test 4 : repo vide → évaluation sauvegardée avec score 0 ─────────────
  it('should save evaluation with score 0 when repo is empty', async () => {
    invitationRepo.findOne.mockResolvedValue({
      id: 1,
      evaluationId: 10,
      candidateId: 'c1',
      candidateName: 'Doe',
      candidateFirstName: 'John',
      gitRepoUrl: 'https://github.com/org/my-repo',
    });

    evaluationRepo.findOne.mockResolvedValue({
      id: 10,
      title: 'Test Eval',
      htmlContent: '<p>Sujet</p>',
    });

    mockGithub.listBranches.mockResolvedValue(['main']);
    mockGithub.getRepoTree.mockResolvedValue([]);

    codeRepo.create.mockImplementation((x: CandidateCodeEvaluation) => x);
    codeRepo.save.mockResolvedValue({ id: 99, globalScore: 0 });

    const result = await service.evaluateCandidateWork(1);

    expect(result).toBeDefined();
    expect(codeRepo.save).toHaveBeenCalled();

    const savedArg = codeRepo.save.mock.calls[0][0] as CandidateCodeEvaluation;
    expect(savedArg.globalScore).toBe(0);
    expect(savedArg.recommendation).toBe('reject');
    expect(savedArg.rawAiResponse).toBe('NO_CODE_FOUND');
  });
});