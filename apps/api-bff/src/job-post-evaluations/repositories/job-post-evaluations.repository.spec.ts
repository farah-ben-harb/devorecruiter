import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { JobPostEvaluationRepository } from './job-post-evaluations.repository';
import {
  JobPostEvaluation,
  ScoredJobPost,
  ScoringStatus,
} from '../entities/job-post-evaluation.entity';

type RepoMock = {
  create: jest.Mock<JobPostEvaluation, [Partial<JobPostEvaluation>]>;
  save: jest.Mock<Promise<JobPostEvaluation>, [JobPostEvaluation]>;
  findOne: jest.Mock<Promise<JobPostEvaluation | null>, [object]>;
  find: jest.Mock<Promise<JobPostEvaluation[]>, [object]>;
  findOneBy: jest.Mock<Promise<JobPostEvaluation | null>, [object]>;
  remove: jest.Mock<Promise<JobPostEvaluation>, [JobPostEvaluation]>;
};

const mockRepo = (): RepoMock => ({
  create: jest.fn<JobPostEvaluation, [Partial<JobPostEvaluation>]>(),
  save: jest.fn<Promise<JobPostEvaluation>, [JobPostEvaluation]>(),
  findOne: jest.fn<Promise<JobPostEvaluation | null>, [object]>(),
  find: jest.fn<Promise<JobPostEvaluation[]>, [object]>(),
  findOneBy: jest.fn<Promise<JobPostEvaluation | null>, [object]>(),
  remove: jest.fn<Promise<JobPostEvaluation>, [JobPostEvaluation]>(),
});

const makeMatch = (overrides: Partial<ScoredJobPost> = {}): ScoredJobPost => ({
  fileId: 'file-123',
  fileName: 'fiche_test.pdf',
  jobTitle: 'Dev Fullstack',
  scoreGlobal: 80,
  status: 'MATCH',
  detail: {} as ScoredJobPost['detail'],
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makeEntity = (
  overrides: Partial<JobPostEvaluation> = {},
): JobPostEvaluation =>
  ({
    id: 'uuid-001',
    candidateId: 'cand-001',
    totalMatch: 1,
    matches: [makeMatch()],
    status: ScoringStatus.DONE,
    completedAt: new Date(),
    createdAt: new Date(),
    errorMessage: null,
    ...overrides,
  }) as JobPostEvaluation;

describe('JobPostEvaluationRepository', () => {
  let service: JobPostEvaluationRepository;
  let repo: RepoMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostEvaluationRepository,
        {
          provide: getRepositoryToken(JobPostEvaluation),
          useFactory: mockRepo,
        },
      ],
    }).compile();

    service = module.get<JobPostEvaluationRepository>(
      JobPostEvaluationRepository,
    );
    repo = module.get<RepoMock>(getRepositoryToken(JobPostEvaluation));
  });

  afterEach(() => jest.clearAllMocks());

  describe('createWithResults', () => {
    it('crée et sauvegarde une entité avec statut DONE', async () => {
      const matches = [makeMatch()];
      const built = makeEntity();

      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.createWithResults({
        candidateId: 'cand-001',
        totalMatch: 1,
        matches,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: 'cand-001',
          totalMatch: 1,
          matches,
          status: ScoringStatus.DONE,
        }),
      );
      expect(repo.create).toHaveBeenCalledTimes(1);
      const createPayload = repo.create.mock.calls[0][0];
      expect(createPayload.completedAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toEqual(built);
    });

    it('propage les erreurs de sauvegarde', async () => {
      repo.create.mockReturnValue(makeEntity());
      repo.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createWithResults({
          candidateId: 'x',
          totalMatch: 0,
          matches: [],
        }),
      ).rejects.toThrow('DB error');
    });
  });

  describe('createPending', () => {
    it('crée une entité avec statut RUNNING et totalMatch à 0', async () => {
      const built = makeEntity({
        status: ScoringStatus.RUNNING,
        totalMatch: 0,
      });

      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.createPending('cand-002');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: 'cand-002',
          status: ScoringStatus.RUNNING,
          totalMatch: 0,
        }),
      );
      expect(result.status).toBe(ScoringStatus.RUNNING);
    });
  });

  describe('markError', () => {
    it('met à jour le statut en ERROR et sauvegarde', async () => {
      const entity = makeEntity({ status: ScoringStatus.RUNNING });
      const updated = {
        ...entity,
        status: ScoringStatus.ERROR,
        errorMessage: 'crash',
      };

      repo.findOneBy.mockResolvedValue(entity);
      repo.save.mockResolvedValue(updated as JobPostEvaluation);

      const result = await service.markError('uuid-001', 'crash');

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-001' });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ScoringStatus.ERROR,
          errorMessage: 'crash',
        }),
      );
      expect(repo.save).toHaveBeenCalledTimes(1);
      const savePayload = repo.save.mock.calls[0][0];
      expect(savePayload.completedAt).toBeInstanceOf(Date);
      expect(result.status).toBe(ScoringStatus.ERROR);
    });

    it('lève NotFoundException si entité introuvable', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.markError('bad-id', 'msg')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findLatestByCandidateId', () => {
    it('retourne le dernier scoring du candidat', async () => {
      const entity = makeEntity();
      repo.findOne.mockResolvedValue(entity);

      const result = await service.findLatestByCandidateId('cand-001');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { candidateId: 'cand-001' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(entity);
    });

    it('retourne null si aucun résultat', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.findLatestByCandidateId('cand-999');
      expect(result).toBeNull();
    });
  });

  describe('findAllByCandidateId', () => {
    it('retourne tous les scorings du candidat triés DESC', async () => {
      const entities = [makeEntity(), makeEntity({ id: 'uuid-002' })];
      repo.find.mockResolvedValue(entities);

      const result = await service.findAllByCandidateId('cand-001');

      expect(repo.find).toHaveBeenCalledWith({
        where: { candidateId: 'cand-001' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('retourne un tableau vide si aucun historique', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findAllByCandidateId('cand-999');
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it("retourne l'entité correspondante", async () => {
      const entity = makeEntity();
      repo.findOneBy.mockResolvedValue(entity);

      const result = await service.findById('uuid-001');

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-001' });
      expect(result).toEqual(entity);
    });

    it('retourne null si non trouvé', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.findById('bad-id');
      expect(result).toBeNull();
    });
  });

  describe('deleteById', () => {
    it("supprime l'entité existante", async () => {
      const entity = makeEntity();
      repo.findOneBy.mockResolvedValue(entity);
      repo.remove.mockResolvedValue(entity);

      await service.deleteById('uuid-001');

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-001' });
      expect(repo.remove).toHaveBeenCalledWith(entity);
    });

    it('lève NotFoundException si entité introuvable', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.deleteById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
