import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { CandidateService } from './candidate.service';
import { Candidate, ResumeStatus } from '../entities/candidate.entity';
import { CANDIDATE_REPOSITORY } from '../interfaces/candidate-repository.interface';
import {
  DriveFile,
  GoogleDriveService,
} from '../../common/google-drive/google-drive.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { N8nWorkflowService } from '../../common/workflows/n8n-workflow.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';

type RepoMock = {
  create: jest.Mock<Promise<Candidate>, [Partial<Candidate>]>;
  findAll: jest.Mock<Promise<PaginatedResult<Candidate>>, [number, number]>;
  findBy: jest.Mock<Promise<Candidate | null>, [FindOptionsWhere<Candidate>]>;
  deleteBy: jest.Mock<Promise<void>, [FindOptionsWhere<Candidate>]>;
  save: jest.Mock<Promise<Candidate>, [Candidate]>;
  updateStatus: jest.Mock<Promise<Candidate>, [string, ResumeStatus]>;
  updateUnifie: jest.Mock<
    Promise<Candidate>,
    [
      string,
      {
        unifieDriveId: string;
        unifieDriveName: string;
        unifieDriveLink: string;
        status: ResumeStatus;
        email?: string | null;
        githubUsername?: string | null;
      },
    ]
  >;
};

type DriveMock = {
  uploadFile: jest.Mock<
    Promise<DriveFile>,
    [number, Express.Multer.File, string]
  >;
  shareFileWithUser: jest.Mock<Promise<void>, [number, string, string]>;
  shareWithAll: jest.Mock<Promise<void>, [number, string]>;
  listFiles: jest.Mock<Promise<DriveFile[]>, [number, string]>;
  deleteFile: jest.Mock<Promise<void>, [number, string]>;
};

type N8nWorkflowMock = {
  triggerCandidateUnification: jest.Mock;
};

type UsersMock = {
  getAllEmailsExcept: jest.Mock<Promise<string[]>, [number]>;
};

