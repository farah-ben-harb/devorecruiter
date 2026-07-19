// src/job-posts/services/criteria-category.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CriteriaCategoryService } from './criteria-category.service';
import { CriteriaCategory } from '../entities/criteria-category.entity';
import { CreateCriteriaCategoryDto, UpdateCriteriaCategoryDto } from '../dtos/criteria-category.dto';

// ── Helper de fabrication ────────────────────────────────

function makeCriteriaCategory(overrides: Partial<CriteriaCategory> = {}): CriteriaCategory {
  return {
    id: 1,
    value: 'technique',
    label: '🔧 Technique',
    order: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ── Type du mock du repository ────────────────────────────

type MockedCriteriaCategoryRepository = jest.Mocked<
  Pick<Repository<CriteriaCategory>, 'find' | 'findOne' | 'create' | 'save' | 'remove'>
>;

describe('CriteriaCategoryService', () => {
  let service: CriteriaCategoryService;
  let repo: MockedCriteriaCategoryRepository;

  beforeEach(async () => {
    const mockRepo: MockedCriteriaCategoryRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CriteriaCategoryService,
        { provide: getRepositoryToken(CriteriaCategory), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CriteriaCategoryService>(CriteriaCategoryService);
    repo = mockRepo;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────

  describe('findAll', () => {
    it('trie par order ASC puis label ASC', async () => {
      const categories = [makeCriteriaCategory()];
      repo.find.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ order: { order: 'ASC', label: 'ASC' } });
      expect(result).toBe(categories);
    });
  });

  // ── findOne ──────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne la catégorie trouvée', async () => {
      const category = makeCriteriaCategory({ id: 3 });
      repo.findOne.mockResolvedValue(category);

      const result = await service.findOne(3);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
      expect(result).toBe(category);
    });

    it("lève une NotFoundException si la catégorie n'existe pas", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────

  describe('create', () => {
    it('crée avec order par défaut à 0 si absent', async () => {
      const dto: CreateCriteriaCategoryDto = { value: 'devops', label: '⚙️ DevOps' };
      const built = makeCriteriaCategory({ value: 'devops', label: '⚙️ DevOps', order: 0 });
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({
        value: 'devops',
        label: '⚙️ DevOps',
        order: 0,
      });
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(built);
    });

    it('crée avec order fourni quand présent', async () => {
      const dto: CreateCriteriaCategoryDto = { value: 'soft-skills', label: '💬 Soft skills', order: 5 };
      const built = makeCriteriaCategory(dto);
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith({
        value: 'soft-skills',
        label: '💬 Soft skills',
        order: 5,
      });
      expect(result).toBe(built);
    });
  });

  // ── update ───────────────────────────────────────────────

  describe('update', () => {
    it("lève une NotFoundException si la catégorie n'existe pas", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(99, { label: 'X' })).rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('met à jour uniquement les champs fournis dans le dto', async () => {
      const existing = makeCriteriaCategory({
        id: 1,
        value: 'technique',
        label: 'Ancien label',
        order: 1,
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as CriteriaCategory));

      const dto: UpdateCriteriaCategoryDto = { label: 'Nouveau label' };
      const result = await service.update(1, dto);

      expect(result.label).toBe('Nouveau label');
      expect(result.value).toBe('technique');
      expect(result.order).toBe(1);
    });

    it('ne touche à rien si le dto est vide', async () => {
      const existing = makeCriteriaCategory({ id: 1, value: 'technique', label: 'Technique', order: 2 });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as CriteriaCategory));

      const result = await service.update(1, {});

      expect(result).toEqual(existing);
    });

    it('met à jour tous les champs quand ils sont tous fournis', async () => {
      const existing = makeCriteriaCategory({ id: 1 });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as CriteriaCategory));

      const dto: UpdateCriteriaCategoryDto = {
        value: 'langues',
        label: '🌍 Langues',
        order: 3,
      };
      const result = await service.update(1, dto);

      expect(result).toMatchObject({
        value: 'langues',
        label: '🌍 Langues',
        order: 3,
      });
    });
  });

  // ── remove ───────────────────────────────────────────────

  describe('remove', () => {
    it("lève une NotFoundException si la catégorie n'existe pas", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('supprime la catégorie trouvée', async () => {
      const existing = makeCriteriaCategory({ id: 1 });
      repo.findOne.mockResolvedValue(existing);
      repo.remove.mockResolvedValue(existing);

      await service.remove(1);

      expect(repo.remove).toHaveBeenCalledWith(existing);
    });
  });
});