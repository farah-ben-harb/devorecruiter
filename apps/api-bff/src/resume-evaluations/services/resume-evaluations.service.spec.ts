// src/resume-evaluations/services/resume-evaluation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { ResumeEvaluationRepository } from '../repositories/resume-evaluations.repository';
import { ResumeEvaluation } from '../entities/resume-evaluation.entity';
import { JobPostCriteriaService } from '../../job-posts/services/job-post-criteria.service';
import { GlobalCriteriaService } from '../../job-posts/services/global-criterias.service';
import { GlobalCriteria } from '../../job-posts/entities/global-criterias.entity';
import {
  JobPostCriteria,
  CriteriaSection,
  CriteriaSource,
} from '../../job-posts/entities/job-post-criteria.entity';
import {
  N8nResumeMatch,
  N8nWebhookResponse,
} from '../interfaces/resume-evaluations.interface';
import { ResumeEvaluationService } from './resume-evaluations.service';

// ── Helpers de fabrication ────────────────────────────────────────────────

function makeResumeEvaluation(overrides: Partial<ResumeEvaluation> = {}): ResumeEvaluation {
  return {
    id: 1,
    resumeFileId: 'resume-1',
    resumeName: 'cv_john_doe.pdf',
    jobPostId: 10,
    jobPostGoogleDriveFileId: 'job-drive-1',
    scoreGlobal: 75,
    criteria: {
      technicalSkills: { score: 80, detail: 'Bon niveau NestJS' },
      experience: { score: 70, detail: '3 ans backend' },
      education: { score: 75, detail: 'Licence info' },
      softSkills: { score: 80, detail: 'Bonne communication' },
      languages: { score: 70, detail: 'Anglais B2' },
    },
    strengths: ['NestJS', 'TypeScript'],
    weaknesses: ['DevOps'],
    resume: 'Candidat solide',
    recommendation: 'ACCEPTED',
    status: 'ACCEPTED',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    highlightedFileId: undefined,
    isOutdated: false,
    jobPost: null,
    ...overrides,
  };
}