const candidate = (overrides?: Partial<Candidate>): Candidate => ({
  id: 'c1',
  brutDriveId: 'b1',
  brutDriveName: 'resume.pdf',
  brutDriveLink: 'b-link',
  name: 'Doe',
  firstName: 'John',
  unifieDriveId: '',
  unifieDriveName: '',
  unifieDriveLink: '',
  email: '',
  githubUsername: '',
  status: ResumeStatus.PENDING,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

const multerFile = (): Express.Multer.File =>
  ({
    fieldname: 'file',
    originalname: 'resume.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 123,
    destination: '',
    filename: 'resume.pdf',
    path: '/tmp/resume.pdf',
    buffer: Buffer.from('x'),
    stream: process.stdin,
  }) as Express.Multer.File;

describe('CandidateService', () => {
  let service: CandidateService;

  const repo: RepoMock = {
    create: jest.fn<Promise<Candidate>, [Partial<Candidate>]>(),
    findAll: jest.fn<Promise<PaginatedResult<Candidate>>, [number, number]>(),
    findBy: jest.fn<Promise<Candidate | null>, [FindOptionsWhere<Candidate>]>(),
    deleteBy: jest.fn<Promise<void>, [FindOptionsWhere<Candidate>]>(),
    save: jest.fn<Promise<Candidate>, [Candidate]>(),
    updateStatus: jest.fn<Promise<Candidate>, [string, ResumeStatus]>(),
    updateUnifie: jest.fn<
      Promise<Candidate>,
      [
        string,
        {
          unifieDriveId: string;
          unifieDriveName: string;
          unifieDriveLink: string;
          status: ResumeStatus;
          email?: string | null;
          githubUsername?: string | null;
        },
      ]
    >(),
  };

  const drive: DriveMock = {
    uploadFile: jest.fn<
      Promise<DriveFile>,
      [number, Express.Multer.File, string]
    >(),
    shareFileWithUser: jest.fn<Promise<void>, [number, string, string]>(),
    shareWithAll: jest.fn<Promise<void>, [number, string]>(),
    listFiles: jest.fn<Promise<DriveFile[]>, [number, string]>(),
    deleteFile: jest.fn<Promise<void>, [number, string]>(),
  };

  const n8nWorkflow: N8nWorkflowMock = {
    triggerCandidateUnification: jest.fn(),
  };

  const usersService: UsersMock = {
    getAllEmailsExcept: jest.fn<Promise<string[]>, [number]>(),
  };

  const config = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateService,
        { provide: CANDIDATE_REPOSITORY, useValue: repo },
        { provide: GoogleDriveService, useValue: drive },
        { provide: N8nWorkflowService, useValue: n8nWorkflow },
        { provide: ConfigService, useValue: config },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<CandidateService>(CandidateService);

    jest
      .spyOn(
        service as unknown as {
          extraireTexte: (file: Express.Multer.File) => Promise<string>;
        },
        'extraireTexte',
      )
      .mockResolvedValue('resume text');

    jest
      .spyOn(
        service as unknown as {
          extraireIdentite: (
            texteCV: string,
          ) => Promise<{ name: string; firstName: string }>;
        },
        'extraireIdentite',
      )
      .mockResolvedValue({ name: 'Doe', firstName: 'John' });

    usersService.getAllEmailsExcept.mockResolvedValue([]);
    drive.shareWithAll.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  it('is defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  describe('uploadResumeBrut()', () => {
    it('uploads then creates candidate', async () => {
      drive.uploadFile.mockResolvedValue({
        id: 'd1',
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'drive-link',
      });
      usersService.getAllEmailsExcept.mockResolvedValue([
        'a@example.com',
        'b@example.com',
      ]);
      drive.shareFileWithUser.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(candidate());

      const result = await service.uploadResumeBrut(1, multerFile(), 'folder');

      expect(drive.uploadFile).toHaveBeenCalledWith(
        1,
        expect.any(Object),
        'folder',
      );
      expect(repo.create).toHaveBeenCalledWith({
        name: 'Doe',
        firstName: 'John',
        brutDriveId: 'd1',
        brutDriveName: 'resume.pdf',
        brutDriveLink: 'drive-link',
        status: ResumeStatus.PENDING,
      });
      expect(usersService.getAllEmailsExcept).toHaveBeenCalledWith(1);
      expect(drive.shareFileWithUser).toHaveBeenCalledTimes(2);
      expect(drive.shareFileWithUser).toHaveBeenCalledWith(
        1,
        'd1',
        'a@example.com',
      );
      expect(drive.shareFileWithUser).toHaveBeenCalledWith(
        1,
        'd1',
        'b@example.com',
      );
      expect(result.id).toBe('c1');
    });

    it('sets empty link when webViewLink is undefined', async () => {
      drive.uploadFile.mockResolvedValue({
        id: 'd1',
        name: 'resume.pdf',
        mimeType: 'application/pdf',
      });
      drive.shareFileWithUser.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(candidate());

      await service.uploadResumeBrut(1, multerFile(), 'folder');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          brutDriveName: 'resume.pdf',
          brutDriveLink: '',
        }),
      );
    });

    it('shares with other users after upload', async () => {
      drive.uploadFile.mockResolvedValue({
        id: 'd2',
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'link',
      });
      usersService.getAllEmailsExcept.mockResolvedValue(['x@example.com']);
      drive.shareFileWithUser.mockResolvedValue(undefined);
      repo.create.mockResolvedValue(candidate());

      await service.uploadResumeBrut(1, multerFile(), 'folder');

      const shareOrder = drive.shareFileWithUser.mock.invocationCallOrder[0];
      const createOrder = repo.create.mock.invocationCallOrder[0];
      expect(shareOrder).toBeLessThan(createOrder);
    });
  });

  // -------------------------------------------------------------------------
  describe('findAll()', () => {
    it('delegates to repository', async () => {
      const pageData: PaginatedResult<Candidate> = {
        data: [candidate()],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      repo.findAll.mockResolvedValue(pageData);

      const result = await service.findAll(1, 10);

      expect(result).toEqual(pageData);
      expect(repo.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  // -------------------------------------------------------------------------
  describe('listResumes()', () => {
    it('prefers unifie when both exist', async () => {
      repo.findAll.mockResolvedValue({
        data: [candidate({ unifieDriveId: 'u1', unifieDriveName: 'u.pdf' })],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.listResumes(1, 10);
      const first = result.data[0];

      expect(result.data).toHaveLength(1);
      expect(first.type).toBe('unifie');
      expect(first.hasUnifie).toBe(true);
    });

    it('handles defaults for optional names/links', async () => {
      repo.findAll.mockResolvedValue({
        data: [
          candidate({ brutDriveName: '', unifieDriveId: '' }),
          candidate({
            id: 'c2',
            unifieDriveId: 'u2',
            unifieDriveName: '',
            unifieDriveLink: undefined as never as string,
          }),
        ],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      const result = await service.listResumes(1, 10);
      const first = result.data[0];
      const second = result.data[1];

      expect(first.name).toBe('CV brut');
      expect(second.name).toBe('CV unifié');
      expect(second.driveLink).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  describe('listDriveFiles()', () => {
    it('delegates to drive service', async () => {
      drive.listFiles.mockResolvedValue([
        { id: 'f1', name: 'resume.pdf', mimeType: 'application/pdf' },
      ]);

      const result = await service.listDriveFiles(7, 'folder');

      expect(result).toHaveLength(1);
      expect(drive.listFiles).toHaveBeenCalledWith(7, 'folder');
    });
  });

  // -------------------------------------------------------------------------
  describe('deleteResume()', () => {
    it('throws when candidate not found', async () => {
      repo.findBy.mockResolvedValue(null);
      await expect(service.deleteResume(1, 'id', 'brut')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removes file then saves when one version remains', async () => {
      repo.findBy.mockResolvedValue(
        candidate({ id: 'id', brutDriveId: 'b1', unifieDriveId: 'u1' }),
      );
      repo.save.mockResolvedValue(candidate());

      await service.deleteResume(2, 'id', 'brut');

      expect(drive.deleteFile).toHaveBeenCalledWith(2, 'b1');
      expect(repo.save).toHaveBeenCalled();
      expect(repo.deleteBy).not.toHaveBeenCalled();
    });

    it('deletes candidate when no file remains', async () => {
      repo.findBy.mockResolvedValue(
        candidate({ id: 'id', brutDriveId: 'b1', unifieDriveId: '' }),
      );

      await service.deleteResume(2, 'id', 'brut');

      expect(repo.deleteBy).toHaveBeenCalledWith({ id: 'id' });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('deletes unifie and brut when type is unifie', async () => {
      repo.findBy.mockResolvedValue(
        candidate({ id: 'id', brutDriveId: 'b1', unifieDriveId: 'u1' }),
      );

      await service.deleteResume(2, 'id', 'unifie');

      expect(drive.deleteFile).toHaveBeenNthCalledWith(1, 2, 'u1');
      expect(drive.deleteFile).toHaveBeenNthCalledWith(2, 2, 'b1');
      expect(repo.deleteBy).toHaveBeenCalledWith({ id: 'id' });
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('triggerUnification()', () => {
    it('rebuilds identity from brut filename when missing', async () => {
      repo.findBy.mockResolvedValue(
        candidate({
          id: 'id',
          brutDriveId: 'b1',
          brutDriveName: 'doe_john_brut.pdf',
          name: '',
          firstName: '',
        }),
      );
      repo.save.mockResolvedValue(candidate());
      repo.updateStatus.mockResolvedValue(candidate());
      repo.updateUnifie.mockResolvedValue(candidate());
      n8nWorkflow.triggerCandidateUnification.mockResolvedValue({
        candidateId: 'id',
        document_id: 'doc-id',
        document_name: 'doc-name',
        document_url: 'doc-url',
        email: null,
        github_username: null,
      });

      await service.triggerUnification('id');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'doe', firstName: 'john' }),
      );
      expect(n8nWorkflow.triggerCandidateUnification).toHaveBeenCalledWith(
        'id',
        'b1',
        'doe',
        'john',
      );
    });

    it('throws when brut file is missing', async () => {
      repo.findBy.mockResolvedValue(candidate({ id: 'id', brutDriveId: '' }));

      await expect(service.triggerUnification('id')).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it('throws when identity remains missing after filename parsing', async () => {
      repo.findBy.mockResolvedValue(
        candidate({
          id: 'id',
          brutDriveId: 'b1',
          brutDriveName: 'resume.pdf',
          name: '',
          firstName: '',
        }),
      );

      await expect(service.triggerUnification('id')).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.updateStatus).not.toHaveBeenCalled();
      expect(n8nWorkflow.triggerCandidateUnification).not.toHaveBeenCalled();
    });

    it('sets PROCESSING then DONE on success', async () => {
      repo.findBy.mockResolvedValue(candidate({ id: 'id', brutDriveId: 'b1' }));
      repo.updateStatus.mockResolvedValue(candidate());
      repo.updateUnifie.mockResolvedValue(candidate());
      n8nWorkflow.triggerCandidateUnification.mockResolvedValue({
        candidateId: 'id',
        document_id: 'doc-id',
        document_name: 'doc-name',
        document_url: 'doc-url',
        email: null,
        github_username: null,
      });

      const result = await service.triggerUnification('id');

      expect(repo.updateStatus).toHaveBeenCalledWith(
        'id',
        ResumeStatus.PROCESSING,
      );
      expect(n8nWorkflow.triggerCandidateUnification).toHaveBeenCalledWith(
        'id',
        'b1',
        'Doe',
        'John',
      );
      // ✅ email: null ajouté pour correspondre à ce que le service envoie réellement
      expect(repo.updateUnifie).toHaveBeenCalledWith('id', {
        unifieDriveId: 'doc-id',
        unifieDriveName: 'doc-name',
        unifieDriveLink: 'doc-url',
        status: ResumeStatus.DONE,
        email: null,
        githubUsername: null,
      });
      expect(result.message).toContain('Unification');
    });

    it('sets ERROR and rethrows on failure', async () => {
      const err = new Error('n8n failure');
      repo.findBy.mockResolvedValue(candidate({ id: 'id', brutDriveId: 'b1' }));
      repo.updateStatus.mockResolvedValue(candidate());
      n8nWorkflow.triggerCandidateUnification.mockRejectedValue(err);

      await expect(service.triggerUnification('id')).rejects.toThrow(
        'n8n failure',
      );
      expect(repo.updateStatus).toHaveBeenNthCalledWith(
        1,
        'id',
        ResumeStatus.PROCESSING,
      );
      expect(repo.updateStatus).toHaveBeenNthCalledWith(
        2,
        'id',
        ResumeStatus.ERROR,
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('syncFromDrive()', () => {
    it('creates new brut, updates matching unifié, and returns count', async () => {
      repo.findAll.mockResolvedValue({
        data: [
          candidate({
            id: 'existing',
            brutDriveId: 'existing-brut',
            brutDriveName: 'John Doe_brut.docx',
          }),
        ],
        meta: { total: 1, page: 1, limit: 9999, totalPages: 1 },
      });
      drive.listFiles
        .mockResolvedValueOnce([
          {
            id: 'new-brut',
            name: 'Jane Doe.pdf',
            mimeType: 'application/pdf',
            webViewLink: 'b-link',
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'new-unifie',
            name: 'John Doe_unifie.docx',
            mimeType: 'application/pdf',
            webViewLink: 'u-link',
          },
        ]);
      repo.create.mockResolvedValue(candidate());
      repo.updateUnifie.mockResolvedValue(candidate());

      const count = await service.syncFromDrive(
        10,
        'brut-folder',
        'unifie-folder',
      );

      expect(count).toBe(2);
      expect(repo.create).toHaveBeenCalled();
      expect(repo.updateUnifie).toHaveBeenCalledWith('existing', {
        unifieDriveId: 'new-unifie',
        unifieDriveName: 'John Doe_unifie.docx',
        unifieDriveLink: 'u-link',
        status: ResumeStatus.DONE,
      });
    });

    it('does not create duplicates for already-known brut files', async () => {
      repo.findAll.mockResolvedValue({
        data: [candidate({ id: 'c1', brutDriveId: 'known-brut' })],
        meta: { total: 1, page: 1, limit: 9999, totalPages: 1 },
      });
      drive.listFiles
        .mockResolvedValueOnce([
          { id: 'known-brut', name: 'resume.pdf', mimeType: 'application/pdf' },
        ])
        .mockResolvedValueOnce([]);

      const count = await service.syncFromDrive(
        1,
        'brut-folder',
        'unifie-folder',
      );

      expect(repo.create).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });
  });
});
