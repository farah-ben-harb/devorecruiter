import { Readable } from 'stream';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { N8nWorkflowService } from '../../common/workflows/n8n-workflow.service';
import { JobPostHelpersService } from './job-posts-helpers.service';
import { JobPostDriveService } from './job-posts-drive.service';
import { JobPostCriteriaService } from './job-post-criteria.service';
import {
  IJobPostRepository,
  JOB_POST_REPOSITORY,
  CandidateSearchResult,
} from '../interfaces/job-post.interface';
import {
  JobPost,
  JobPostActivityStatus,
  JobPostStatus,
} from '../entities/job-post.entity';
import {
  JobPostCriteria,
  CriteriaSource,
} from '../entities/job-post-criteria.entity';
import { CreateJobPostDto } from '../dtos/job-post.dto';
import { N8nResponse, RawCriteriaPayload } from '../../common/interfaces/n8n-response.interface';
import { DriveFile } from '../../common/interfaces/google-drive.interface';
import { JobPostService } from './job-posts.service';

// ── Helpers de fabrication ────────────────────────────────────────────────

function makeJobPost(overrides: Partial<JobPost> = {}): JobPost {
  return {
    id: 1,
    googleDriveFileId: 'drive-file-1',
    name: 'fiche_poste.pdf',
    type: 'application/pdf',
    url: 'https://drive.google.com/file/d/drive-file-1/view',
    googleDocId: null,
    unifiedUrl: null,
    company: null,
    startDate: null,
    evaluationsFolderId: null,
    status: JobPostStatus.RAW,
    title: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    requiresCoding: null,
    hasQcm: null,
    unifiedDocxId: null,
    jobStatus: null,
    linkedCandidateIds: [],
    ...overrides,
  };
}

function makeMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'CV.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    stream: new Readable(),
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.from('contenu-test'),
    ...overrides,
  };
}

function makeDriveFile(overrides: Partial<DriveFile> = {}): DriveFile {
  return {
    id: 'drive-file-1',
    name: 'fiche_poste.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://drive.google.com/file/d/drive-file-1/view',
    ...overrides,
  };
}