function makeJobPostCriteria(overrides: Partial<JobPostCriteria> = {}): JobPostCriteria {
  return {
    id: 1,
    jobPostId: 10,
    jobPost: {} as JobPostCriteria['jobPost'],
    intitulePoste: 'Développeur Backend',
    competencesTechniquesRequises: ['NestJS'],
    competencesGeneralesRequises: [],
    experienceMinimaleAnnees: 3,
    formationRequise: null,
    languesRequises: [],
    missionsPrincipales: [],
    certificationsRequises: [],
    sections: null,
    sectionLabels: null,
    source: CriteriaSource.N8N_UNIFICATION,
    rawJson: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeGlobalCriteria(overrides: Partial<GlobalCriteria> = {}): GlobalCriteria {
  return {
    id: 1,
    label: 'Maîtrise de TypeScript',
    description: null,
    category: 'technique',
    order: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeN8nMatch(overrides: Partial<N8nResumeMatch> = {}): N8nResumeMatch {
  return {
    fileId: 'resume-1',
    fileName: 'cv_john_doe.pdf',
    detail: {
      scoreGlobal: 85,
      technicalSkills: { score: 90, detail: 'Excellent' },
      experience: { score: 80, detail: '3 ans' },
      education: { score: 75, detail: 'Licence' },
      softSkills: { score: 85, detail: 'Bon relationnel' },
      languages: { score: 70, detail: 'Anglais B2' },
      strengths: ['NestJS'],
      weaknesses: ['DevOps'],
      resume: 'Bon profil',
      recommendation: 'ACCEPTED',
    },
    ...overrides,
  };
}

function makeAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

// ── Types des mocks des dépendances (pas de any/unknown) ──────────────────

type MockedResumeEvaluationRepository = jest.Mocked<
  Pick<
    ResumeEvaluationRepository,
    | 'create'
    | 'findByJobPost'
    | 'findById'
    | 'findByResumeAndJobPost'
    | 'deleteById'
    | 'update'
    | 'markOutdated'
    | 'rescoreOne'
  >
>;

type MockedHttpService = jest.Mocked<Pick<HttpService, 'post'>>;

type MockedConfigService = jest.Mocked<Pick<ConfigService, 'get'>>;

type MockedJobPostCriteriaService = jest.Mocked<Pick<JobPostCriteriaService, 'findByJobPostId'>>;

type MockedGlobalCriteriaService = jest.Mocked<Pick<GlobalCriteriaService, 'findAll'>>;

describe('ResumeEvaluationService', () => {
  let service: ResumeEvaluationService;
  let repository: MockedResumeEvaluationRepository;
  let httpService: MockedHttpService;
  let configService: MockedConfigService;
  let jobPostCriteriaService: MockedJobPostCriteriaService;
  let globalCriteriaService: MockedGlobalCriteriaService;

  beforeEach(async () => {
    const mockRepository: MockedResumeEvaluationRepository = {
      create: jest.fn(),
      findByJobPost: jest.fn(),
      findById: jest.fn(),
      findByResumeAndJobPost: jest.fn(),
      deleteById: jest.fn(),
      update: jest.fn(),
      markOutdated: jest.fn(),
      rescoreOne: jest.fn(),
    };

    const mockHttpService: MockedHttpService = {
      post: jest.fn(),
    };

    const mockConfigService: MockedConfigService = {
      get: jest.fn(),
    };

    const mockJobPostCriteriaService: MockedJobPostCriteriaService = {
      findByJobPostId: jest.fn(),
    };

    const mockGlobalCriteriaService: MockedGlobalCriteriaService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeEvaluationService,
        { provide: ResumeEvaluationRepository, useValue: mockRepository },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JobPostCriteriaService, useValue: mockJobPostCriteriaService },
        { provide: GlobalCriteriaService, useValue: mockGlobalCriteriaService },
      ],
    }).compile();

    service = module.get<ResumeEvaluationService>(ResumeEvaluationService);
    repository = mockRepository;
    httpService = mockHttpService;
    configService = mockConfigService;
    jobPostCriteriaService = mockJobPostCriteriaService;
    globalCriteriaService = mockGlobalCriteriaService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── triggerAllAndSave ───────────────────────────────────────────────────

  describe('triggerAllAndSave', () => {
    it('lève une BadGatewayException si le webhook n8n n\'est pas configuré', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.triggerAllAndSave('job-drive-1', 10, 'token'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('envoie le catalogue global quand les critères ne sont pas figés (legacy)', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        if (key === 'N8N_SCORING_CV_MIN_SCORE') return undefined;
        return undefined;
      });

      const criteria = makeJobPostCriteria({ sections: null });
      jobPostCriteriaService.findByJobPostId.mockResolvedValue(criteria);

      const globalCriteria = [makeGlobalCriteria({ id: 1 }), makeGlobalCriteria({ id: 2 })];
      globalCriteriaService.findAll.mockResolvedValue(globalCriteria);

      const match = makeN8nMatch();
      const webhookResponse: N8nWebhookResponse = { matches: [match] };
      httpService.post.mockReturnValue(of(makeAxiosResponse(webhookResponse)));

      repository.findByResumeAndJobPost.mockResolvedValue(null);
      repository.create.mockResolvedValue(makeResumeEvaluation());

      await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(globalCriteriaService.findAll).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://n8n.local/scoring',
        expect.objectContaining({
          jobPostGoogleDriveFileId: 'job-drive-1',
          minScore: 10,
          globalCriteria: [
            { id: 1, label: globalCriteria[0].label, category: globalCriteria[0].category },
            { id: 2, label: globalCriteria[1].label, category: globalCriteria[1].category },
          ],
        }),
      );
    });

    it('n\'envoie pas le catalogue global quand les critères sont déjà figés (sections fromGlobal)', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      const sections: CriteriaSection[] = [
        {
          key: 'global_technique',
          label: 'Technique',
          items: ['TypeScript'],
          fromGlobal: true,
        },
      ];
      const criteria = makeJobPostCriteria({ sections });
      jobPostCriteriaService.findByJobPostId.mockResolvedValue(criteria);

      const webhookResponse: N8nWebhookResponse = { matches: [] };
      httpService.post.mockReturnValue(of(makeAxiosResponse(webhookResponse)));

      await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(globalCriteriaService.findAll).not.toHaveBeenCalled();
      const [, payload] = httpService.post.mock.calls[0];
      expect(payload).not.toHaveProperty('globalCriteria');
    });

    it('continue avec des critères null si le job post n\'a pas de critères', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockRejectedValue(new NotFoundException());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const webhookResponse: N8nWebhookResponse = { matches: [] };
      httpService.post.mockReturnValue(of(makeAxiosResponse(webhookResponse)));

      await service.triggerAllAndSave('job-drive-1', 10, 'token');

      const [, payload] = httpService.post.mock.calls[0];
      expect(payload).toMatchObject({ jobPostCriteria: null });
    });

    it('transforme une erreur n8n non-HTTP en BadGatewayException', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);
      httpService.post.mockReturnValue(throwError(() => new Error('network error')));

      await expect(
        service.triggerAllAndSave('job-drive-1', 10, 'token'),
      ).rejects.toThrow(BadGatewayException);
    });

    it('crée une nouvelle évaluation quand aucune n\'existe pour ce CV et ce job post', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({ fileId: 'resume-1' });
      httpService.post.mockReturnValue(of(makeAxiosResponse({ matches: [match] })));

      repository.findByResumeAndJobPost.mockResolvedValue(null);
      const created = makeResumeEvaluation();
      repository.create.mockResolvedValue(created);

      const result = await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(repository.findByResumeAndJobPost).toHaveBeenCalledWith('resume-1', 10);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeFileId: 'resume-1',
          resumeName: 'cv_john_doe.pdf',
          jobPostId: 10,
          scoreGlobal: 85,
          status: 'ACCEPTED',
          recommendation: 'ACCEPTED',
        }),
      );
      expect(repository.update).not.toHaveBeenCalled();
      expect(result).toEqual([created]);
    });

    it('met à jour une évaluation existante pour le même CV et job post', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({ fileId: 'resume-1' });
      httpService.post.mockReturnValue(of(makeAxiosResponse({ matches: [match] })));

      const existing = makeResumeEvaluation({ id: 5 });
      repository.findByResumeAndJobPost.mockResolvedValue(existing);
      const updated = makeResumeEvaluation({ id: 5, scoreGlobal: 85 });
      repository.update.mockResolvedValue(updated);

      const result = await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(repository.update).toHaveBeenCalledWith(5, expect.objectContaining({ scoreGlobal: 85 }));
      expect(repository.create).not.toHaveBeenCalled();
      expect(result).toEqual([updated]);
    });

    it('calcule status REJECTED si le score est sous 60', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({
        detail: {
          scoreGlobal: 40,
          technicalSkills: { score: 40, detail: 'Faible' },
        },
      });
      httpService.post.mockReturnValue(of(makeAxiosResponse({ matches: [match] })));
      repository.findByResumeAndJobPost.mockResolvedValue(null);
      repository.create.mockResolvedValue(makeResumeEvaluation({ status: 'REJECTED', scoreGlobal: 40 }));

      await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ scoreGlobal: 40, status: 'REJECTED' }),
      );
    });

    it('inclut les certifications uniquement si présentes dans le detail', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({
        detail: {
          scoreGlobal: 90,
          certifications: {
            score: 100,
            detail: 'AWS certifié',
            matched: ['AWS'],
            missing: [],
          },
        },
      });
      httpService.post.mockReturnValue(of(makeAxiosResponse({ matches: [match] })));
      repository.findByResumeAndJobPost.mockResolvedValue(null);
      repository.create.mockResolvedValue(makeResumeEvaluation());

      await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          criteria: expect.objectContaining({
            certifications: {
              score: 100,
              detail: 'AWS certifié',
              matched: ['AWS'],
              missing: [],
            },
          }),
        }),
      );
    });

    it('déclenche le highlight Python quand termsToHighlight est fourni', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        if (key === 'PYTHON_HIGHLIGHT_URL') return 'https://python.local/highlight';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({ termsToHighlight: ['NestJS', 'TypeScript'] });

      httpService.post.mockImplementation((url: string) => {
        if (url === 'https://n8n.local/scoring') {
          return of(makeAxiosResponse({ matches: [match] }));
        }
        return of(makeAxiosResponse({ highlightedFileId: 'highlighted-1' }));
      });

      repository.findByResumeAndJobPost.mockResolvedValue(null);
      repository.create.mockResolvedValue(makeResumeEvaluation({ highlightedFileId: 'highlighted-1' }));

      await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://python.local/highlight',
        expect.objectContaining({
          fileId: 'resume-1',
          fileName: 'cv_john_doe.pdf',
          termsToHighlight: ['NestJS', 'TypeScript'],
          googleAccessToken: 'token',
        }),
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ highlightedFileId: 'highlighted-1' }),
      );
    });

    it('continue sans highlight si PYTHON_HIGHLIGHT_URL est absent', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });

      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({ termsToHighlight: ['NestJS'] });
      httpService.post.mockReturnValue(of(makeAxiosResponse({ matches: [match] })));
      repository.findByResumeAndJobPost.mockResolvedValue(null);
      repository.create.mockResolvedValue(makeResumeEvaluation());

      await service.triggerAllAndSave('job-drive-1', 10, 'token');

      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ highlightedFileId: expect.anything() }),
      );
    });
  });

  // ── getByJobPost ────────────────────────────────────────────────────────

  describe('getByJobPost', () => {
    it('délègue au repository', async () => {
      const evaluations = [makeResumeEvaluation()];
      repository.findByJobPost.mockResolvedValue(evaluations);

      const result = await service.getByJobPost(10);

      expect(repository.findByJobPost).toHaveBeenCalledWith(10);
      expect(result).toBe(evaluations);
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('retourne l\'évaluation trouvée', async () => {
      const evaluation = makeResumeEvaluation({ id: 3 });
      repository.findById.mockResolvedValue(evaluation);

      const result = await service.getById(3);

      expect(result).toBe(evaluation);
    });

    it('lève une NotFoundException si non trouvée', async () => {
      repository.findById.mockResolvedValue(null as unknown as ResumeEvaluation);

      await expect(service.getById(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('délègue au repository', async () => {
      repository.deleteById.mockResolvedValue(undefined);

      await service.delete(3);

      expect(repository.deleteById).toHaveBeenCalledWith(3);
    });
  });

  // ── rescoreOne ──────────────────────────────────────────────────────────

  describe('rescoreOne', () => {
    it('lève une NotFoundException si l\'évaluation n\'existe pas', async () => {
      repository.findById.mockResolvedValue(null as unknown as ResumeEvaluation);

      await expect(service.rescoreOne(99, 'token')).rejects.toThrow(NotFoundException);
    });

    it('lève une BadGatewayException si le webhook n\'est pas configuré', async () => {
      repository.findById.mockResolvedValue(makeResumeEvaluation());
      configService.get.mockReturnValue(undefined);

      await expect(service.rescoreOne(1, 'token')).rejects.toThrow(BadGatewayException);
    });

    it('lève une NotFoundException si n8n ne retourne aucun résultat correspondant', async () => {
      const existing = makeResumeEvaluation({ id: 1, resumeFileId: 'resume-1' });
      repository.findById.mockResolvedValue(existing);
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });
      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);
      httpService.post.mockReturnValue(of(makeAxiosResponse({ matches: [] })));

      await expect(service.rescoreOne(1, 'token')).rejects.toThrow(NotFoundException);
    });

    it('rescore avec succès en cherchant le match par highlightedFileId en priorité', async () => {
      const existing = makeResumeEvaluation({
        id: 1,
        resumeFileId: 'resume-1',
        highlightedFileId: 'highlighted-1',
      });
      repository.findById.mockResolvedValue(existing);
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });
      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({ fileId: 'highlighted-1' });
      httpService.post.mockReturnValue(of(makeAxiosResponse({ matches: [match] })));

      const rescored = makeResumeEvaluation({ id: 1, scoreGlobal: 85, isOutdated: false });
      repository.rescoreOne.mockResolvedValue(rescored);

      const result = await service.rescoreOne(1, 'token');

      expect(httpService.post).toHaveBeenCalledWith(
        'https://n8n.local/scoring',
        expect.objectContaining({
          singleResumeFileId: 'highlighted-1',
          singleResumeOriginalId: 'resume-1',
        }),
      );
      expect(repository.rescoreOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ scoreGlobal: 85, isOutdated: false }),
      );
      expect(result).toBe(rescored);
    });

    it('transforme une erreur n8n non-HTTP en BadGatewayException', async () => {
      repository.findById.mockResolvedValue(makeResumeEvaluation());
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        return undefined;
      });
      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);
      httpService.post.mockReturnValue(throwError(() => new Error('timeout')));

      await expect(service.rescoreOne(1, 'token')).rejects.toThrow(BadGatewayException);
    });

    it('déclenche le highlight si le match retourné a des termsToHighlight', async () => {
      const existing = makeResumeEvaluation({ id: 1, resumeFileId: 'resume-1' });
      repository.findById.mockResolvedValue(existing);
      configService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_CV_WEBHOOK_URL') return 'https://n8n.local/scoring';
        if (key === 'PYTHON_HIGHLIGHT_URL') return 'https://python.local/highlight';
        return undefined;
      });
      jobPostCriteriaService.findByJobPostId.mockResolvedValue(makeJobPostCriteria());
      globalCriteriaService.findAll.mockResolvedValue([]);

      const match = makeN8nMatch({ fileId: 'resume-1', termsToHighlight: ['NestJS'] });
      httpService.post.mockImplementation((url: string) => {
        if (url === 'https://n8n.local/scoring') {
          return of(makeAxiosResponse({ matches: [match] }));
        }
        return of(makeAxiosResponse({ highlightedFileId: 'highlighted-new' }));
      });

      repository.rescoreOne.mockResolvedValue(makeResumeEvaluation({ highlightedFileId: 'highlighted-new' }));

      await service.rescoreOne(1, 'token');

      expect(repository.rescoreOne).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ highlightedFileId: 'highlighted-new' }),
      );
    });
  });

  // ── markOutdated ────────────────────────────────────────────────────────

  describe('markOutdated', () => {
    it('délègue au repository et retourne le nombre de lignes affectées', async () => {
      repository.markOutdated.mockResolvedValue({ affected: 3 });

      const result = await service.markOutdated('highlighted-1');

      expect(repository.markOutdated).toHaveBeenCalledWith('highlighted-1');
      expect(result).toEqual({ updated: 3 });
    });
  });
});