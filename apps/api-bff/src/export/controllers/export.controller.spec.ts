import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { ExportController } from './export.controller';
import { ExportService } from '../services/export.service';
import { UsersService } from '../../users/services/users.service';
import { JobPostService } from '../../job-posts/services/job-posts.service';
import { CandidateService } from '../../candidates/services/candidate.service';
import { UserRole } from '../../common/enums/user-role.enum';
import type {
  AuthRequest,
  GoogleAuthenticatedUser,
} from '../../auth/interfaces/auth.interface';
import {
  JobPost,
  JobPostStatus,
} from '../../job-posts/entities/job-post.entity';
import {
  Candidate,
  ResumeStatus,
} from '../../candidates/entities/candidate.entity';
import { User } from '../../users/entities/user.entity';

const mockExportService = () => ({
  exportUsersToExcel: jest.fn(),
  exportJobPostsToExcel: jest.fn(),
  exportJobPostsToZip: jest.fn(),
  exportCandidatesToExcel: jest.fn(),
  exportCandidatesToZip: jest.fn(),
});

const mockUsersService = () => ({
  findAll: jest.fn(),
});

const mockJobPostService = () => ({
  getAll: jest.fn(),
});

const mockCandidateService = () => ({
  findAll: jest.fn(),
});

const mockResponse = (): Partial<Response> => ({
  set: jest.fn(),
  end: jest.fn(),
});

const mockAuthReq = (token = 'google-token'): AuthRequest =>
  ({
    user: {
      id: 1,
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'RH',
      picture: '',
      roles: [UserRole.ADMIN_RH],
      isActivated: true,
      refreshToken: null,
      googleAccessToken: token,
      googleRefreshToken: null,
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-02'),
    } as GoogleAuthenticatedUser,
  }) as AuthRequest;

const mockUser = (): User =>
  ({
    id: 10,
    email: 'user@example.com',
    firstName: 'Sarah',
    lastName: 'Martin',
    picture: '',
    roles: [UserRole.ADMIN_RH],
    isActivated: true,
    refreshToken: null,
    googleAccessToken: null,
    googleRefreshToken: null,
    createdAt: new Date('2024-01-01'),
    lastLogin: new Date('2024-01-02'),
  }) as User;

const mockJobPost = (): JobPost =>
  ({
    id: 20,
    googleDriveFileId: 'drive-file-20',
    name: 'Fiche Poste Backend',
    type: 'application/pdf',
    url: 'https://example.com/raw',
    googleDocId: 'doc-20',
    unifiedUrl: 'https://example.com/unified',
    company: 'Acme',
    startDate: '2024-01-10',
    evaluationsFolderId: null,
    status: JobPostStatus.UNIFIED,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    title: 'Backend Engineer',
  }) as JobPost;