function makeCriteria(overrides: Partial<JobPostCriteria> = {}): JobPostCriteria {
  return {
    id: 1,
    jobPostId: 1,
    jobPost: {} as JobPostCriteria['jobPost'],
    intitulePoste: null,
    competencesTechniquesRequises: [],
    competencesGeneralesRequises: [],
    experienceMinimaleAnnees: null,
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

function makeCandidate(overrides: Partial<CandidateSearchResult> = {}): CandidateSearchResult {
  return {
    id: 'cand-1',
    name: 'Ben Salah',
    firstName: 'Ahmed',
    email: 'ahmed@example.com',
    unifieDriveName: 'CV_unifie.pdf',
    unifieDriveLink: 'https://drive.google.com/file/d/xxx/view',
    ...overrides,
  };
}

// ── Mock du query builder TypeORM pour searchCandidatesForLinking ─────────

type QueryParams = Record<string, string | string[]>;

interface QueryBuilderMock {
  select: jest.MockedFunction<(columns: string[]) => QueryBuilderMock>;
  from: jest.MockedFunction<(table: string, alias: string) => QueryBuilderMock>;
  where: jest.MockedFunction<(condition: string, params?: QueryParams) => QueryBuilderMock>;
  andWhere: jest.MockedFunction<(condition: string, params?: QueryParams) => QueryBuilderMock>;
  orderBy: jest.MockedFunction<(column: string, direction: string) => QueryBuilderMock>;
  limit: jest.MockedFunction<(count: number) => QueryBuilderMock>;
  getRawMany: jest.MockedFunction<() => Promise<CandidateSearchResult[]>>;
}

function makeQueryBuilderMock(result: CandidateSearchResult[]): QueryBuilderMock {
  const qb = {} as QueryBuilderMock;
  qb.select = jest.fn().mockReturnValue(qb);
  qb.from = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.limit = jest.fn().mockReturnValue(qb);
  qb.getRawMany = jest.fn().mockResolvedValue(result);
  return qb;
}

interface RepositoryWithManager extends IJobPostRepository {
  jobPost: {
    manager: {
      createQueryBuilder: jest.MockedFunction<() => QueryBuilderMock>;
    };
  };
}

// ── Types des mocks des dépendances (pas de any/unknown) ──────────────────

type MockedGoogleDriveService = jest.Mocked<
  Pick<GoogleDriveService, 'createFolder' | 'uploadFile' | 'shareWithAll' | 'deleteFile' | 'downloadFile'>
>;

type MockedConfigService = jest.Mocked<Pick<ConfigService, 'get' | 'getOrThrow'>>;

type MockedN8nWorkflowService = jest.Mocked<Pick<N8nWorkflowService, 'processJobPost'>>;

type MockedHelpersService = jest.Mocked<
  Pick<JobPostHelpersService, 'extractTitleFromFile' | 'extractCompanyFromName' | 'extractStartDateFromPdf'>
>;

type MockedDriveService = jest.Mocked<
  Pick<JobPostDriveService, 'syncFromDrive' | 'listFiles' | 'downloadFile' | 'shareAllExistingFiles'>
>;

type MockedCriteriaService = jest.Mocked<
  Pick<JobPostCriteriaService, 'upsertFromN8n' | 'findByJobPostId'>
>;

describe('JobPostService', () => {
  let service: JobPostService;
  let repository: jest.Mocked<RepositoryWithManager>;
  let googleDriveService: MockedGoogleDriveService;
  let configService: MockedConfigService;
  let n8nWorkflowService: MockedN8nWorkflowService;
  let helpers: MockedHelpersService;
  let driveService: MockedDriveService;
  let criteriaService: MockedCriteriaService;

  beforeEach(async () => {
    const mockRepository: jest.Mocked<RepositoryWithManager> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn(),
      deleteBy: jest.fn(),
      updateStatus: jest.fn(),
      findByGoogleDriveFileId: jest.fn(),
      updateUnifie: jest.fn(),
      resetToRaw: jest.fn(),
      updateEvaluationsFolder: jest.fn(),
      updateRequiresCoding: jest.fn(),
      updateHasQcm: jest.fn(),
      updateTitle: jest.fn(),
      updateJobStatus: jest.fn(),
      jobPost: {
        manager: {
          createQueryBuilder: jest.fn(),
        },
      },
    };

    const mockGoogleDriveService: MockedGoogleDriveService = {
      createFolder: jest.fn(),
      uploadFile: jest.fn(),
      shareWithAll: jest.fn(),
      deleteFile: jest.fn(),
      downloadFile: jest.fn(),
    };

    const mockConfigService: MockedConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn(),
    };

    const mockN8nWorkflowService: MockedN8nWorkflowService = {
      processJobPost: jest.fn(),
    };

    const mockHelpers: MockedHelpersService = {
      extractTitleFromFile: jest.fn(),
      extractCompanyFromName: jest.fn(),
      extractStartDateFromPdf: jest.fn(),
    };

    const mockDriveService: MockedDriveService = {
      syncFromDrive: jest.fn(),
      listFiles: jest.fn(),
      downloadFile: jest.fn(),
      shareAllExistingFiles: jest.fn(),
    };

    const mockCriteriaService: MockedCriteriaService = {
      upsertFromN8n: jest.fn(),
      findByJobPostId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostService,
        { provide: JOB_POST_REPOSITORY, useValue: mockRepository },
        { provide: GoogleDriveService, useValue: mockGoogleDriveService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: N8nWorkflowService, useValue: mockN8nWorkflowService },
        { provide: JobPostHelpersService, useValue: mockHelpers },
        { provide: JobPostDriveService, useValue: mockDriveService },
        { provide: JobPostCriteriaService, useValue: mockCriteriaService },
      ],
    }).compile();

    service = module.get<JobPostService>(JobPostService);
    repository = mockRepository;
    googleDriveService = mockGoogleDriveService;
    configService = mockConfigService;
    n8nWorkflowService = mockN8nWorkflowService;
    helpers = mockHelpers;
    driveService = mockDriveService;
    criteriaService = mockCriteriaService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── createPost ────────────────────────────────────────────────────────

  describe('createPost', () => {
    it('crée le post et le dossier Drive quand userId et name sont fournis', async () => {
      const created = makeJobPost({ id: 5, name: 'fiche.pdf' });
      const final = makeJobPost({ id: 5, name: 'fiche.pdf', evaluationsFolderId: 'folder-1' });

      repository.create.mockResolvedValue(created);
      configService.getOrThrow.mockReturnValue('parent-folder-id');
      googleDriveService.createFolder.mockResolvedValue(
        makeDriveFile({ id: 'folder-1', name: 'evaluations_fiche.pdf' }),
      );
      repository.updateEvaluationsFolder.mockResolvedValue(undefined);
      repository.findBy.mockResolvedValue(final);

      const result = await service.createPost({ name: 'fiche.pdf' }, 42);

      expect(repository.create).toHaveBeenCalledWith({ name: 'fiche.pdf' });
      expect(googleDriveService.createFolder).toHaveBeenCalledWith(
        42,
        'evaluations_fiche.pdf',
        'parent-folder-id',
      );
      expect(repository.updateEvaluationsFolder).toHaveBeenCalledWith(5, 'folder-1');
      expect(result).toBe(final);
    });

    it("n'essaie pas de créer un dossier Drive si userId est absent", async () => {
      const created = makeJobPost({ id: 5 });
      repository.create.mockResolvedValue(created);
      repository.findBy.mockResolvedValue(created);

      await service.createPost({ name: 'fiche.pdf' });

      expect(googleDriveService.createFolder).not.toHaveBeenCalled();
    });

    it("continue et log un warning si la création du dossier Drive échoue", async () => {
      const created = makeJobPost({ id: 5, name: 'fiche.pdf' });
      repository.create.mockResolvedValue(created);
      configService.getOrThrow.mockReturnValue('parent-folder-id');
      googleDriveService.createFolder.mockRejectedValue(new Error('Drive down'));
      repository.findBy.mockResolvedValue(created);

      const result = await service.createPost({ name: 'fiche.pdf' }, 42);

      expect(repository.updateEvaluationsFolder).not.toHaveBeenCalled();
      expect(result).toBe(created);
    });
  });

  // ── processPost ───────────────────────────────────────────────────────

  describe('processPost', () => {
    it('lève une BadRequestException si googleDriveFileId est manquant', async () => {
      const dto: CreateJobPostDto = { googleDriveFileId: '' };

      await expect(service.processPost(dto, 1)).rejects.toThrow(BadRequestException);
      expect(n8nWorkflowService.processJobPost).not.toHaveBeenCalled();
    });

    it('traite le fichier via n8n et crée le post', async () => {
      const dto: CreateJobPostDto = { googleDriveFileId: 'drive-file-1' };
      const n8nResponse: N8nResponse = {
        document_id: 'doc-1',
        document_name: 'Fiche générée',
      };
      const created = makeJobPost({ id: 7 });

      n8nWorkflowService.processJobPost.mockResolvedValue(n8nResponse);
      const createPostSpy = jest.spyOn(service, 'createPost').mockResolvedValue(created);

      const result = await service.processPost(dto, 1);

      expect(n8nWorkflowService.processJobPost).toHaveBeenCalledWith('drive-file-1');
      expect(createPostSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          googleDriveFileId: 'drive-file-1',
          name: 'Fiche générée',
          status: JobPostStatus.RAW,
          url: 'https://docs.google.com/document/d/doc-1/edit',
        }),
        1,
      );
      expect(result).toBe(created);
    });

    it('transforme une erreur inconnue en BadGatewayException', async () => {
      const dto: CreateJobPostDto = { googleDriveFileId: 'drive-file-1' };
      n8nWorkflowService.processJobPost.mockRejectedValue(new Error('n8n timeout'));

      await expect(service.processPost(dto, 1)).rejects.toThrow(BadGatewayException);
    });

    it('propage telle quelle une HttpException déjà typée', async () => {
      const dto: CreateJobPostDto = { googleDriveFileId: 'drive-file-1' };
      n8nWorkflowService.processJobPost.mockRejectedValue(new NotFoundException('introuvable'));

      await expect(service.processPost(dto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  // ── uploadFromLocal ───────────────────────────────────────────────────

  describe('uploadFromLocal', () => {
    it('lève une BadRequestException si le fichier est manquant', async () => {
      await expect(
        service.uploadFromLocal(1, undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it("lève une BadRequestException si le dossier Drive n'est pas configuré", async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.uploadFromLocal(1, makeMulterFile())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('upload le fichier, extrait le titre et crée le post', async () => {
      configService.get.mockReturnValue('job-posts-folder');
      const driveFile = makeDriveFile({ id: 'drive-file-9', name: 'CV.pdf' });
      googleDriveService.uploadFile.mockResolvedValue(driveFile);
      googleDriveService.shareWithAll.mockResolvedValue(undefined);
      helpers.extractTitleFromFile.mockResolvedValue('Développeur Backend');
      helpers.extractCompanyFromName.mockReturnValue('TechSolutions');

      const created = makeJobPost({ id: 9 });
      const createPostSpy = jest.spyOn(service, 'createPost').mockResolvedValue(created);

      const result = await service.uploadFromLocal(1, makeMulterFile());

      expect(googleDriveService.uploadFile).toHaveBeenCalledWith(1, expect.anything(), 'job-posts-folder');
      expect(googleDriveService.shareWithAll).toHaveBeenCalledWith(1, 'drive-file-9');
      expect(createPostSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          googleDriveFileId: 'drive-file-9',
          title: 'Développeur Backend',
          company: 'TechSolutions',
        }),
        1,
      );
      expect(result).toBe(created);
    });

    it("continue sans titre si l'extraction échoue", async () => {
      configService.get.mockReturnValue('job-posts-folder');
      googleDriveService.uploadFile.mockResolvedValue(makeDriveFile());
      googleDriveService.shareWithAll.mockResolvedValue(undefined);
      helpers.extractTitleFromFile.mockRejectedValue(new Error('Extraction impossible'));
      helpers.extractCompanyFromName.mockReturnValue(null);

      const created = makeJobPost();
      const createPostSpy = jest.spyOn(service, 'createPost').mockResolvedValue(created);

      await service.uploadFromLocal(1, makeMulterFile());

      expect(createPostSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: undefined }),
        1,
      );
    });
  });

  // ── getAll / getImportedFileIds / findOne / getAllWithEvaluations ──────

  describe('getAll', () => {
    it('délègue au repository avec les bons paramètres', async () => {
      const paginated = { data: [makeJobPost()], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
      repository.findAll.mockResolvedValue(paginated);

      const result = await service.getAll(2, 20, 'dev', 'raw', 'open');

      expect(repository.findAll).toHaveBeenCalledWith(2, 20, 'dev', 'raw', undefined, 'open');
      expect(result).toBe(paginated);
    });
  });

  describe('getImportedFileIds', () => {
    it('retourne uniquement les googleDriveFileId non vides', async () => {
      const posts = [
        makeJobPost({ googleDriveFileId: 'id-1' }),
        makeJobPost({ googleDriveFileId: '' }),
        makeJobPost({ googleDriveFileId: 'id-3' }),
      ];
      repository.findAll.mockResolvedValue({
        data: posts,
        meta: { total: 3, page: 1, limit: 9999, totalPages: 1 },
      });

      const result = await service.getImportedFileIds();

      expect(result).toEqual(['id-1', 'id-3']);
    });
  });

  describe('findOne', () => {
    it('retourne le post trouvé', async () => {
      const post = makeJobPost({ id: 3 });
      repository.findBy.mockResolvedValue(post);

      const result = await service.findOne(3);

      expect(repository.findBy).toHaveBeenCalledWith({ id: 3 });
      expect(result).toBe(post);
    });

    it("lève une NotFoundException si le post n'existe pas", async () => {
      repository.findBy.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllWithEvaluations', () => {
    it('délègue au repository avec onlyWithEvaluations = true', async () => {
      const paginated = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      repository.findAll.mockResolvedValue(paginated);

      await service.getAllWithEvaluations(1, 10, 'search');

      expect(repository.findAll).toHaveBeenCalledWith(1, 10, 'search', undefined, true);
    });
  });

  describe('findByGoogleDriveFileId', () => {
    it('délègue au repository', async () => {
      const post = makeJobPost();
      repository.findByGoogleDriveFileId.mockResolvedValue(post);

      const result = await service.findByGoogleDriveFileId('drive-file-1');

      expect(repository.findByGoogleDriveFileId).toHaveBeenCalledWith('drive-file-1');
      expect(result).toBe(post);
    });
  });

  // ── deletePost ────────────────────────────────────────────────────────

  describe('deletePost', () => {
    it("lève une NotFoundException si le post n'existe pas", async () => {
      repository.findBy.mockResolvedValue(null);

      await expect(service.deletePost(99, 1)).rejects.toThrow(NotFoundException);
    });

    it('supprime les fichiers Drive dédupliqués puis le post en base', async () => {
      const post = makeJobPost({
        id: 3,
        googleDriveFileId: 'file-A',
        googleDocId: 'file-A', // même id que googleDriveFileId → déduplication attendue
      });
      repository.findBy.mockResolvedValue(post);
      googleDriveService.deleteFile.mockResolvedValue(undefined);
      repository.deleteBy.mockResolvedValue(undefined);

      const result = await service.deletePost(3, 1);

      expect(googleDriveService.deleteFile).toHaveBeenCalledTimes(1);
      expect(googleDriveService.deleteFile).toHaveBeenCalledWith(1, 'file-A');
      expect(repository.deleteBy).toHaveBeenCalledWith({ id: 3 });
      expect(result).toEqual({ action: 'deleted' });
    });

    it("continue même si la suppression d'un fichier Drive échoue", async () => {
      const post = makeJobPost({ id: 3, googleDriveFileId: 'file-A', googleDocId: 'file-B' });
      repository.findBy.mockResolvedValue(post);
      googleDriveService.deleteFile.mockRejectedValue(new Error('Drive error'));
      repository.deleteBy.mockResolvedValue(undefined);

      const result = await service.deletePost(3, 1);

      expect(repository.deleteBy).toHaveBeenCalledWith({ id: 3 });
      expect(result).toEqual({ action: 'deleted' });
    });
  });

  // ── triggerUnification ───────────────────────────────────────────────

  describe('triggerUnification', () => {
    it("lève une NotFoundException si le post n'existe pas", async () => {
      repository.findBy.mockResolvedValue(null);

      await expect(service.triggerUnification(1, 1)).rejects.toThrow(NotFoundException);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });

    it('unifie le post et sauvegarde les critères quand n8n les retourne', async () => {
      const post = makeJobPost({ id: 1, googleDriveFileId: 'drive-file-1', name: 'fiche.pdf' });
      const criteriaPayload: RawCriteriaPayload = {
        intitulePoste: 'Dev Backend',
        competencesTechniquesRequises: ['NestJS'],
      };
      const n8nResponse: N8nResponse = {
        document_id: 'unified-doc-1',
        document_name: 'fiche_unifie',
        docx_id: 'docx-1',
        company: 'TechSolutions',
        date_demarrage: '01/03/2024',
        intitule_poste: 'Dev Backend',
        requires_coding: true,
        job_post_criteria: criteriaPayload,
      };

      repository.findBy.mockResolvedValue(post);
      repository.updateStatus.mockResolvedValue(post);
      n8nWorkflowService.processJobPost.mockResolvedValue(n8nResponse);
      googleDriveService.downloadFile.mockResolvedValue('base64-content');
      repository.updateUnifie.mockResolvedValue(makeJobPost({ status: JobPostStatus.UNIFIED }));
      criteriaService.upsertFromN8n.mockResolvedValue(makeCriteria());

      const result = await service.triggerUnification(1, 1);

      expect(repository.updateStatus).toHaveBeenCalledWith(1, JobPostStatus.PROCESSING);
      expect(repository.updateUnifie).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          googleDocId: 'unified-doc-1',
          unifiedDocxId: 'docx-1',
          status: JobPostStatus.UNIFIED,
          unifiedUrl: 'https://drive.google.com/file/d/unified-doc-1/view',
          company: 'TechSolutions',
          startDate: '01/03/2024',
          title: 'Dev Backend',
          requiresCoding: true,
          hasQcm: true,
        }),
      );
      expect(criteriaService.upsertFromN8n).toHaveBeenCalledWith(1, criteriaPayload);
      expect(result).toEqual({ message: 'Unification triggered successfully' });
    });

    it("n'échoue pas l'unification si la sauvegarde des critères échoue", async () => {
  const post = makeJobPost({ id: 1, googleDriveFileId: 'drive-file-1' });
  const n8nResponse: N8nResponse = {
    document_id: 'unified-doc-1',
    document_name: 'fiche_unifie',
    job_post_criteria: { intitulePoste: 'Dev' },
  };

  repository.findBy.mockResolvedValue(post);
  repository.updateStatus.mockResolvedValue(post);
  n8nWorkflowService.processJobPost.mockResolvedValue(n8nResponse);
  helpers.extractStartDateFromPdf.mockResolvedValue(null);
  googleDriveService.downloadFile.mockResolvedValue('base64-content');
  repository.updateUnifie.mockResolvedValue(makeJobPost());
  criteriaService.upsertFromN8n.mockRejectedValue(new Error('DB down'));

  const result = await service.triggerUnification(1, 1);

  expect(result).toEqual({ message: 'Unification triggered successfully' });
});

    it('utilise extractStartDateFromPdf si date_demarrage est absente', async () => {
      const post = makeJobPost({ id: 1, googleDriveFileId: 'drive-file-1', name: 'fiche.pdf' });
      const n8nResponse: N8nResponse = {
        document_id: 'unified-doc-1',
        document_name: 'fiche_unifie',
      };

      repository.findBy.mockResolvedValue(post);
      repository.updateStatus.mockResolvedValue(post);
      n8nWorkflowService.processJobPost.mockResolvedValue(n8nResponse);
      helpers.extractStartDateFromPdf.mockResolvedValue('15/04/2024');
      googleDriveService.downloadFile.mockResolvedValue('base64-content');
      repository.updateUnifie.mockResolvedValue(makeJobPost());

      await service.triggerUnification(1, 1);

      expect(helpers.extractStartDateFromPdf).toHaveBeenCalledWith(1, 'unified-doc-1');
      expect(repository.updateUnifie).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ startDate: '15/04/2024' }),
      );
    });

    it('passe le post en erreur et relance si le fichier Drive unifié est introuvable', async () => {
  const post = makeJobPost({ id: 1, googleDriveFileId: 'drive-file-1' });
  const n8nResponse: N8nResponse = {
    document_id: 'unified-doc-1',
    document_name: 'fiche_unifie',
  };

  repository.findBy.mockResolvedValue(post);
  repository.updateStatus.mockResolvedValue(post);
  n8nWorkflowService.processJobPost.mockResolvedValue(n8nResponse);
  helpers.extractStartDateFromPdf.mockResolvedValue(null);
  googleDriveService.downloadFile.mockRejectedValue(new Error('introuvable'));
  repository.updateStatus.mockResolvedValue(post);

  await expect(service.triggerUnification(1, 1)).rejects.toThrow(
    'Fichier Drive introuvable pour document_id: unified-doc-1',
  );

  expect(repository.updateStatus).toHaveBeenCalledWith(1, JobPostStatus.ERROR);
});

    it('passe le post en erreur si n8n retourne une réponse sans document_id', async () => {
      const post = makeJobPost({ id: 1, googleDriveFileId: 'drive-file-1' });
      repository.findBy.mockResolvedValue(post);
      repository.updateStatus.mockResolvedValue(post);
      n8nWorkflowService.processJobPost.mockResolvedValue(
        { document_id: '', document_name: '' } as N8nResponse,
      );

      await expect(service.triggerUnification(1, 1)).rejects.toThrow(
        'n8n a retourné un document_id invalide ou manquant',
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(1, JobPostStatus.ERROR);
    });
  });

  // ── getCriteria ───────────────────────────────────────────────────────

  describe('getCriteria', () => {
    it("lève une NotFoundException si le job post n'existe pas", async () => {
      repository.findBy.mockResolvedValue(null);

      await expect(service.getCriteria(1)).rejects.toThrow(NotFoundException);
      expect(criteriaService.findByJobPostId).not.toHaveBeenCalled();
    });

    it('retourne les critères si le job post existe', async () => {
      const post = makeJobPost({ id: 1 });
      const criteria = makeCriteria({ jobPostId: 1 });
      repository.findBy.mockResolvedValue(post);
      criteriaService.findByJobPostId.mockResolvedValue(criteria);

      const result = await service.getCriteria(1);

      expect(criteriaService.findByJobPostId).toHaveBeenCalledWith(1);
      expect(result).toBe(criteria);
    });
  });

  // ── Délégations vers JobPostDriveService ────────────────────────────────

  describe('délégations Drive', () => {
    it('syncFromDrive délègue au driveService', async () => {
      driveService.syncFromDrive.mockResolvedValue({ added: 2, removed: 1 });

      const result = await service.syncFromDrive(1, 'raw-folder', 'unified-folder');

      expect(driveService.syncFromDrive).toHaveBeenCalledWith(1, 'raw-folder', 'unified-folder');
      expect(result).toEqual({ added: 2, removed: 1 });
    });

    it('listFiles délègue au driveService', async () => {
      const files = [makeDriveFile()];
      driveService.listFiles.mockResolvedValue(files);

      const result = await service.listFiles(1, 'folder-id');

      expect(driveService.listFiles).toHaveBeenCalledWith(1, 'folder-id');
      expect(result).toBe(files);
    });

    it('downloadFile délègue au driveService avec le mimeType par défaut', async () => {
      driveService.downloadFile.mockResolvedValue('base64');

      const result = await service.downloadFile(1, 'file-id');

      expect(driveService.downloadFile).toHaveBeenCalledWith(1, 'file-id', 'application/pdf');
      expect(result).toBe('base64');
    });

    it('shareAllExistingFiles délègue au driveService', async () => {
      driveService.shareAllExistingFiles.mockResolvedValue(undefined);

      await service.shareAllExistingFiles(1);

      expect(driveService.shareAllExistingFiles).toHaveBeenCalledWith(1);
    });
  });

  // ── updates simples ──────────────────────────────────────────────────

  describe('updateRequiresCoding', () => {
    it('délègue au repository', async () => {
      const post = makeJobPost({ requiresCoding: true });
      repository.updateRequiresCoding.mockResolvedValue(post);

      const result = await service.updateRequiresCoding(1, true);

      expect(repository.updateRequiresCoding).toHaveBeenCalledWith(1, true);
      expect(result).toBe(post);
    });
  });

  describe('updateHasQcm', () => {
    it('délègue au repository', async () => {
      const post = makeJobPost({ hasQcm: false });
      repository.updateHasQcm.mockResolvedValue(post);

      const result = await service.updateHasQcm(1, false);

      expect(repository.updateHasQcm).toHaveBeenCalledWith(1, false);
      expect(result).toBe(post);
    });
  });

  describe('updateTitle', () => {
    it('délègue au repository', async () => {
      const post = makeJobPost({ title: 'Nouveau titre' });
      repository.updateTitle.mockResolvedValue(post);

      const result = await service.updateTitle(1, 'Nouveau titre', 'ACME');

      expect(repository.updateTitle).toHaveBeenCalledWith(1, 'Nouveau titre', 'ACME');
      expect(result).toBe(post);
    });
  });

  // ── duplicate ────────────────────────────────────────────────────────

  describe('duplicate', () => {
    it("lève une NotFoundException si le post original n'existe pas", async () => {
      repository.findBy.mockResolvedValue(null);

      await expect(
        service.duplicate(99, { title: 'T', company: 'C', hasQcm: true, requiresCoding: false }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('crée une copie avec les champs mis à jour', async () => {
      const original = makeJobPost({
        id: 1,
        googleDriveFileId: 'file-A',
        name: 'fiche.pdf',
        startDate: '01/01/2024',
      });
      repository.findBy.mockResolvedValue(original);

      const duplicated = makeJobPost({ id: 2, title: 'Nouveau', company: 'ACME' });
      const createPostSpy = jest.spyOn(service, 'createPost').mockResolvedValue(duplicated);

      const result = await service.duplicate(
        1,
        { title: 'Nouveau', company: 'ACME', hasQcm: true, requiresCoding: false },
        7,
      );

      expect(createPostSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          googleDriveFileId: 'file-A',
          title: 'Nouveau',
          company: 'ACME',
          hasQcm: true,
          requiresCoding: false,
          startDate: '01/01/2024',
        }),
        7,
      );
      expect(result).toBe(duplicated);
    });
  });

  // ── updateJobStatus ──────────────────────────────────────────────────

  describe('updateJobStatus', () => {
    it("lève une NotFoundException si le post n'existe pas", async () => {
      repository.findBy.mockResolvedValue(null);

      await expect(service.updateJobStatus(1, JobPostActivityStatus.OPEN)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('renseigne linkedCandidateIds pour closed_with_hire', async () => {
      const post = makeJobPost({ id: 1 });
      repository.findBy.mockResolvedValue(post);
      repository.save.mockImplementation((entity: JobPost) => Promise.resolve(entity));

      const result = await service.updateJobStatus(
        1,
        JobPostActivityStatus.CLOSED_WITH_HIRE,
        ['cand-1', 'cand-2'],
      );

      expect(result.jobStatus).toBe(JobPostActivityStatus.CLOSED_WITH_HIRE);
      expect(result.linkedCandidateIds).toEqual(['cand-1', 'cand-2']);
    });

    it('vide linkedCandidateIds pour les autres statuts', async () => {
      const post = makeJobPost({ id: 1, linkedCandidateIds: ['old-1'] });
      repository.findBy.mockResolvedValue(post);
      repository.save.mockImplementation((entity: JobPost) => Promise.resolve(entity));

      const result = await service.updateJobStatus(1, JobPostActivityStatus.CLOSED_WITHOUT_HIRE);

      expect(result.linkedCandidateIds).toEqual([]);
    });
  });

  // ── searchCandidatesForLinking ───────────────────────────────────────

  describe('searchCandidatesForLinking', () => {
    it('recherche par IDs quand ids est fourni', async () => {
      const candidates = [makeCandidate({ id: 'cand-1' }), makeCandidate({ id: 'cand-2' })];
      const qb = makeQueryBuilderMock(candidates);
      repository.jobPost.manager.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchCandidatesForLinking(undefined, ['cand-1', 'cand-2']);

      expect(qb.where).toHaveBeenCalledWith('c.id = ANY(:ids)', { ids: ['cand-1', 'cand-2'] });
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toBe(candidates);
    });

    it('recherche par terme textuel quand ids est absent', async () => {
      const candidates = [makeCandidate()];
      const qb = makeQueryBuilderMock(candidates);
      repository.jobPost.manager.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchCandidatesForLinking('Ahmed');

      expect(qb.where).toHaveBeenCalledWith('c."unifieDriveId" IS NOT NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(c.name ILIKE :term OR c."firstName" ILIKE :term OR c.email ILIKE :term)',
        { term: '%Ahmed%' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('c."updatedAt"', 'DESC');
      expect(qb.limit).toHaveBeenCalledWith(20);
      expect(result).toBe(candidates);
    });

    it("n'ajoute pas de filtre textuel si q est vide ou seulement des espaces", async () => {
      const qb = makeQueryBuilderMock([]);
      repository.jobPost.manager.createQueryBuilder.mockReturnValue(qb);

      await service.searchCandidatesForLinking('   ');

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });
});