import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { ExportService } from './export.service';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  JobPost,
  JobPostStatus,
} from '../../job-posts/entities/job-post.entity';
import {
  Candidate,
  ResumeStatus,
} from '../../candidates/entities/candidate.entity';
import { User } from '../../users/entities/user.entity';

const mockGoogleDriveService = () => ({
  downloadFile: jest.fn(),
});

const createBufferFromWorkbook = async (
  buffer: Uint8Array,
  sheetName: string,
) => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = Uint8Array.from(buffer).buffer;
  await workbook.xlsx.load(arrayBuffer);
  return workbook.getWorksheet(sheetName);
};

describe('ExportService', () => {
  let service: ExportService;
  let googleDriveService: jest.Mocked<
    ReturnType<typeof mockGoogleDriveService>
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: GoogleDriveService, useFactory: mockGoogleDriveService },
      ],
    }).compile();

    service = module.get(ExportService);
    googleDriveService = module.get(GoogleDriveService);
    googleDriveService.downloadFile.mockResolvedValue(
      Buffer.from('pdf content').toString('base64'),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should export users to Excel', async () => {
    const users: User[] = [
      {
        id: 1,
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Martin',
        picture: '',
        roles: [UserRole.ADMIN_RH],
        isActivated: true,
        refreshToken: null,
        googleAccessToken: null,
        googleRefreshToken: null,
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date('2024-01-02'),
      } as User,
    ];

    const buffer = await service.exportUsersToExcel(users);
    const sheet = await createBufferFromWorkbook(buffer, 'Utilisateurs');

    expect(sheet?.getCell('A2').value).toBe(1);
    expect(sheet?.getCell('B2').value).toBe('Alice');
    expect(sheet?.getCell('F2').value).toBe('Actif');
  });

  it('should export job posts to Excel', async () => {
    const posts: JobPost[] = [
      {
        id: 2,
        googleDriveFileId: 'drive-1',
        name: 'Fiche Poste Backend',
        type: 'application/pdf',
        url: 'https://example.com/raw',
        googleDocId: 'doc-1',
        unifiedUrl: 'https://example.com/unified',
        company: 'Acme',
        startDate: '2024-01-10',
        evaluationsFolderId: null,
        status: JobPostStatus.UNIFIED,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        title: 'Backend Engineer',
      } as JobPost,
    ];

    const buffer = await service.exportJobPostsToExcel(posts);
    const sheet = await createBufferFromWorkbook(buffer, 'Fiches de poste');

    expect(sheet?.getCell('A2').value).toBe(2);
    expect(sheet?.getCell('E2').value).toBe(JobPostStatus.UNIFIED);
    expect(sheet?.getCell('G2').value).toEqual({
      text: 'https://example.com/raw',
      hyperlink: 'https://example.com/raw',
    });
    expect(sheet?.getCell('H2').value).toEqual({
      text: 'https://example.com/unified',
      hyperlink: 'https://example.com/unified',
    });
  });

  it('should export candidates to Excel', async () => {
    const candidates: Candidate[] = [
      {
        id: 'candidate-1',
        brutDriveId: 'cv-raw-1',
        brutDriveName: 'CV Raw',
        brutDriveLink: 'https://example.com/cv-raw',
        name: 'Dupont',
        firstName: 'Paul',
        unifieDriveId: 'cv-unified-1',
        unifieDriveName: 'CV Unified',
        unifieDriveLink: 'https://example.com/cv-unified',
        status: ResumeStatus.DONE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        email: 'paul@example.com',
      } as Candidate,
    ];

    const buffer = await service.exportCandidatesToExcel(candidates);
    const sheet = await createBufferFromWorkbook(buffer, 'Candidats');

    expect(sheet?.getCell('A2').value).toBe('candidate-1');
    expect(sheet?.getCell('E2').value).toBe(ResumeStatus.DONE);
    expect(sheet?.getCell('F2').value).toEqual({
      text: 'https://example.com/cv-raw',
      hyperlink: 'https://example.com/cv-raw',
    });
    expect(sheet?.getCell('G2').value).toEqual({
      text: 'https://example.com/cv-unified',
      hyperlink: 'https://example.com/cv-unified',
    });
  });

  it('should export job posts to ZIP', async () => {
    const posts: JobPost[] = [
      {
        id: 3,
        googleDriveFileId: 'drive-1',
        name: 'Fiche Poste Backend',
        type: 'application/pdf',
        url: 'https://example.com/raw',
        googleDocId: 'doc-1',
        unifiedUrl: 'https://example.com/unified',
        company: 'Acme',
        startDate: '2024-01-10',
        evaluationsFolderId: null,
        status: JobPostStatus.UNIFIED,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        title: 'Backend Engineer',
      } as JobPost,
    ];

    const buffer = await service.exportJobPostsToZip(posts, 7);

    expect(googleDriveService.downloadFile).toHaveBeenCalledTimes(2);
    expect(googleDriveService.downloadFile).toHaveBeenCalledWith(
      7,
      'drive-1',
      'application/pdf',
    );
    expect(googleDriveService.downloadFile).toHaveBeenCalledWith(
      7,
      'doc-1',
      'application/pdf',
    );
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should export candidates to ZIP', async () => {
    const candidates: Candidate[] = [
      {
        id: 'candidate-1',
        brutDriveId: 'cv-raw-1',
        brutDriveName: 'CV Raw',
        brutDriveLink: 'https://example.com/cv-raw',
        name: 'Dupont',
        firstName: 'Paul',
        unifieDriveId: 'cv-unified-1',
        unifieDriveName: 'CV Unified',
        unifieDriveLink: 'https://example.com/cv-unified',
        status: ResumeStatus.DONE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        email: 'paul@example.com',
      } as Candidate,
    ];

    const buffer = await service.exportCandidatesToZip(candidates, 8);

    expect(googleDriveService.downloadFile).toHaveBeenCalledTimes(2);
    expect(googleDriveService.downloadFile).toHaveBeenCalledWith(8, 'cv-raw-1');
    expect(googleDriveService.downloadFile).toHaveBeenCalledWith(
      8,
      'cv-unified-1',
    );
    expect(buffer.length).toBeGreaterThan(0);
  });
});
