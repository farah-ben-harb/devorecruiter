import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ResumeEvaluationRepository } from './resume-evaluations.repository';
import { ResumeEvaluation } from '../entities/resume-evaluation.entity';

type RepoMock = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  delete: jest.Mock;
};

const mockRepo = (): RepoMock => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
});

const makeEntity = (
  overrides: Partial<ResumeEvaluation> = {},
): ResumeEvaluation =>
  ({
    id: 1,
    resumeFileId: 'resume-file-001',
    resumeName: 'John_Doe_CV.pdf',
    jobPostId: 10,
    jobPostGoogleDriveFileId: 'drive-post-001',
    scoreGlobal: 75,
    status: 'RETAINED',
    criteria: {} as ResumeEvaluation['criteria'],
    strengths: [],
    weaknesses: [],
    resume: '',
    recommendation: 'retain',
    createdAt: new Date(),
    ...overrides,
  }) as ResumeEvaluation;

describe('ResumeEvaluationRepository', () => {
  let service: ResumeEvaluationRepository;
  let repo: RepoMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeEvaluationRepository,
        { provide: getRepositoryToken(ResumeEvaluation), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<ResumeEvaluationRepository>(
      ResumeEvaluationRepository,
    );
    repo = module.get<RepoMock>(getRepositoryToken(ResumeEvaluation));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('creates and saves an entity', async () => {
      const entity = makeEntity();
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create({ resumeFileId: 'resume-file-001' });

      expect(repo.create).toHaveBeenCalledWith({
        resumeFileId: 'resume-file-001',
      });
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });

    it('propagates save errors', async () => {
      repo.create.mockReturnValue(makeEntity());
      repo.save.mockRejectedValue(new Error('DB error'));

      await expect(service.create({})).rejects.toThrow('DB error');
    });
  });

  describe('findByJobPost', () => {
    it('returns scorings sorted by scoreGlobal DESC', async () => {
      const entities = [
        makeEntity({ scoreGlobal: 90 }),
        makeEntity({ id: 2, scoreGlobal: 60 }),
      ];
      repo.find.mockResolvedValue(entities);

      const result = await service.findByJobPost(10);

      expect(repo.find).toHaveBeenCalledWith({
        where: { jobPostId: 10 },
        order: { scoreGlobal: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array if no results', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findByJobPost(99);
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('returns entity if found', async () => {
      const entity = makeEntity();
      repo.findOne.mockResolvedValue(entity);

      const result = await service.findById(1);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(entity);
    });

    it('throws NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
      await expect(service.findById(99)).rejects.toThrow(
        'ResumeEvaluation 99 non trouvé',
      );
    });
  });

  describe('findByResumeAndJobPost', () => {
    it('returns entity if it exists', async () => {
      const entity = makeEntity();
      repo.findOne.mockResolvedValue(entity);

      const result = await service.findByResumeAndJobPost(
        'resume-file-001',
        10,
      );

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { resumeFileId: 'resume-file-001', jobPostId: 10 },
      });
      expect(result).toEqual(entity);
    });

    it('returns null if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findByResumeAndJobPost('unknown', 99);
      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('deletes entity if it exists', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      await expect(service.deleteById(1)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundException if affected === 0', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.deleteById(99)).rejects.toThrow(NotFoundException);
      await expect(service.deleteById(99)).rejects.toThrow(
        'ResumeEvaluation 99 non trouvé',
      );
    });
  });
});
