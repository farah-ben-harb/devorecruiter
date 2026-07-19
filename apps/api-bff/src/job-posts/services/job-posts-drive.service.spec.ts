import { Test } from '@nestjs/testing';
import { JobPostDriveService } from './job-posts-drive.service';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { ConfigService } from '@nestjs/config';
import { JobPostHelpersService } from './job-posts-helpers.service';

describe('JobPostDriveService', () => {
  let service: JobPostDriveService;

  const repoMock = {
    findAll: jest.fn().mockResolvedValue({ data: [] }),
    create: jest.fn(),
    updateUnifie: jest.fn(),
    deleteBy: jest.fn(),
  };

  const driveMock = {
    listFiles: jest.fn().mockResolvedValue([]),
    downloadFile: jest.fn(),
    shareAllExistingFiles: jest.fn(),
    shareWithAll: jest.fn(),
    deleteFile: jest.fn(),
  };

  const helpersMock = {
    extractTitleFromFile: jest.fn(),
    extractCompanyFromName: jest.fn(),
    extractStartDateFromPdf: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JobPostDriveService,
        { provide: 'JOB_POST_REPOSITORY', useValue: repoMock },
        { provide: GoogleDriveService, useValue: driveMock },
        { provide: ConfigService, useValue: {} },
        { provide: JobPostHelpersService, useValue: helpersMock },
      ],
    }).compile();

    service = module.get(JobPostDriveService);
  });

  it('should list files', async () => {
    const result = await service.listFiles(1, 'folder');
    expect(result).toBeDefined();
  });
});
