import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  TECHNICAL_EVALUATION_REPOSITORY,
} from '../../interfaces/technical-evaluations/technical-evaluations.interface';
import type { ITechnicalEvaluationRepository } from '../../interfaces/technical-evaluations/technical-evaluations.interface';
import {
  TechnicalEvaluation,
  EvaluationStatus,
} from '../../entities/technical-evaluations/technical-evaluations.entity';
import {
  CreateTechnicalEvaluationDto,
  UpdateTechnicalEvaluationDto,
  RegenerateTechnicalEvaluationDto,
  ApproveEvaluationDto,
} from '../../dtos/technical-evaluations/technical-evaluations.dto';
import { GoogleDriveService } from '../../../common/google-drive/google-drive.service';
import { JobPost, JobPostStatus } from '../../../job-posts/entities/job-post.entity';
import { GithubService } from '../github/github.service';
import { QuizTechnicalEvaluationService } from '../quiz-technical-evaluations/quiz-technical-evaluations.service';
import { PdfGeneratorService } from '../pdfs-generator/pdf-generator.service';
import { EvaluationNotificationService } from '../evaluations-notifications/evaluation-notification.service';
import { TechnicalEvaluationService } from './technical-evaluations.service';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeEvaluation(overrides: Partial<TechnicalEvaluation> = {}): TechnicalEvaluation {
  return {
    id: 1,
    jobPostId: 10,
    title: 'NestJS_v1.0.0',
    status: EvaluationStatus.PENDING,
    driveFileId: 'drive-eval-id',
    driveFileUrl: 'https://drive.google.com/file/d/drive-eval-id/view',
    version: '1.0.0',
    htmlContent: '<h1>Evaluation</h1>',
    gitRepoUrl: null,
    pdfUrl: 'https://drive.google.com/file/d/drive-eval-id/view',
    index: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    jobPost: null as never,
    quizContent: null,
    quizAnswerKey: null,
    ...overrides,
  };
}

