// src/job-posts/repositories/job-post-criteria.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPostCriteriaRepository } from './job-post-criteria.repository';
import {
  JobPostCriteria,
  CriteriaSource,
} from '../entities/job-post-criteria.entity';

// ── Helper de fabrication ────────────────────────────────

function makeJobPostCriteria(overrides: Partial<JobPostCriteria> = {}): JobPostCriteria {
  return {
    id: 1,
    jobPostId: 10,
    jobPost: {} as JobPostCriteria['jobPost'],
    intitulePoste: null,
    competencesTechniquesRequises: [],
    competencesGeneralesRequises: [],
    experienceMinimaleAnnees: null,
    formationRequise: null,
    languesRequises: [],
    missionsPrincipales: [],
    certificationsRequises: [],
    sections: null,
    sectionLabels: null,
    source: CriteriaSource.N8N_UNIFICATION,
    rawJson: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ── Type du mock du repository ────────────────────────────

type MockedTypeOrmRepository = jest.Mocked<
  Pick<Repository<JobPostCriteria>, 'findOne' | 'save' | 'create' | 'delete'>
>;

describe('JobPostCriteriaRepository', () => {
  let repository: JobPostCriteriaRepository;
  let repo: MockedTypeOrmRepository;

  beforeEach(async () => {
    const mockRepo: MockedTypeOrmRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostCriteriaRepository,
        { provide: getRepositoryToken(JobPostCriteria), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get<JobPostCriteriaRepository>(JobPostCriteriaRepository);
    repo = mockRepo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── upsert ───────────────────────────────────────────────

  describe('upsert', () => {
    it('met à jour un enregistrement existant', async () => {
      const existing = makeJobPostCriteria({ jobPostId: 10, intitulePoste: 'Ancien titre' });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as JobPostCriteria));

      const result = await repository.upsert(10, { intitulePoste: 'Nouveau titre' });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { jobPostId: 10 } });
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ intitulePoste: 'Nouveau titre', jobPostId: 10 }),
      );
      expect(result.intitulePoste).toBe('Nouveau titre');
    });

    it('crée un nouvel enregistrement si aucun n\'existe pour ce jobPostId', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = makeJobPostCriteria({ jobPostId: 20, intitulePoste: 'Dev Backend' });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await repository.upsert(20, { intitulePoste: 'Dev Backend' });

      expect(repo.create).toHaveBeenCalledWith({ intitulePoste: 'Dev Backend', jobPostId: 20 });
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('conserve les champs existants non fournis dans data lors d\'une mise à jour', async () => {
      const existing = makeJobPostCriteria({
        jobPostId: 10,
        intitulePoste: 'Titre existant',
        competencesTechniquesRequises: ['NestJS'],
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as JobPostCriteria));

      const result = await repository.upsert(10, { formationRequise: 'Bac+5' });

      expect(result.intitulePoste).toBe('Titre existant');
      expect(result.competencesTechniquesRequises).toEqual(['NestJS']);
      expect(result.formationRequise).toBe('Bac+5');
    });
  });

  // ── findByJobPostId ────────────────────────────────────────

  describe('findByJobPostId', () => {
    it('retourne les critères trouvés', async () => {
      const criteria = makeJobPostCriteria({ jobPostId: 10 });
      repo.findOne.mockResolvedValue(criteria);

      const result = await repository.findByJobPostId(10);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { jobPostId: 10 } });
      expect(result).toBe(criteria);
    });

    it('retourne null si aucun critère n\'existe', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await repository.findByJobPostId(99);

      expect(result).toBeNull();
    });
  });

  // ── deleteByJobPostId ──────────────────────────────────────

  describe('deleteByJobPostId', () => {
    it('supprime les critères par jobPostId', async () => {
      repo.delete.mockResolvedValue({ raw: {}, affected: 1 });

      await repository.deleteByJobPostId(10);

      expect(repo.delete).toHaveBeenCalledWith({ jobPostId: 10 });
    });
  });
});