// src/job-posts/controllers/global-criteria.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GlobalCriteriaService } from '../services/global-criterias.service';
import { GlobalCriteria } from '../entities/global-criterias.entity';
import { CreateGlobalCriteriaDto, UpdateGlobalCriteriaDto } from '../dtos/global-criterias.dto';
import { GlobalCriteriaController } from './global-criterias.controller';

// Helper to build test data

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

// Mock type for the service

type MockedGlobalCriteriaService = jest.Mocked<
  Pick<GlobalCriteriaService, 'findAll' | 'findOne' | 'create' | 'update' | 'remove'>
>;

describe('GlobalCriteriaController', () => {
  let controller: GlobalCriteriaController;
  let service: MockedGlobalCriteriaService;

  beforeEach(async () => {
    const mockService: MockedGlobalCriteriaService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalCriteriaController],
      providers: [{ provide: GlobalCriteriaService, useValue: mockService }],
    }).compile();

    controller = module.get<GlobalCriteriaController>(GlobalCriteriaController);
    service = mockService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // findAll

  describe('findAll', () => {
    it('returns all criteria from service', async () => {
      const criteria = [makeGlobalCriteria()];
      service.findAll.mockResolvedValue(criteria);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBe(criteria);
    });
  });

  // findOne

  describe('findOne', () => {
    it('returns one criteria by id', async () => {
      const criteria = makeGlobalCriteria({ id: 3 });
      service.findOne.mockResolvedValue(criteria);

      const result = await controller.findOne(3);

      expect(service.findOne).toHaveBeenCalledWith(3);
      expect(result).toBe(criteria);
    });
  });

  // create

  describe('create', () => {
    it('creates a criteria from dto', async () => {
      const dto: CreateGlobalCriteriaDto = { label: 'Docker' };
      const created = makeGlobalCriteria({ label: 'Docker' });
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });

  // update

  describe('update', () => {
    it('updates a criteria by id with dto', async () => {
      const dto: UpdateGlobalCriteriaDto = { label: 'Kubernetes' };
      const updated = makeGlobalCriteria({ id: 1, label: 'Kubernetes' });
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toBe(updated);
    });
  });

  // remove

  describe('remove', () => {
    it('removes a criteria and returns a success message', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: 'Critère 1 supprimé avec succès' });
    });
  });
});