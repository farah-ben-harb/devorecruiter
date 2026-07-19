// src/job-posts/controllers/job-post.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobPostService } from '../services/job-posts.service';
import { JobPostCriteriaService } from '../services/job-post-criteria.service';
import type { RawCriteriaPayload } from '../services/job-post-criteria.service';
import { JobPost, JobPostActivityStatus, JobPostStatus } from '../entities/job-post.entity';
import {
  JobPostCriteria,
  CriteriaSource,
} from '../entities/job-post-criteria.entity';
import { CreateJobPostDto } from '../dtos/job-post.dto';
import type { AuthRequest, GoogleAuthenticatedUser } from '../../auth/interfaces/auth.interface';
import type { CandidateSearchResult } from '../interfaces/job-post.interface';
import { JobPostController } from './job-posts.controller';

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

// Cast ciblé vers GoogleAuthenticatedUser (User & { googleAccessToken }) : on
// fournit les champs utilisés par le contrôleur (id, googleAccessToken) et
// on caste vers le type connu plutôt que de reconstruire l'entité User entière.
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

function makeMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'CV.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('contenu-test'),
    destination: '',
    filename: '',
    path: '',
    stream: undefined as unknown as Express.Multer.File['stream'],
    ...overrides,
  };
}

// ── Types des mocks (pas de any/unknown) ───────────────────────────────────

type MockedJobPostService = jest.Mocked<
  Pick<
    JobPostService,
    | 'processPost'
    | 'uploadFromLocal'
    | 'syncFromDrive'
    | 'triggerUnification'
    | 'getCriteria'
    | 'getImportedFileIds'
    | 'downloadFile'
    | 'listFiles'
    | 'getAll'
    | 'getAllWithEvaluations'
    | 'shareAllExistingFiles'
    | 'deletePost'
    | 'findOne'
    | 'updateRequiresCoding'
    | 'updateHasQcm'
    | 'updateTitle'
    | 'duplicate'
    | 'updateJobStatus'
    | 'searchCandidatesForLinking'
  >
>;

type MockedConfigService = jest.Mocked<Pick<ConfigService, 'get'>>;

type MockedJobPostCriteriaService = jest.Mocked<Pick<JobPostCriteriaService, 'upsertFromFrontend'>>;

