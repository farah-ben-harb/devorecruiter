// src/resume-evaluations/controllers/resume-evaluation.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ResumeEvaluationService } from '../services/resume-evaluations.service';
import { ResumeEvaluation } from '../entities/resume-evaluation.entity';
import type { AuthRequest, GoogleAuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { ResumeEvaluationController } from './resume-evaluations.controller';

// ── Helpers de fabrication ──────────────────────────────────

function makeResumeEvaluation(overrides: Partial<ResumeEvaluation> = {}): ResumeEvaluation {
  return {
    id: 1,
    resumeFileId: 'resume-1',
    resumeName: 'cv.pdf',
    jobPostId: 10,
    jobPostGoogleDriveFileId: 'job-drive-1',
    scoreGlobal: 75,
    criteria: {
      technicalSkills: { score: 80, detail: 'Bon niveau' },
      experience: { score: 70, detail: '3 ans' },
      education: { score: 75, detail: 'Licence' },
      softSkills: { score: 80, detail: 'Bonne comm' },
      languages: { score: 70, detail: 'Anglais B2' },
    },
    strengths: [],
    weaknesses: [],
    resume: 'Bon profil',
    recommendation: 'ACCEPTED',
    status: 'ACCEPTED',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    highlightedFileId: undefined,
    isOutdated: false,
    jobPost: null,
    ...overrides,
  };
}

function makeAuthenticatedUser(overrides: Partial<GoogleAuthenticatedUser> = {}): GoogleAuthenticatedUser {
  return {
    id: 1,
    googleAccessToken: 'google-token-123',
    ...overrides,
  } as GoogleAuthenticatedUser;
}

function makeAuthRequest(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    user: makeAuthenticatedUser(),
    ...overrides,
  } as AuthRequest;
}

// ── Type du mock du service (pas de any/unknown) ────────────

type MockedResumeEvaluationService = jest.Mocked<
  Pick<
    ResumeEvaluationService,
    'triggerAllAndSave' | 'getByJobPost' | 'getById' | 'delete' | 'rescoreOne'
  >
>;

describe('ResumeEvaluationController', () => {
  let controller: ResumeEvaluationController;
  let service: MockedResumeEvaluationService;

  beforeEach(async () => {
    const mockService: MockedResumeEvaluationService = {
      triggerAllAndSave: jest.fn(),
      getByJobPost: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
      rescoreOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeEvaluationController],
      providers: [{ provide: ResumeEvaluationService, useValue: mockService }],
    }).compile();

    controller = module.get<ResumeEvaluationController>(ResumeEvaluationController);
    service = mockService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── triggerAll ────────────────────────────────────────────

  describe('triggerAll', () => {
    it('appelle triggerAllAndSave avec le token Google du user authentifié', async () => {
      const req = makeAuthRequest({
        user: makeAuthenticatedUser({ googleAccessToken: 'token-abc' }),
      });
      const dto = { jobPostGoogleDriveFileId: 'job-drive-1', jobPostId: 10 };
      const evaluations = [makeResumeEvaluation()];
      service.triggerAllAndSave.mockResolvedValue(evaluations);

      const result = await controller.triggerAll(dto, req);

      expect(service.triggerAllAndSave).toHaveBeenCalledWith(
        'job-drive-1',
        10,
        'token-abc',
      );
      expect(result).toBe(evaluations);
    });

    it('lève une BadRequestException si le token Google est manquant', () => {
  const req = makeAuthRequest({ user: undefined });
  const dto = { jobPostGoogleDriveFileId: 'job-drive-1', jobPostId: 10 };

  expect(() => controller.triggerAll(dto, req)).toThrow(BadRequestException);
  expect(service.triggerAllAndSave).not.toHaveBeenCalled();
});
  });

  // ── getByJobPost ──────────────────────────────────────────

  describe('getByJobPost', () => {
    it('délègue au service avec l\'id parsé', async () => {
      const evaluations = [makeResumeEvaluation({ jobPostId: 10 })];
      service.getByJobPost.mockResolvedValue(evaluations);

      const result = await controller.getByJobPost(10);

      expect(service.getByJobPost).toHaveBeenCalledWith(10);
      expect(result).toBe(evaluations);
    });
  });

  // ── getById ───────────────────────────────────────────────

  describe('getById', () => {
    it('délègue au service avec l\'id parsé', async () => {
      const evaluation = makeResumeEvaluation({ id: 3 });
      service.getById.mockResolvedValue(evaluation);

      const result = await controller.getById(3);

      expect(service.getById).toHaveBeenCalledWith(3);
      expect(result).toBe(evaluation);
    });
  });

  // ── delete ────────────────────────────────────────────────

  describe('delete', () => {
    it('délègue au service avec l\'id parsé', async () => {
      service.delete.mockResolvedValue(undefined);

      await controller.delete(3);

      expect(service.delete).toHaveBeenCalledWith(3);
    });
  });

  // ── rescoreOne ────────────────────────────────────────────

  describe('rescoreOne', () => {
    it('appelle rescoreOne avec le token Google du user authentifié', async () => {
      const req = makeAuthRequest({
        user: makeAuthenticatedUser({ googleAccessToken: 'token-xyz' }),
      });
      const rescored = makeResumeEvaluation({ id: 5, scoreGlobal: 90 });
      service.rescoreOne.mockResolvedValue(rescored);

      const result = await controller.rescoreOne(5, req);

      expect(service.rescoreOne).toHaveBeenCalledWith(5, 'token-xyz');
      expect(result).toBe(rescored);
    });

    it('lève une BadRequestException si le token Google est manquant', () => {
  const req = makeAuthRequest({ user: undefined });

  expect(() => controller.rescoreOne(5, req)).toThrow(BadRequestException);
  expect(service.rescoreOne).not.toHaveBeenCalled();
});
  });
});