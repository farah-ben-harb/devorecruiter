import { Test, TestingModule } from '@nestjs/testing';
import { CandidateRepository } from './candidate.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Candidate, ResumeStatus } from '../entities/candidate.entity';
import { NotFoundException } from '@nestjs/common';

type RepoMock = {
  create: jest.Mock<Candidate, [Partial<Candidate>]>;
  save: jest.Mock<Promise<Candidate>, [Candidate]>;
  findAndCount: jest.Mock<
    Promise<[Candidate[], number]>,
    [Record<string, unknown>]
  >;
  findOne: jest.Mock<Promise<Candidate | null>, [{ where: { id: string } }]>;
  remove: jest.Mock<Promise<Candidate>, [Candidate]>;
};

const buildCandidate = (overrides?: Partial<Candidate>): Candidate => ({
  id: 'candidate-1',
  brutDriveId: 'brut-id',
  brutDriveName: 'resume-brut.pdf',
  brutDriveLink: 'https://drive/brut',
  name: '',
  firstName: '',
  unifieDriveId: '',
  unifieDriveName: '',
  unifieDriveLink: '',
  email: null,
  githubUsername: null,
  status: ResumeStatus.PENDING,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

describe('CandidateRepository', () => {
  let repository: CandidateRepository;
  let repo: RepoMock;

  const mockRepo: RepoMock = {
    create: jest.fn<Candidate, [Partial<Candidate>]>(),
    save: jest.fn<Promise<Candidate>, [Candidate]>(),
    findAndCount: jest.fn<
      Promise<[Candidate[], number]>,
      [Record<string, unknown>]
    >(),
    findOne: jest.fn<Promise<Candidate | null>, [{ where: { id: string } }]>(),
    remove: jest.fn<Promise<Candidate>, [Candidate]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateRepository,
        {
          provide: getRepositoryToken(Candidate),
          useValue: mockRepo,
        },
      ],
    }).compile();

    repository = module.get<CandidateRepository>(CandidateRepository);
    repo = module.get<RepoMock>(getRepositoryToken(Candidate));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create()', () => {
    it('should create and save candidate', async () => {
      const data: Partial<Candidate> = {
        brutDriveName: 'resume.pdf',
      };
      const created = buildCandidate({ brutDriveName: 'resume.pdf' });

      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(repo.create).toHaveBeenCalledWith(data);
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should create candidate even when brutDriveName is undefined', async () => {
      const data: Partial<Candidate> = { brutDriveName: undefined };
      const created = buildCandidate({ brutDriveName: undefined });

      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(result.brutDriveName).toBeUndefined();
    });
  });

  describe('findAll()', () => {
    it('should return paginated candidates with meta', async () => {
      const c1 = buildCandidate({ id: 'c1' });
      repo.findAndCount.mockResolvedValue([[c1], 1]);

      const result = await repository.findAll(1, 10);

      expect(repo.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toEqual([c1]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should compute totalPages with ceil strategy', async () => {
      repo.findAndCount.mockResolvedValue([[], 11]);

      const result = await repository.findAll(2, 10);

      expect(result.meta.totalPages).toBe(2);
      expect(result.meta.page).toBe(2);
    });
  });

  describe('findBy()', () => {
    it('should return candidate if found', async () => {
      const candidate = buildCandidate({ id: '1' });
      repo.findOne.mockResolvedValue(candidate);

      const result = await repository.findBy({ id: '1' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual(candidate);
    });

    it('should return null if not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await repository.findBy({ id: '1' });

      expect(result).toBeNull();
    });
  });

  describe('save()', () => {
    it('should save candidate', async () => {
      const candidate = buildCandidate({ id: '1' });
      repo.save.mockResolvedValue(candidate);

      const result = await repository.save(candidate);

      expect(result).toEqual(candidate);
      expect(repo.save).toHaveBeenCalledWith(candidate);
    });
  });

  describe('updateStatus()', () => {
    it('should update status and save', async () => {
      const candidate = buildCandidate({
        id: '1',
        status: ResumeStatus.PENDING,
      });

      const findBySpy = jest
        .spyOn(repository, 'findBy')
        .mockResolvedValue(candidate);
      repo.save.mockResolvedValue({ ...candidate, status: ResumeStatus.DONE });

      const result = await repository.updateStatus('1', ResumeStatus.DONE);

      expect(findBySpy).toHaveBeenCalledWith({ id: '1' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', status: ResumeStatus.DONE }),
      );
      expect(result.status).toBe(ResumeStatus.DONE);
    });

    it('should throw if candidate not found', async () => {
      jest.spyOn(repository, 'findBy').mockResolvedValue(null);

      await expect(
        repository.updateStatus('1', ResumeStatus.DONE),
      ).rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateUnifie()', () => {
    it('should update unifie fields and status', async () => {
      const candidate = buildCandidate({
        id: '1',
        unifieDriveId: '',
        unifieDriveName: '',
        unifieDriveLink: '',
        status: ResumeStatus.PROCESSING,
      });

      const findBySpy = jest
        .spyOn(repository, 'findBy')
        .mockResolvedValue(candidate);
      repo.save.mockResolvedValue(
        buildCandidate({
          ...candidate,
          unifieDriveId: 'doc-id',
          unifieDriveName: 'doc-name',
          unifieDriveLink: 'doc-link',
          status: ResumeStatus.DONE,
        }),
      );

      const result = await repository.updateUnifie('1', {
        unifieDriveId: 'doc-id',
        unifieDriveName: 'doc-name',
        unifieDriveLink: 'doc-link',
        status: ResumeStatus.DONE,
      });

      expect(findBySpy).toHaveBeenCalledWith({ id: '1' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          unifieDriveId: 'doc-id',
          unifieDriveName: 'doc-name',
          unifieDriveLink: 'doc-link',
          status: ResumeStatus.DONE,
        }),
      );
      expect(result.unifieDriveId).toBe('doc-id');
      expect(result.status).toBe(ResumeStatus.DONE);
    });

    it('should throw if candidate not found', async () => {
      jest.spyOn(repository, 'findBy').mockResolvedValue(null);

      await expect(
        repository.updateUnifie('1', {
          unifieDriveId: 'doc-id',
          unifieDriveName: 'doc-name',
          unifieDriveLink: 'doc-link',
          status: ResumeStatus.DONE,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteBy()', () => {
    it('should remove candidate', async () => {
      const candidate = buildCandidate({ id: '1' });
      const findBySpy = jest
        .spyOn(repository, 'findBy')
        .mockResolvedValue(candidate);
      repo.remove.mockResolvedValue(candidate);

      await repository.deleteBy({ id: '1' });

      expect(findBySpy).toHaveBeenCalledWith({ id: '1' });
      expect(repo.remove).toHaveBeenCalledWith(candidate);
    });

    it('should throw if candidate not found', async () => {
      jest.spyOn(repository, 'findBy').mockResolvedValue(null);

      await expect(repository.deleteBy({ id: '1' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