describe('JobPostController', () => {
  let controller: JobPostController;
  let jobpostService: MockedJobPostService;
  let configService: MockedConfigService;
  let criteriaService: MockedJobPostCriteriaService;

  beforeEach(async () => {
    const mockJobpostService: MockedJobPostService = {
      processPost: jest.fn(),
      uploadFromLocal: jest.fn(),
      syncFromDrive: jest.fn(),
      triggerUnification: jest.fn(),
      getCriteria: jest.fn(),
      getImportedFileIds: jest.fn(),
      downloadFile: jest.fn(),
      listFiles: jest.fn(),
      getAll: jest.fn(),
      getAllWithEvaluations: jest.fn(),
      shareAllExistingFiles: jest.fn(),
      deletePost: jest.fn(),
      findOne: jest.fn(),
      updateRequiresCoding: jest.fn(),
      updateHasQcm: jest.fn(),
      updateTitle: jest.fn(),
      duplicate: jest.fn(),
      updateJobStatus: jest.fn(),
      searchCandidatesForLinking: jest.fn(),
    };

    const mockConfigService: MockedConfigService = {
      get: jest.fn(),
    };

    const mockCriteriaService: MockedJobPostCriteriaService = {
      upsertFromFrontend: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobPostController],
      providers: [
        { provide: JobPostService, useValue: mockJobpostService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JobPostCriteriaService, useValue: mockCriteriaService },
      ],
    }).compile();

    controller = module.get<JobPostController>(JobPostController);
    jobpostService = mockJobpostService;
    configService = mockConfigService;
    criteriaService = mockCriteriaService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── processPost ───────────────────────────────────────────────────────

  describe('processPost', () => {
    it('traite le post et retourne un message de succès', async () => {
      const dto: CreateJobPostDto = { googleDriveFileId: 'drive-file-1' };
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 42 }) });
      const post = makeJobPost({ id: 7 });
      jobpostService.processPost.mockResolvedValue(post);

      const result = await controller.processPost(dto, req);

      expect(jobpostService.processPost).toHaveBeenCalledWith(dto, 42);
      expect(result).toEqual({ message: 'Post processed', data: post });
    });
  });

  // ── uploadJobPost ─────────────────────────────────────────────────────

  describe('uploadJobPost', () => {
    it('upload le fichier et retourne un message de succès', async () => {
      const file = makeMulterFile();
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      const post = makeJobPost({ id: 9 });
      jobpostService.uploadFromLocal.mockResolvedValue(post);

      const result = await controller.uploadJobPost(file, req);

      expect(jobpostService.uploadFromLocal).toHaveBeenCalledWith(5, file);
      expect(result).toEqual({ message: 'File imported successfully', data: post });
    });
  });

  // ── syncFromDrive ─────────────────────────────────────────────────────

  describe('syncFromDrive', () => {
    it('utilise unifiedFolderId fourni en priorité sur la config', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      jobpostService.syncFromDrive.mockResolvedValue({ added: 1, removed: 0 });

      await controller.syncFromDrive('raw-folder', 'unified-folder', req);

      expect(configService.get).not.toHaveBeenCalled();
      expect(jobpostService.syncFromDrive).toHaveBeenCalledWith(5, 'raw-folder', 'unified-folder');
    });

    it('retombe sur DRIVE_FOLDER_UNIFIED_ID si unifiedFolderId est absent', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      configService.get.mockReturnValue('default-unified-folder');
      jobpostService.syncFromDrive.mockResolvedValue({ added: 0, removed: 0 });

      await controller.syncFromDrive('raw-folder', '', req);

      expect(configService.get).toHaveBeenCalledWith('DRIVE_FOLDER_UNIFIED_ID');
      expect(jobpostService.syncFromDrive).toHaveBeenCalledWith(5, 'raw-folder', 'default-unified-folder');
    });
  });

  // ── triggerUnification ───────────────────────────────────────────────

  describe('triggerUnification', () => {
    it("déclenche l'unification pour le user authentifié", async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 3 }) });
      jobpostService.triggerUnification.mockResolvedValue({ message: 'Unification triggered successfully' });

      const result = await controller.triggerUnification(1, req);

      expect(jobpostService.triggerUnification).toHaveBeenCalledWith(1, 3);
      expect(result).toEqual({ message: 'Unification triggered successfully' });
    });
  });

  // ── getCriteria ───────────────────────────────────────────────────────

  describe('getCriteria', () => {
    it('retourne les critères pour l\'id fourni', async () => {
      const criteria = makeCriteria({ jobPostId: 1 });
      jobpostService.getCriteria.mockResolvedValue(criteria);

      const result = await controller.getCriteria(1);

      expect(jobpostService.getCriteria).toHaveBeenCalledWith(1);
      expect(result).toBe(criteria);
    });
  });

  // ── getImportedFileIds ────────────────────────────────────────────────

  describe('getImportedFileIds', () => {
    it('retourne la liste des IDs importés', async () => {
      jobpostService.getImportedFileIds.mockResolvedValue(['id-1', 'id-2']);

      const result = await controller.getImportedFileIds();

      expect(result).toEqual(['id-1', 'id-2']);
    });
  });

  // ── downloadGeneratedDocument ─────────────────────────────────────────

  describe('downloadGeneratedDocument', () => {
    it('utilise application/pdf par défaut et construit le nom de fichier', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      jobpostService.downloadFile.mockResolvedValue('base64-content');

      const result = await controller.downloadGeneratedDocument('doc-123', '', req);

      expect(jobpostService.downloadFile).toHaveBeenCalledWith(5, 'doc-123', 'application/pdf');
      expect(result).toEqual({
        data: 'base64-content',
        mimeType: 'application/pdf',
        fileName: 'doc-123.pdf',
      });
    });

    it('utilise le mimeType fourni et l\'extension correspondante', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      jobpostService.downloadFile.mockResolvedValue('base64-content');

      const result = await controller.downloadGeneratedDocument(
        'doc-123',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        req,
      );

      expect(result.fileName).toBe('doc-123.docx');
      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('retombe sur pdf si le mimeType est inconnu de la table de correspondance', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      jobpostService.downloadFile.mockResolvedValue('base64-content');

      const result = await controller.downloadGeneratedDocument('doc-123', 'application/x-unknown', req);

      expect(result.fileName).toBe('doc-123.pdf');
    });
  });

  // ── getDriveFiles ─────────────────────────────────────────────────────

  describe('getDriveFiles', () => {
    it('lève une BadRequestException si folderId est manquant', async () => {
      const req = makeAuthRequest();

      await expect(controller.getDriveFiles(req, '')).rejects.toThrow('Folder ID missing');
    });

    it('retourne les fichiers du dossier Drive', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      const files = [{ id: 'f1', name: 'file.pdf', mimeType: 'application/pdf' }];
      jobpostService.listFiles.mockResolvedValue(files);

      const result = await controller.getDriveFiles(req, 'folder-1');

      expect(jobpostService.listFiles).toHaveBeenCalledWith(5, 'folder-1');
      expect(result).toBe(files);
    });
  });

  // ── getAllPosts ───────────────────────────────────────────────────────

  describe('getAllPosts', () => {
    it('utilise page=1 et limit=10 par défaut', async () => {
      const paginated: PaginatedResultForJobPost = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      jobpostService.getAll.mockResolvedValue(paginated);

      await controller.getAllPosts();

      expect(jobpostService.getAll).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined);
    });

    it('parse page et limit fournis en query string', async () => {
      const paginated: PaginatedResultForJobPost = {
        data: [],
        meta: { total: 0, page: 2, limit: 20, totalPages: 0 },
      };
      jobpostService.getAll.mockResolvedValue(paginated);

      await controller.getAllPosts('2', '20', 'dev', 'raw', 'open');

      expect(jobpostService.getAll).toHaveBeenCalledWith(2, 20, 'dev', 'raw', 'open');
    });

    it('retombe sur les valeurs par défaut si page/limit ne sont pas des nombres valides', async () => {
      const paginated: PaginatedResultForJobPost = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      jobpostService.getAll.mockResolvedValue(paginated);

      await controller.getAllPosts('abc', 'xyz');

      expect(jobpostService.getAll).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined);
    });
  });

  // ── getPostsWithEvaluations ───────────────────────────────────────────

  describe('getPostsWithEvaluations', () => {
    it('utilise page=1 et limit=10 par défaut', async () => {
      const paginated: PaginatedResultForJobPost = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      jobpostService.getAllWithEvaluations.mockResolvedValue(paginated);

      await controller.getPostsWithEvaluations();

      expect(jobpostService.getAllWithEvaluations).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('parse page, limit et search fournis', async () => {
      const paginated: PaginatedResultForJobPost = {
        data: [],
        meta: { total: 0, page: 3, limit: 5, totalPages: 0 },
      };
      jobpostService.getAllWithEvaluations.mockResolvedValue(paginated);

      await controller.getPostsWithEvaluations('3', '5', 'backend');

      expect(jobpostService.getAllWithEvaluations).toHaveBeenCalledWith(3, 5, 'backend');
    });
  });

  // ── shareExisting ─────────────────────────────────────────────────────

  describe('shareExisting', () => {
    it('partage tous les fichiers et retourne un message de succès', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      jobpostService.shareAllExistingFiles.mockResolvedValue(undefined);

      const result = await controller.shareExisting(req);

      expect(jobpostService.shareAllExistingFiles).toHaveBeenCalledWith(5);
      expect(result).toEqual({ message: 'Done' });
    });
  });

  // ── deletePost ────────────────────────────────────────────────────────

  describe('deletePost', () => {
    it('supprime le post et retourne un message de succès', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      jobpostService.deletePost.mockResolvedValue({ action: 'deleted' });

      const result = await controller.deletePost(1, req);

      expect(jobpostService.deletePost).toHaveBeenCalledWith(1, 5);
      expect(result).toEqual({
        message: 'Post 1 deleted successfully',
        id: 1,
        action: 'deleted',
      });
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('convertit l\'id en nombre et délègue au service', async () => {
      const post = makeJobPost({ id: 3 });
      jobpostService.findOne.mockResolvedValue(post);

      const result = await controller.findOne(3);

      expect(jobpostService.findOne).toHaveBeenCalledWith(3);
      expect(result).toBe(post);
    });
  });

  // ── updateRequiresCoding ──────────────────────────────────────────────

  describe('updateRequiresCoding', () => {
    it('délègue au service avec la valeur fournie', async () => {
      const post = makeJobPost({ requiresCoding: true });
      jobpostService.updateRequiresCoding.mockResolvedValue(post);

      const result = await controller.updateRequiresCoding(1, { requiresCoding: true });

      expect(jobpostService.updateRequiresCoding).toHaveBeenCalledWith(1, true);
      expect(result).toBe(post);
    });
  });

  // ── updateHasQcm ──────────────────────────────────────────────────────

  describe('updateHasQcm', () => {
    it('délègue au service avec la valeur fournie', async () => {
      const post = makeJobPost({ hasQcm: false });
      jobpostService.updateHasQcm.mockResolvedValue(post);

      const result = await controller.updateHasQcm(1, { hasQcm: false });

      expect(jobpostService.updateHasQcm).toHaveBeenCalledWith(1, false);
      expect(result).toBe(post);
    });
  });

  // ── updateTitle ───────────────────────────────────────────────────────

  describe('updateTitle', () => {
    it('délègue au service avec titre et company', async () => {
      const post = makeJobPost({ title: 'Nouveau titre', company: 'ACME' });
      jobpostService.updateTitle.mockResolvedValue(post);

      const result = await controller.updateTitle(1, { title: 'Nouveau titre', company: 'ACME' });

      expect(jobpostService.updateTitle).toHaveBeenCalledWith(1, 'Nouveau titre', 'ACME');
      expect(result).toBe(post);
    });
  });

  // ── duplicate ─────────────────────────────────────────────────────────

  describe('duplicate', () => {
    it('délègue au service avec le body et le user id', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });
      const body = { title: 'Copie', company: 'ACME', hasQcm: true, requiresCoding: false };
      const duplicated = makeJobPost({ id: 2, title: 'Copie' });
      jobpostService.duplicate.mockResolvedValue(duplicated);

      const result = await controller.duplicate(1, body, req);

      expect(jobpostService.duplicate).toHaveBeenCalledWith(1, body, 7);
      expect(result).toBe(duplicated);
    });
  });

  // ── getDocxUrl ────────────────────────────────────────────────────────

  describe('getDocxUrl', () => {
    it('retourne une URL construite quand unifiedDocxId est présent', async () => {
      const post = makeJobPost({ unifiedDocxId: 'docx-123' });
      jobpostService.findOne.mockResolvedValue(post);

      const result = await controller.getDocxUrl(1);

      expect(result).toEqual({
        url: 'https://docs.google.com/document/d/docx-123/edit',
        docxId: 'docx-123',
      });
    });

    it('retourne une URL vide quand unifiedDocxId est absent', async () => {
      const post = makeJobPost({ unifiedDocxId: null });
      jobpostService.findOne.mockResolvedValue(post);

      const result = await controller.getDocxUrl(1);

      expect(result).toEqual({ url: '', docxId: null });
    });
  });

  // ── downloadUnifiedPdf ────────────────────────────────────────────────

  describe('downloadUnifiedPdf', () => {
    it('lève une NotFoundException si aucun fichier unifié n\'existe', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      const post = makeJobPost({ unifiedDocxId: null, googleDocId: null });
      jobpostService.findOne.mockResolvedValue(post);

      await expect(controller.downloadUnifiedPdf(1, req)).rejects.toThrow(NotFoundException);
    });

    it('utilise unifiedDocxId en priorité et construit le nom depuis le titre', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      const post = makeJobPost({
        unifiedDocxId: 'docx-123',
        googleDocId: 'doc-456',
        title: 'Développeur Backend.pdf',
        name: 'fiche.pdf',
      });
      jobpostService.findOne.mockResolvedValue(post);
      jobpostService.downloadFile.mockResolvedValue('base64-content');

      const result = await controller.downloadUnifiedPdf(1, req);

      expect(jobpostService.downloadFile).toHaveBeenCalledWith(5, 'docx-123', 'application/pdf');
      expect(result).toEqual({
        data: 'base64-content',
        mimeType: 'application/pdf',
        fileName: 'Développeur Backend.pdf',
      });
    });

    it('retombe sur googleDocId si unifiedDocxId est absent', async () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 5 }) });
      const post = makeJobPost({
        unifiedDocxId: null,
        googleDocId: 'doc-456',
        title: null,
        name: 'fiche_poste.pdf',
      });
      jobpostService.findOne.mockResolvedValue(post);
      jobpostService.downloadFile.mockResolvedValue('base64-content');

      const result = await controller.downloadUnifiedPdf(1, req);

      expect(jobpostService.downloadFile).toHaveBeenCalledWith(5, 'doc-456', 'application/pdf');
      expect(result.fileName).toBe('fiche_poste.pdf');
    });
  });

  // ── updateJobStatus ───────────────────────────────────────────────────

  describe('updateJobStatus', () => {
    it('délègue au service avec le jobStatus et les candidats liés', async () => {
      const post = makeJobPost({ jobStatus: JobPostActivityStatus.CLOSED_WITH_HIRE });
      jobpostService.updateJobStatus.mockResolvedValue(post);

      const body = {
        jobStatus: 'closed_with_hire' as const,
        linkedCandidateIds: ['cand-1'],
      };

      const result = await controller.updateJobStatus(1, body);

      expect(jobpostService.updateJobStatus).toHaveBeenCalledWith(
        1,
        JobPostActivityStatus.CLOSED_WITH_HIRE,
        ['cand-1'],
      );
      expect(result).toBe(post);
    });

    it('accepte jobStatus null', async () => {
      const post = makeJobPost({ jobStatus: null });
      jobpostService.updateJobStatus.mockResolvedValue(post);

      const result = await controller.updateJobStatus(1, { jobStatus: null });

      expect(jobpostService.updateJobStatus).toHaveBeenCalledWith(1, null, undefined);
      expect(result).toBe(post);
    });
  });

  // ── searchCandidates ──────────────────────────────────────────────────

  describe('searchCandidates', () => {
    it('délègue au service avec q seul quand ids est absent', async () => {
      const candidates = [makeCandidate()];
      jobpostService.searchCandidatesForLinking.mockResolvedValue(candidates);

      const result = await controller.searchCandidates('Ahmed');

      expect(jobpostService.searchCandidatesForLinking).toHaveBeenCalledWith('Ahmed', undefined);
      expect(result).toBe(candidates);
    });

    it('découpe la chaîne ids en tableau', async () => {
      const candidates = [makeCandidate({ id: 'cand-1' }), makeCandidate({ id: 'cand-2' })];
      jobpostService.searchCandidatesForLinking.mockResolvedValue(candidates);

      const result = await controller.searchCandidates(undefined, 'cand-1,cand-2');

      expect(jobpostService.searchCandidatesForLinking).toHaveBeenCalledWith(undefined, ['cand-1', 'cand-2']);
      expect(result).toBe(candidates);
    });

    it('filtre les entrées vides dans la liste ids', async () => {
      jobpostService.searchCandidatesForLinking.mockResolvedValue([]);

      await controller.searchCandidates(undefined, 'cand-1,,cand-2,');

      expect(jobpostService.searchCandidatesForLinking).toHaveBeenCalledWith(undefined, ['cand-1', 'cand-2']);
    });
  });

  // ── updateCriteria ────────────────────────────────────────────────────

  describe('updateCriteria', () => {
    it('délègue à upsertFromFrontend (pas upsertFromN8n)', async () => {
      const payload: RawCriteriaPayload = {
        intitulePoste: 'Dev Backend',
        competencesTechniquesRequises: ['NestJS'],
      };
      const updated = makeCriteria({ intitulePoste: 'Dev Backend' });
      criteriaService.upsertFromFrontend.mockResolvedValue(updated);

      const result = await controller.updateCriteria(1, payload);

      expect(criteriaService.upsertFromFrontend).toHaveBeenCalledWith(1, payload);
      expect(result).toBe(updated);
    });
  });
});

type PaginatedResultForJobPost = {
  data: JobPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};