const mockCandidate = (): Candidate =>
  ({
    id: 'candidate-1',
    brutDriveId: 'resume-raw-1',
    brutDriveName: 'CV Raw',
    brutDriveLink: 'https://example.com/resume-raw',
    name: 'Dupont',
    firstName: 'Paul',
    unifieDriveId: 'resume-unified-1',
    unifieDriveName: 'CV Unified',
    unifieDriveLink: 'https://example.com/resume-unified',
    status: ResumeStatus.DONE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    email: 'paul@example.com',
  }) as Candidate;

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: jest.Mocked<ReturnType<typeof mockExportService>>;
  let usersService: jest.Mocked<ReturnType<typeof mockUsersService>>;
  let jobPostService: jest.Mocked<ReturnType<typeof mockJobPostService>>;
  let candidateService: jest.Mocked<ReturnType<typeof mockCandidateService>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        { provide: ExportService, useFactory: mockExportService },
        { provide: UsersService, useFactory: mockUsersService },
        { provide: JobPostService, useFactory: mockJobPostService },
        { provide: CandidateService, useFactory: mockCandidateService },
      ],
    }).compile();

    controller = module.get(ExportController);
    exportService = module.get(ExportService);
    usersService = module.get(UsersService);
    jobPostService = module.get(JobPostService);
    candidateService = module.get(CandidateService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should export users to Excel', async () => {
    const users = [mockUser()];
    const buffer = Buffer.from('users-xlsx');
    usersService.findAll.mockResolvedValue({ data: users } as never);
    exportService.exportUsersToExcel.mockResolvedValue(buffer);
    const res = mockResponse();

    await controller.exportUsers(res as Response);

    expect(usersService.findAll).toHaveBeenCalledWith(1, 9999);
    expect(exportService.exportUsersToExcel).toHaveBeenCalledWith(users);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': expect.stringContaining('utilisateurs_'),
        'Content-Length': String(buffer.length),
      }),
    );
    expect(res.end).toHaveBeenCalledWith(buffer);
  });

  it('should export job posts to Excel', async () => {
    const posts = [mockJobPost()];
    const buffer = Buffer.from('job-posts-xlsx');
    jobPostService.getAll.mockResolvedValue({ data: posts } as never);
    exportService.exportJobPostsToExcel.mockResolvedValue(buffer);
    const res = mockResponse();

    await controller.exportJobPostsExcel(res as Response);

    expect(jobPostService.getAll).toHaveBeenCalledWith(1, 9999);
    expect(exportService.exportJobPostsToExcel).toHaveBeenCalledWith(posts);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': expect.stringContaining('fiches_poste_'),
        'Content-Length': String(buffer.length),
      }),
    );
    expect(res.end).toHaveBeenCalledWith(buffer);
  });

  it('should export job posts to ZIP using the google user id', async () => {
    const posts = [mockJobPost()];
    const buffer = Buffer.from('job-posts-zip');
    jobPostService.getAll.mockResolvedValue({ data: posts } as never);
    exportService.exportJobPostsToZip.mockResolvedValue(buffer);
    const res = mockResponse();

    await controller.exportJobPostsZip(mockAuthReq(), res as Response);

    expect(jobPostService.getAll).toHaveBeenCalledWith(1, 9999);
    expect(exportService.exportJobPostsToZip).toHaveBeenCalledWith(posts, 1);
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/zip',
        'Content-Disposition': expect.stringContaining('fiches_poste_'),
        'Content-Length': String(buffer.length),
      }),
    );
    expect(res.end).toHaveBeenCalledWith(buffer);
  });

  it('should reject ZIP export when the google token is missing', async () => {
    await expect(
      controller.exportJobPostsZip(
        {
          user: { id: 1, googleAccessToken: null } as GoogleAuthenticatedUser,
        } as AuthRequest,
        mockResponse() as Response,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should export candidates to Excel', async () => {
    const candidates = [mockCandidate()];
    const buffer = Buffer.from('candidates-xlsx');
    candidateService.findAll.mockResolvedValue({ data: candidates } as never);
    exportService.exportCandidatesToExcel.mockResolvedValue(buffer);
    const res = mockResponse();

    await controller.exportCandidatesExcel(res as Response);

    expect(candidateService.findAll).toHaveBeenCalledWith(1, 9999);
    expect(exportService.exportCandidatesToExcel).toHaveBeenCalledWith(
      candidates,
    );
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': expect.stringContaining('candidats_'),
        'Content-Length': String(buffer.length),
      }),
    );
    expect(res.end).toHaveBeenCalledWith(buffer);
  });

  it('should export candidates to ZIP using the google user id', async () => {
    const candidates = [mockCandidate()];
    const buffer = Buffer.from('candidates-zip');
    candidateService.findAll.mockResolvedValue({ data: candidates } as never);
    exportService.exportCandidatesToZip.mockResolvedValue(buffer);
    const res = mockResponse();

    await controller.exportCandidatesZip(mockAuthReq(), res as Response);

    expect(candidateService.findAll).toHaveBeenCalledWith(1, 9999);
    expect(exportService.exportCandidatesToZip).toHaveBeenCalledWith(
      candidates,
      1,
    );
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Content-Type': 'application/zip',
        'Content-Disposition': expect.stringContaining('candidats_'),
        'Content-Length': String(buffer.length),
      }),
    );
    expect(res.end).toHaveBeenCalledWith(buffer);
  });
});