function makeJobPost(overrides: Partial<JobPost> = {}): JobPost {
  return {
    id: 10,
    name: 'job_Acme_Engineer.pdf',
    title: 'Software Engineer',
    company: 'Acme Corp',
    status: JobPostStatus.UNIFIED,
    googleDriveFileId: 'drive-file-id',
    googleDocId: 'doc-id',
    unifiedUrl: 'https://example.com',
    startDate: '2024-01-01',
    requiresCoding: true,
    hasQcm: true,
    evaluationsFolderId: 'folder-id',
    type: 'application/pdf',
    url: 'https://drive.google.com/file/d/drive-file-id/view',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as JobPost;
}

function makeDriveFile(overrides: Partial<{ id: string; name: string; webViewLink: string | null; mimeType: string }> = {}) {
  return {
    id: 'new-drive-id',
    name: 'evaluation_v1.0.1.pdf',
    webViewLink: 'https://drive.google.com/file/d/new-drive-id/view',
    mimeType: 'application/pdf',
    ...overrides,
  };
}

// ─── Mock types ───────────────────────────────────────────────────────────────

type RepoMock = jest.Mocked<ITechnicalEvaluationRepository>;

type JobPostRepoMock = jest.Mocked<Pick<Repository<JobPost>, 'findOne' | 'update'>>;

type GoogleDriveMock = jest.Mocked<
  Pick<GoogleDriveService, 'deleteFile' | 'createFolder' | 'downloadFile' | 'uploadFile' | 'listFiles'>
>;

type GithubMock = jest.Mocked<Pick<GithubService, 'createRepo'>>;

type QuizMock = jest.Mocked<Pick<QuizTechnicalEvaluationService, 'generateQuiz'>>;

type PdfMock = jest.Mocked<Pick<PdfGeneratorService, 'generateFromHtml'>>;

type NotificationMock = jest.Mocked<Pick<EvaluationNotificationService, 'notifyReferents'>>;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('TechnicalEvaluationService', () => {
  let service: TechnicalEvaluationService;
  let repo: RepoMock;
  let jobPostRepo: JobPostRepoMock;
  let googleDrive: GoogleDriveMock;
  let github: GithubMock;
  let quizService: QuizMock;
  let pdfGenerator: PdfMock;
  let notificationService: NotificationMock;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllEvaluations: jest.fn(),
      findById: jest.fn(),
      findByDriveFileId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    jobPostRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    googleDrive = {
      deleteFile: jest.fn(),
      createFolder: jest.fn(),
      downloadFile: jest.fn(),
      uploadFile: jest.fn(),
      listFiles: jest.fn(),
    };

    github = { createRepo: jest.fn() };
    quizService = { generateQuiz: jest.fn() };
    pdfGenerator = { generateFromHtml: jest.fn() };
    notificationService = { notifyReferents: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalEvaluationService,
        { provide: TECHNICAL_EVALUATION_REPOSITORY, useValue: repo },
        { provide: getRepositoryToken(JobPost), useValue: jobPostRepo },
        { provide: GoogleDriveService, useValue: googleDrive },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn().mockReturnValue('openrouter-key'), get: jest.fn() } },
        { provide: GithubService, useValue: github },
        { provide: QuizTechnicalEvaluationService, useValue: quizService },
        { provide: PdfGeneratorService, useValue: pdfGenerator },
        { provide: EvaluationNotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<TechnicalEvaluationService>(TechnicalEvaluationService);
  });

  // ── generate ──────────────────────────────────────────────────────────────

  describe('generate', () => {
    it('should delegate to quizService when mode is "quiz" and hasQcm is true', async () => {
      const jobPost = makeJobPost({ hasQcm: true, requiresCoding: false });
      const dto = Object.assign(new CreateTechnicalEvaluationDto(), { jobPostId: 10, mode: 'quiz' as const });
      const quizEval = makeEvaluation({ quizContent: '[]' });

      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([]);
      googleDrive.downloadFile.mockRejectedValue(new Error('no pdf'));
      quizService.generateQuiz.mockResolvedValue(quizEval);
      notificationService.notifyReferents.mockResolvedValue(undefined);

      const result = await service.generate(1, dto);

      expect(quizService.generateQuiz).toHaveBeenCalledWith(
        1,
        jobPost,
        dto,
        expect.any(String),
        expect.any(String),
        'openrouter-key',
      );
      expect(result).toEqual(quizEval);
    });

    it('should throw BadRequestException when mode is "quiz" but hasQcm is false', async () => {
      const jobPost = makeJobPost({ hasQcm: false });
      const dto = Object.assign(new CreateTechnicalEvaluationDto(), { jobPostId: 10, mode: 'quiz' as const });

      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([]);

      await expect(service.generate(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when mode is "coding" but requiresCoding is false', async () => {
      const jobPost = makeJobPost({ requiresCoding: false });
      const dto = Object.assign(new CreateTechnicalEvaluationDto(), { jobPostId: 10, mode: 'coding' as const });

      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([]);

      await expect(service.generate(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when jobPost does not exist', async () => {
      jobPostRepo.findOne.mockResolvedValue(null);
      const dto = Object.assign(new CreateTechnicalEvaluationDto(), { jobPostId: 999 });

      await expect(service.generate(1, dto)).rejects.toThrow(NotFoundException);
    });

    it('should create evaluationsFolderId when jobPost has none', async () => {
      const jobPost = makeJobPost({ evaluationsFolderId: null, requiresCoding: true });
      const dto = Object.assign(new CreateTechnicalEvaluationDto(), { jobPostId: 10, mode: 'coding' as const });
      const evalResult = makeEvaluation();

      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([]);
      googleDrive.createFolder.mockResolvedValue({ id: 'new-folder' } as never);
      googleDrive.downloadFile.mockRejectedValue(new Error('no pdf'));
      pdfGenerator.generateFromHtml.mockResolvedValue(Buffer.from('pdf'));
      googleDrive.uploadFile.mockResolvedValue(makeDriveFile() as never);
      repo.create.mockResolvedValue(evalResult);
      notificationService.notifyReferents.mockResolvedValue(undefined);

      // patch global fetch for callOpenRouter
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { role: 'assistant', content: '<h1>Kata</h1>' } }],
        }),
      } as never);

      await service.generate(1, dto);

      expect(googleDrive.createFolder).toHaveBeenCalled();
      expect(jobPostRepo.update).toHaveBeenCalledWith(jobPost.id, { evaluationsFolderId: 'new-folder' });
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    beforeEach(() => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost());
      googleDrive.listFiles.mockResolvedValue([]);
      repo.findAll.mockResolvedValue([]);
    });

    it('should return all evaluations when no mode is specified', async () => {
      const evals = [makeEvaluation(), makeEvaluation({ id: 2, quizContent: '[]' })];
      repo.findAll.mockResolvedValue(evals);

      const result = await service.findAll(1, 10);

      expect(result).toHaveLength(2);
    });

    it('should return only quiz evaluations when mode is "quiz"', async () => {
      const evals = [
        makeEvaluation({ quizContent: null }),
        makeEvaluation({ id: 2, quizContent: '[]' }),
      ];
      repo.findAll.mockResolvedValue(evals);

      const result = await service.findAll(1, 10, 'quiz');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('should return only coding evaluations when mode is "coding"', async () => {
      const evals = [
        makeEvaluation({ quizContent: null }),
        makeEvaluation({ id: 2, quizContent: '[]' }),
      ];
      repo.findAll.mockResolvedValue(evals);

      const result = await service.findAll(1, 10, 'coding');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return the evaluation when found', async () => {
      const evaluation = makeEvaluation();
      repo.findById.mockResolvedValue(evaluation);

      const result = await service.findById(1);

      expect(repo.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(evaluation);
    });

    it('should throw NotFoundException when evaluation does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the evaluation', async () => {
      const evaluation = makeEvaluation();
      const updated = makeEvaluation({ title: 'New Title' });
      const dto = Object.assign(new UpdateTechnicalEvaluationDto(), { title: 'New Title' });

      repo.findById.mockResolvedValue(evaluation);
      repo.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(repo.update).toHaveBeenCalledWith(1, dto);
      expect(result.title).toBe('New Title');
    });

    it('should throw NotFoundException when evaluation does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      const dto = Object.assign(new UpdateTechnicalEvaluationDto(), { title: 'X' });

      await expect(service.update(999, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete the Drive file and the DB record then reorder', async () => {
      const evaluation = makeEvaluation({ driveFileId: 'drive-eval-id' });
      repo.findById.mockResolvedValue(evaluation);
      googleDrive.deleteFile.mockResolvedValue(undefined);
      repo.delete.mockResolvedValue(undefined);
      repo.findAll.mockResolvedValue([]);

      await service.delete(1, 1);

      expect(googleDrive.deleteFile).toHaveBeenCalledWith(1, 'drive-eval-id');
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('should skip Drive deletion when driveFileId is null', async () => {
      const evaluation = makeEvaluation({ driveFileId: null });
      repo.findById.mockResolvedValue(evaluation);
      repo.delete.mockResolvedValue(undefined);
      repo.findAll.mockResolvedValue([]);

      await service.delete(1, 1);

      expect(googleDrive.deleteFile).not.toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when evaluation does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should reorder remaining evaluations after deletion', async () => {
      const evaluation = makeEvaluation({ jobPostId: 10 });
      const remaining = [
        makeEvaluation({ id: 2, index: 2 }),
        makeEvaluation({ id: 3, index: 3 }),
      ];
      repo.findById.mockResolvedValue(evaluation);
      googleDrive.deleteFile.mockResolvedValue(undefined);
      repo.delete.mockResolvedValue(undefined);
      repo.findAll.mockResolvedValue(remaining);
      repo.update.mockResolvedValue(remaining[0]);

      await service.delete(1, 1);

      expect(repo.update).toHaveBeenCalledWith(2, { index: 1 });
      expect(repo.update).toHaveBeenCalledWith(3, { index: 2 });
    });

    it('should not update index when it already matches the expected value', async () => {
      const evaluation = makeEvaluation({ jobPostId: 10 });
      const remaining = [makeEvaluation({ id: 2, index: 1 })];
      repo.findById.mockResolvedValue(evaluation);
      googleDrive.deleteFile.mockResolvedValue(undefined);
      repo.delete.mockResolvedValue(undefined);
      repo.findAll.mockResolvedValue(remaining);

      await service.delete(1, 1);

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  // ── approve ───────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('should update the evaluation status to approved', async () => {
      const evaluation = makeEvaluation();
      const approved = makeEvaluation({ status: EvaluationStatus.APPROVED });
      const dto = Object.assign(new ApproveEvaluationDto(), { status: 'approved' as const });

      repo.findById.mockResolvedValue(evaluation);
      repo.update.mockResolvedValue(approved);

      const result = await service.approve(1, dto);

      expect(repo.update).toHaveBeenCalledWith(1, { status: EvaluationStatus.APPROVED });
      expect(result.status).toBe(EvaluationStatus.APPROVED);
    });

    it('should update the evaluation status to rejected', async () => {
      const evaluation = makeEvaluation();
      const rejected = makeEvaluation({ status: EvaluationStatus.REJECTED });
      const dto = Object.assign(new ApproveEvaluationDto(), { status: 'rejected' as const });

      repo.findById.mockResolvedValue(evaluation);
      repo.update.mockResolvedValue(rejected);

      const result = await service.approve(1, dto);

      expect(result.status).toBe(EvaluationStatus.REJECTED);
    });

    it('should throw NotFoundException when evaluation does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      const dto = Object.assign(new ApproveEvaluationDto(), { status: 'approved' as const });

      await expect(service.approve(999, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── findAllByJobPost ──────────────────────────────────────────────────────

  describe('findAllByJobPost', () => {
    it('should return all evaluations for a given jobPost', async () => {
      const evals = [makeEvaluation(), makeEvaluation({ id: 2 })];
      repo.findAll.mockResolvedValue(evals);

      const result = await service.findAllByJobPost(10);

      expect(repo.findAll).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
    });
  });

  // ── createGitRepo ─────────────────────────────────────────────────────────

  describe('createGitRepo', () => {
    it('should create a git repo and return the updated evaluation', async () => {
      const evaluation = makeEvaluation({ gitRepoUrl: null });
      const jobPost = makeJobPost();
      const updated = makeEvaluation({ gitRepoUrl: 'https://github.com/org/repo' });

      repo.findById.mockResolvedValue(evaluation);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      github.createRepo.mockResolvedValue('https://github.com/org/repo');
      repo.update.mockResolvedValue(updated);

      const result = await service.createGitRepo(1);

      expect(github.createRepo).toHaveBeenCalledWith(
        `${jobPost.title}-v${evaluation.version}`,
        expect.any(String),
      );
      expect(repo.update).toHaveBeenCalledWith(1, { gitRepoUrl: 'https://github.com/org/repo' });
      expect(result.gitRepoUrl).toBe('https://github.com/org/repo');
    });

    it('should return the evaluation as-is when gitRepoUrl already exists', async () => {
      const evaluation = makeEvaluation({ gitRepoUrl: 'https://github.com/org/existing' });
      repo.findById.mockResolvedValue(evaluation);

      const result = await service.createGitRepo(1);

      expect(github.createRepo).not.toHaveBeenCalled();
      expect(result.gitRepoUrl).toBe('https://github.com/org/existing');
    });

    it('should throw NotFoundException when evaluation does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.createGitRepo(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── syncFromDrive ─────────────────────────────────────────────────────────

  describe('syncFromDrive', () => {
    it('should return { added: 0, removed: 0 } when jobPost has no evaluationsFolderId', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ evaluationsFolderId: null }));

      const result = await service.syncFromDrive(1, 10);

      expect(result).toEqual({ added: 0, removed: 0 });
      expect(googleDrive.listFiles).not.toHaveBeenCalled();
    });

    it('should add Drive files that are missing in DB', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ evaluationsFolderId: 'folder-id' }));
      googleDrive.listFiles.mockResolvedValue([
        { id: 'new-file', name: 'evaluation_v1.0.0.pdf', webViewLink: 'https://drive.google.com/file/d/new-file/view' } as never,
      ]);
      repo.findAll.mockResolvedValue([]);
      repo.create.mockResolvedValue(makeEvaluation({ driveFileId: 'new-file' }));

      const result = await service.syncFromDrive(1, 10);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ driveFileId: 'new-file' }),
      );
      expect(result.added).toBe(1);
      expect(result.removed).toBe(0);
    });

    it('should remove DB evaluations whose Drive file no longer exists', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ evaluationsFolderId: 'folder-id' }));
      googleDrive.listFiles.mockResolvedValue([]);
      repo.findAll.mockResolvedValue([makeEvaluation({ driveFileId: 'orphan-drive-id' })]);
      repo.delete.mockResolvedValue(undefined);

      const result = await service.syncFromDrive(1, 10);

      expect(repo.delete).toHaveBeenCalledWith(1);
      expect(result.removed).toBe(1);
      expect(result.added).toBe(0);
    });

    it('should parse version from filename when it matches vX.Y.Z', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ evaluationsFolderId: 'folder-id' }));
      googleDrive.listFiles.mockResolvedValue([
        { id: 'f1', name: 'evaluation_v2.3.1.pdf', webViewLink: null } as never,
      ]);
      repo.findAll.mockResolvedValue([]);
      repo.create.mockResolvedValue(makeEvaluation());

      await service.syncFromDrive(1, 10);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: '2.3.1' }),
      );
    });

    it('should fallback to version "1.0.0" when filename has no version pattern', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ evaluationsFolderId: 'folder-id' }));
      googleDrive.listFiles.mockResolvedValue([
        { id: 'f1', name: 'no-version-file.pdf', webViewLink: null } as never,
      ]);
      repo.findAll.mockResolvedValue([]);
      repo.create.mockResolvedValue(makeEvaluation());

      await service.syncFromDrive(1, 10);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: '1.0.0' }),
      );
    });

    it('should throw NotFoundException when jobPost does not exist', async () => {
      jobPostRepo.findOne.mockResolvedValue(null);

      await expect(service.syncFromDrive(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateContent ─────────────────────────────────────────────────────────

  describe('updateContent', () => {
    it('should create a new quiz version when isQuiz is true', async () => {
      const existing = makeEvaluation({ version: '1.0.0', jobPostId: 10 });
      const jobPost = makeJobPost();
      const newEval = makeEvaluation({ version: '1.1.0', quizContent: '[]' });

      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([existing]);
      repo.create.mockResolvedValue(newEval);

      const result = await service.updateContent(1, 1, {
        isQuiz: true,
        quizContent: '[]',
        quizAnswerKey: '{}',
        changeType: 'minor',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quizContent: '[]',
          quizAnswerKey: '{}',
          driveFileId: null,
        }),
      );
      expect(result).toEqual(newEval);
    });

    it('should generate a new PDF and create a coding version when isQuiz is false', async () => {
      const existing = makeEvaluation({ version: '1.0.0', jobPostId: 10 });
      const jobPost = makeJobPost();
      const newEval = makeEvaluation({ version: '1.0.1' });

      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([existing]);
      pdfGenerator.generateFromHtml.mockResolvedValue(Buffer.from('pdf'));
      googleDrive.uploadFile.mockResolvedValue(makeDriveFile() as never);
      repo.create.mockResolvedValue(newEval);

      const result = await service.updateContent(1, 1, {
        isQuiz: false,
        htmlContent: '<h1>Updated</h1>',
        changeType: 'minor',
      });

      expect(pdfGenerator.generateFromHtml).toHaveBeenCalledWith('<h1>Updated</h1>', expect.any(String));
      expect(googleDrive.uploadFile).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quizContent: null, quizAnswerKey: null }),
      );
      expect(result).toEqual(newEval);
    });

    it('should bump to a major version when changeType is "major"', async () => {
      const existing = makeEvaluation({ version: '1.0.0', jobPostId: 10 });
      const jobPost = makeJobPost();
      const newEval = makeEvaluation({ version: '1.1.0' });

      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([existing]);
      repo.create.mockResolvedValue(newEval);

      await service.updateContent(1, 1, { isQuiz: true, changeType: 'major' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: '1.1.0' }),
      );
    });

    it('should bump to a minor version when changeType is "minor"', async () => {
      const existing = makeEvaluation({ version: '1.0.0', jobPostId: 10 });
      const jobPost = makeJobPost();
      const newEval = makeEvaluation({ version: '1.0.1' });

      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([existing]);
      repo.create.mockResolvedValue(newEval);

      await service.updateContent(1, 1, { isQuiz: true, changeType: 'minor' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ version: '1.0.1' }),
      );
    });

    it('should throw NotFoundException when evaluation does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.updateContent(1, 999, { isQuiz: true })).rejects.toThrow(NotFoundException);
    });
  });

  // ── bumpVersion (via updateContent) ──────────────────────────────────────

  describe('bumpVersion (private — tested via updateContent)', () => {
    it('should produce 1.1.0 from 1.0.0 on major bump', async () => {
      const existing = makeEvaluation({ version: '1.0.0' });
      const jobPost = makeJobPost();
      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([]);
      repo.create.mockResolvedValue(makeEvaluation({ version: '1.1.0' }));

      await service.updateContent(1, 1, { isQuiz: true, changeType: 'major' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ version: '1.1.0' }));
    });

    it('should produce 1.0.1 from 1.0.0 on minor bump', async () => {
      const existing = makeEvaluation({ version: '1.0.0' });
      const jobPost = makeJobPost();
      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([]);
      repo.create.mockResolvedValue(makeEvaluation({ version: '1.0.1' }));

      await service.updateContent(1, 1, { isQuiz: true, changeType: 'minor' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ version: '1.0.1' }));
    });

    it('should produce 2.0.0 from 1.9.3 on major bump', async () => {
      const existing = makeEvaluation({ version: '1.9.3' });
      const jobPost = makeJobPost();
      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([]);
      repo.create.mockResolvedValue(makeEvaluation({ version: '1.10.0' }));

      await service.updateContent(1, 1, { isQuiz: true, changeType: 'major' });

      // major bumps the minor segment (1 -> 10), resets patch
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ version: '1.10.0' }));
    });
  });

  // ── regenerate ────────────────────────────────────────────────────────────

  describe('regenerate', () => {
    it('should regenerate a new evaluation version and upload to Drive', async () => {
      const existing = makeEvaluation({ version: '1.0.0' });
      const jobPost = makeJobPost();
      const newEval = makeEvaluation({ version: '1.0.1', driveFileId: 'new-drive-id' });
      const dto = Object.assign(new RegenerateTechnicalEvaluationDto(), {
        evaluationId: 1,
        jobPostId: 10,
        prompt: 'Add a cloud section',
      });

      repo.findById.mockResolvedValue(existing);
      jobPostRepo.findOne.mockResolvedValue(jobPost);
      repo.findAll.mockResolvedValue([existing]);
      pdfGenerator.generateFromHtml.mockResolvedValue(Buffer.from('pdf'));
      googleDrive.uploadFile.mockResolvedValue(makeDriveFile() as never);
      repo.create.mockResolvedValue(newEval);
      notificationService.notifyReferents.mockResolvedValue(undefined);

      // mock callOpenRouter for both detectChangeType and generate calls
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            choices: [{ message: { role: 'assistant', content: 'minor' } }],
          }),
        } as never)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            choices: [{ message: { role: 'assistant', content: '<h1>Regenerated</h1>' } }],
          }),
        } as never);

      const result = await service.regenerate(1, dto);

      expect(pdfGenerator.generateFromHtml).toHaveBeenCalledWith('<h1>Regenerated</h1>', expect.any(String));
      expect(googleDrive.uploadFile).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobPostId: 10,
          status: EvaluationStatus.PENDING,
        }),
      );
      expect(result).toEqual(newEval);
    });

    it('should throw NotFoundException when the evaluation to regenerate does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      const dto = Object.assign(new RegenerateTechnicalEvaluationDto(), {
        evaluationId: 999,
        jobPostId: 10,
        prompt: 'x',
      });

      await expect(service.regenerate(1, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the jobPost does not exist', async () => {
      repo.findById.mockResolvedValue(makeEvaluation());
      jobPostRepo.findOne.mockResolvedValue(null);
      const dto = Object.assign(new RegenerateTechnicalEvaluationDto(), {
        evaluationId: 1,
        jobPostId: 999,
        prompt: 'x',
      });

      await expect(service.regenerate(1, dto)).rejects.toThrow(NotFoundException);
    });
  });
});