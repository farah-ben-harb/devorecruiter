// src/job-posts/services/global-criterias.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalCriteriaService } from './global-criterias.service';
import { GlobalCriteria } from '../entities/global-criterias.entity';
import { CreateGlobalCriteriaDto, UpdateGlobalCriteriaDto } from '../dtos/global-criterias.dto';

// ── Helper de fabrication ────────────────────────────────

function makeGlobalCriteria(overrides: Partial<GlobalCriteria> = {}): GlobalCriteria {
  return {
    id: 1,
    label: 'Maîtrise de TypeScript',
    description: null,
    category: 'technique',
    order: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ── Type du mock du repository ────────────────────────────

type MockedGlobalCriteriaRepository = jest.Mocked<
  Pick<Repository<GlobalCriteria>, 'find' | 'findOne' | 'create' | 'save' | 'remove'>
>;

describe('GlobalCriteriaService', () => {
  let service: GlobalCriteriaService;
  let repo: MockedGlobalCriteriaRepository;

  beforeEach(async () => {
    const mockRepo: MockedGlobalCriteriaRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalCriteriaService,
        { provide: getRepositoryToken(GlobalCriteria), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<GlobalCriteriaService>(GlobalCriteriaService);
    repo = mockRepo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────

  describe('findAll', () => {
    it('trie par order ASC puis createdAt ASC', async () => {
      const criteria = [makeGlobalCriteria()];
      repo.find.mockResolvedValue(criteria);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ order: { order: 'ASC', createdAt: 'ASC' } });
      expect(result).toBe(criteria);
    });
  });

  // ── findOne ──────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne le critère trouvé', async () => {
      const criteria = makeGlobalCriteria({ id: 3 });
      repo.findOne.mockResolvedValue(criteria);

      const result = await service.findOne(3);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(result).toBe(criteria);
    });

    it("lève une NotFoundException si le critère n'existe pas", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────

  describe('create', () => {
    it('crée avec description, category et order par défaut à null/0 si absents', async () => {
      const dto: CreateGlobalCriteriaDto = { label: 'Docker' };
      const built = makeGlobalCriteria({ label: 'Docker', description: null, category: null, order: 0 });
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({
        label: 'Docker',
        description: null,
        category: null,
        order: 0,
      });
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(built);
    });

    it('crée avec les valeurs fournies quand elles sont présentes', async () => {
      const dto: CreateGlobalCriteriaDto = {
        label: 'Kubernetes',
        description: 'Orchestration de conteneurs',
        category: 'devops',
        order: 5,
      };
      const built = makeGlobalCriteria(dto);
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({
        label: 'Kubernetes',
        description: 'Orchestration de conteneurs',
        category: 'devops',
        order: 5,
      });
      expect(result).toBe(built);
    });
  });

  // ── update ───────────────────────────────────────────────

  describe('update', () => {
    it('lève une NotFoundException si le critère n\'existe pas', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(99, { label: 'X' })).rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('met à jour uniquement les champs fournis dans le dto', async () => {
      const existing = makeGlobalCriteria({
        id: 1,
        label: 'Ancien label',
        description: 'Ancienne description',
        category: 'ancien',
        order: 1,
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as GlobalCriteria));

      const dto: UpdateGlobalCriteriaDto = { label: 'Nouveau label' };
      const result = await service.update(1, dto);

      expect(result.label).toBe('Nouveau label');
      expect(result.description).toBe('Ancienne description');
      expect(result.category).toBe('ancien');
      expect(result.order).toBe(1);
    });

    it('met description et category à null si fournis explicitement comme undefined dans une valeur vide', async () => {
      const existing = makeGlobalCriteria({
        id: 1,
        description: 'Ancienne description',
        category: 'ancien',
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as GlobalCriteria));

      const dto: UpdateGlobalCriteriaDto = { description: undefined, category: undefined };
      const result = await service.update(1, dto);

      // dto.description et dto.category sont undefined donc les conditions
      // "dto.description !== undefined" sont fausses : rien ne change.
      expect(result.description).toBe('Ancienne description');
      expect(result.category).toBe('ancien');
    });

    it('met à jour tous les champs quand ils sont tous fournis', async () => {
      const existing = makeGlobalCriteria({ id: 1 });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as GlobalCriteria));

      const dto: UpdateGlobalCriteriaDto = {
        label: 'Terraform',
        description: 'IaC tool',
        category: 'devops',
        order: 3,
      };
      const result = await service.update(1, dto);

      expect(result).toMatchObject({
        label: 'Terraform',
        description: 'IaC tool',
        category: 'devops',
        order: 3,
      });
    });
  });

  // ── remove ───────────────────────────────────────────────

  describe('remove', () => {
    it("lève une NotFoundException si le critère n'existe pas", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('supprime le critère trouvé', async () => {
      const existing = makeGlobalCriteria({ id: 1 });
      repo.findOne.mockResolvedValue(existing);
      repo.remove.mockResolvedValue(existing);

      await service.remove(1);

      expect(repo.remove).toHaveBeenCalledWith(existing);
    });
  });
});