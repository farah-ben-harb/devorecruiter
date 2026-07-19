import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from '../services/candidate.service';
import { CandidateDriveService } from '../services/candidate-drive.service';
import { Candidate, ResumeStatus } from '../entities/candidate.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import type { GoogleAuthenticatedUser } from '../../auth/interfaces/auth.interface';
import * as authRequestUtil from '../../common/utils/auth-request.util';
import { Readable } from 'stream';
import { AuthRequest } from '../../auth/interfaces/auth.interface';

// ─────────────────────────────
// Helpers STRICT TYPES
// ─────────────────────────────

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'candidate-1',
    email: 'john@example.com',
    githubUsername: 'john',
    status: ResumeStatus.PENDING,

    brutDriveId: null,
    brutDriveName: null,
    brutDriveLink: null,

    unifieDriveId: null,
    unifieDriveName: null,
    unifieDriveLink: null,

    name: null,
    firstName: null,

    createdAt: new Date(),
    updatedAt: new Date(),

    ...overrides,
  };
}

function makePaginatedResult<T>(items: T[]): PaginatedResult<T> {
  return {
    data: items,
    meta: {
      total: items.length,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };
}

function makeAuthRequest(
  userId: number,
  token: string | null = 'google-token',
): AuthRequest {
  return {
    user: {
      id: userId,
      googleAccessToken: token ?? '',
    } as GoogleAuthenticatedUser,
  } as AuthRequest;
}

function makeMulterFile(): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'cv.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('pdf-content'),
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: Readable.from(Buffer.from('pdf-content')),
  };
}

// ─────────────────────────────
// MOCKS STRICT
// ─────────────────────────────

const mockCandidateService: jest.Mocked<
  Pick<
    CandidateService,
    | 'findAll'
    | 'downloadFile'
    | 'listDriveFiles'
    | 'listResumes'
    | 'uploadResumeBrut'
    | 'triggerUnification'
    | 'deleteResume'
    | 'updateFields'
  >
> = {
  findAll: jest.fn(),
  downloadFile: jest.fn(),
  listDriveFiles: jest.fn(),
  listResumes: jest.fn(),
  uploadResumeBrut: jest.fn(),
  triggerUnification: jest.fn(),
  deleteResume: jest.fn(),
  updateFields: jest.fn(),
};

const mockCandidateDriveService: jest.Mocked<
  Pick<CandidateDriveService, 'syncFromDrive'>
> = {
  syncFromDrive: jest.fn(),
};

// ─────────────────────────────
// TEST SUITE
// ─────────────────────────────

describe('CandidateController', () => {
  let controller: CandidateController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateController],
      providers: [
        { provide: CandidateService, useValue: mockCandidateService },
        { provide: CandidateDriveService, useValue: mockCandidateDriveService },
      ],
    }).compile();

    controller = module.get<CandidateController>(CandidateController);
  });

  // ───────── findAll ─────────
  describe('findAll', () => {
    it('should return paginated candidates', async () => {
      const paginated = makePaginatedResult([makeCandidate()]);
      mockCandidateService.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result).toBe(paginated);
      expect(mockCandidateService.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  // ───────── uploadResumeBrut ─────────
  describe('uploadResumeBrut', () => {
    it('should throw if no file', () => {
      const req = makeAuthRequest(1);

      expect(() =>
        controller.uploadResumeBrut(undefined as never, req, 'folder-1'),
      ).toThrow(BadRequestException);
    });

    it('should throw if folderId missing', () => {
      const req = makeAuthRequest(1);
      const file = makeMulterFile();

      expect(() => controller.uploadResumeBrut(file, req, '')).toThrow(
        BadRequestException,
      );
    });

    it('should call service if valid', async () => {
      const req = makeAuthRequest(1);
      const file = makeMulterFile();
      const candidate = makeCandidate();

      jest
        .spyOn(authRequestUtil, 'requireGoogleAccessToken')
        .mockReturnValue(req.user as GoogleAuthenticatedUser);

      mockCandidateService.uploadResumeBrut.mockResolvedValue(candidate);

      const result = await controller.uploadResumeBrut(file, req, 'folder-1');

      expect(result).toBe(candidate);
      expect(mockCandidateService.uploadResumeBrut).toHaveBeenCalledWith(
        1,
        file,
        'folder-1',
      );
    });
  });

  // ───────── deleteResume ─────────
  describe('deleteResume', () => {
    it('should throw for invalid type', () => {
      const req = makeAuthRequest(1);

      expect(() =>
        controller.deleteResume('cand-1', 'invalid' as never, req),
      ).toThrow(BadRequestException);
    });

    it('should call service if valid', async () => {
      const req = makeAuthRequest(1);

      jest
        .spyOn(authRequestUtil, 'requireGoogleAccessToken')
        .mockReturnValue(req.user as GoogleAuthenticatedUser);

      mockCandidateService.deleteResume.mockResolvedValue();

      await controller.deleteResume('cand-1', 'brut', req);

      expect(mockCandidateService.deleteResume).toHaveBeenCalledWith(
        1,
        'cand-1',
        'brut',
      );
    });
  });

  // ───────── updateFields ─────────
  describe('updateFields', () => {
    it('should update candidate fields', async () => {
      const updated = makeCandidate({ githubUsername: 'new' });

      mockCandidateService.updateFields.mockResolvedValue(updated);

      const result = await controller.updateFields('1', {
        githubUsername: 'new',
      });

      expect(result).toBe(updated);
      expect(mockCandidateService.updateFields).toHaveBeenCalledWith('1', {
        githubUsername: 'new',
      });
    });
  });
});
