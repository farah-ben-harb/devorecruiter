import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CandidateDriveService } from './candidate-drive.service';
import { CANDIDATE_REPOSITORY } from '../interfaces/candidate-repository.interface';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { Candidate, ResumeStatus } from '../entities/candidate.entity';

type CandidateRepoMock = {
  findAll: jest.Mock;
  create: jest.Mock;
  updateUnifie: jest.Mock;
  save: jest.Mock;
  deleteBy: jest.Mock;
};

type DriveMock = {
  listFiles: jest.Mock;
  shareWithAll: jest.Mock;
};

const makeCandidate = (overrides: Partial<Candidate> = {}): Candidate =>
  ({
    id: 'candidate-1',
    brutDriveId: 'brut-1',
    brutDriveName: 'Doe_John_brut.pdf',
    brutDriveLink: 'https://drive/brut-1',
    name: 'Doe',
    firstName: 'John',
    unifieDriveId: null,
    unifieDriveName: null,
    unifieDriveLink: null,
    status: ResumeStatus.PENDING,
    email: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }) as Candidate;

describe('CandidateDriveService', () => {
  let service: CandidateDriveService;
  let repo: CandidateRepoMock;
  let drive: DriveMock;
  let config: { getOrThrow: jest.Mock };

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      create: jest.fn(),
      updateUnifie: jest.fn(),
      save: jest.fn(),
      deleteBy: jest.fn(),
    };

    drive = {
      listFiles: jest.fn(),
      shareWithAll: jest.fn().mockResolvedValue(undefined),
    };

    config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'DRIVE_FOLDER_CANDIDATES_CVS_BRUTS') return 'brut-folder';
        if (key === 'DRIVE_FOLDER_CANDIDATES_CVS_UNIFIES') {
          return 'unifie-folder';
        }
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateDriveService,
        { provide: CANDIDATE_REPOSITORY, useValue: repo },
        { provide: GoogleDriveService, useValue: drive },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(CandidateDriveService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates new candidates from brut files and shares them', async () => {
    drive.listFiles
      .mockResolvedValueOnce([
        {
          id: 'brut-1',
          name: 'Doe_John_brut.pdf',
          mimeType: 'application/pdf',
          webViewLink: 'https://drive/brut-1',
        },
      ])
      .mockResolvedValueOnce([]);
    repo.findAll.mockResolvedValue({ data: [], meta: {} });
    repo.create.mockResolvedValue(makeCandidate());

    const result = await service.syncFromDrive(42);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        brutDriveId: 'brut-1',
        name: 'Doe',
        firstName: 'John',
        status: ResumeStatus.PENDING,
      }),
    );
    expect(drive.shareWithAll).toHaveBeenCalledWith(42, 'brut-1');
    expect(result).toEqual({ added: 1, removed: 0 });
  });

  it('associates unifie file with matching brut candidate', async () => {
    drive.listFiles.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'unifie-1',
        name: 'Doe_John_unifie.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'https://drive/unifie-1',
      },
    ]);
    repo.findAll.mockResolvedValue({
      data: [
        makeCandidate({ id: 'cand-1', brutDriveName: 'Doe_John_brut.pdf' }),
      ],
      meta: {},
    });
    repo.updateUnifie.mockResolvedValue(
      makeCandidate({
        id: 'cand-1',
        unifieDriveId: 'unifie-1',
        status: ResumeStatus.DONE,
      }),
    );

    const result = await service.syncFromDrive(7);

    expect(repo.updateUnifie).toHaveBeenCalledWith(
      'cand-1',
      expect.objectContaining({
        unifieDriveId: 'unifie-1',
        status: ResumeStatus.DONE,
      }),
    );
    expect(result).toEqual({ added: 1, removed: 1 });
  });

  it('removes candidates whose brut file no longer exists on Drive', async () => {
    drive.listFiles.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    repo.findAll.mockResolvedValue({ data: [makeCandidate()], meta: {} });
    repo.deleteBy.mockResolvedValue(undefined);

    const result = await service.syncFromDrive(13);

    expect(repo.deleteBy).toHaveBeenCalledWith({ id: 'candidate-1' });
    expect(result).toEqual({ added: 0, removed: 1 });
  });

  it('returns immediately when a sync is already running', async () => {
    (service as unknown as { isSyncing: boolean }).isSyncing = true;

    const result = await service.syncFromDrive(9);

    expect(result).toEqual({ added: 0, removed: 0 });
    expect(drive.listFiles).not.toHaveBeenCalled();
  });
});
