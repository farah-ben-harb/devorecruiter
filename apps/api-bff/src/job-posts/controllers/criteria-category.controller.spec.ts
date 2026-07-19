// src/job-posts/controllers/criteria-category.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CriteriaCategoryController } from './criteria-category.controller';
import { CriteriaCategoryService } from '../services/criteria-category.service';
import { CriteriaCategory } from '../entities/criteria-category.entity';
import { CreateCriteriaCategoryDto, UpdateCriteriaCategoryDto } from '../dtos/criteria-category.dto';

// Helper to build test data

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

// Mock type for the service

type MockedCriteriaCategoryService = jest.Mocked<
  Pick<CriteriaCategoryService, 'findAll' | 'create' | 'update' | 'remove'>
>;

describe('CriteriaCategoryController', () => {
  let controller: CriteriaCategoryController;
  let service: MockedCriteriaCategoryService;

  beforeEach(async () => {
    const mockService: MockedCriteriaCategoryService = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CriteriaCategoryController],
      providers: [{ provide: CriteriaCategoryService, useValue: mockService }],
    }).compile();

    controller = module.get<CriteriaCategoryController>(CriteriaCategoryController);
    service = mockService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // findAll

  describe('findAll', () => {
    it('returns all categories from service', async () => {
      const categories = [makeCriteriaCategory()];
      service.findAll.mockResolvedValue(categories);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBe(categories);
    });
  });

  // create

  describe('create', () => {
    it('creates a category from dto', async () => {
      const dto: CreateCriteriaCategoryDto = { value: 'devops', label: '⚙️ DevOps' };
      const created = makeCriteriaCategory({ value: 'devops', label: '⚙️ DevOps' });
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });

  // update

  describe('update', () => {
    it('updates a category by id with dto', async () => {
      const dto: UpdateCriteriaCategoryDto = { label: 'Nouveau label' };
      const updated = makeCriteriaCategory({ id: 1, label: 'Nouveau label' });
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(updated);
    });
  });

  // remove

  describe('remove', () => {
    it('removes a category and returns a success message', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Catégorie 1 supprimée' });
    });
  });
});