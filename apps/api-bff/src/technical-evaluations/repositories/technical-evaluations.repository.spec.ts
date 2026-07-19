import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TechnicalEvaluationRepository } from './technical-evaluations.repository';
import { TechnicalEvaluation } from '../entities/technical-evaluations/technical-evaluations.entity';

describe('TechnicalEvaluationRepository', () => {
  let repository: TechnicalEvaluationRepository;

  const mockTypeOrmRepo = {
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalEvaluationRepository,
        {
          provide: getRepositoryToken(TechnicalEvaluation),
          useValue: mockTypeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<TechnicalEvaluationRepository>(
      TechnicalEvaluationRepository,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ───────────────────────────────
  // CREATE
  // ───────────────────────────────
  it('should create evaluation', async () => {
    const dto = { title: 'test' };

    mockTypeOrmRepo.save.mockResolvedValue({ id: 1, ...dto });

    const result = await repository.create(dto as any);

    expect(mockTypeOrmRepo.create).toHaveBeenCalledWith(dto);
    expect(mockTypeOrmRepo.save).toHaveBeenCalled();
    expect(result).toEqual({ id: 1, ...dto });
  });

  // ───────────────────────────────
  // FIND ALL BY JOBPOST
  // ───────────────────────────────
  it('should return all evaluations by jobPostId', async () => {
    mockTypeOrmRepo.find.mockResolvedValue([{ id: 1 }]);

    const result = await repository.findAll(1);

    expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
      where: { jobPostId: 1 },
      order: { createdAt: 'DESC' },
    });

    expect(result).toEqual([{ id: 1 }]);
  });

  // ───────────────────────────────
  // FIND ALL
  // ───────────────────────────────
  it('should return all evaluations', async () => {
    mockTypeOrmRepo.find.mockResolvedValue([{ id: 1 }]);

    const result = await repository.findAllEvaluations();

    expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });

    expect(result).toEqual([{ id: 1 }]);
  });

  // ───────────────────────────────
  // FIND BY ID
  // ───────────────────────────────
  it('should find by id', async () => {
    mockTypeOrmRepo.findOne.mockResolvedValue({ id: 1 });

    const result = await repository.findById(1);

    expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    expect(result).toEqual({ id: 1 });
  });

  // ───────────────────────────────
  // FIND BY DRIVE FILE ID
  // ───────────────────────────────
  it('should find by driveFileId', async () => {
    mockTypeOrmRepo.findOne.mockResolvedValue({ id: 1 });

    const result = await repository.findByDriveFileId('file123');

    expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
      where: { driveFileId: 'file123' },
    });

    expect(result).toEqual({ id: 1 });
  });

  // ───────────────────────────────
  // SAVE
  // ───────────────────────────────
  it('should save evaluation', async () => {
    const entity = { id: 1, title: 'test' };

    mockTypeOrmRepo.save.mockResolvedValue(entity);

    const result = await repository.save(entity as any);

    expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });

  // ───────────────────────────────
  // UPDATE
  // ───────────────────────────────
  it('should update evaluation and return it', async () => {
    const data = { title: 'updated' };

    mockTypeOrmRepo.update.mockResolvedValue({});
    mockTypeOrmRepo.findOneOrFail.mockResolvedValue({
      id: 1,
      title: 'updated',
    });

    const result = await repository.update(1, data as any);

    expect(mockTypeOrmRepo.update).toHaveBeenCalledWith(1, data);
    expect(mockTypeOrmRepo.findOneOrFail).toHaveBeenCalledWith({
      where: { id: 1 },
    });

    expect(result).toEqual({ id: 1, title: 'updated' });
  });

  // ───────────────────────────────
  // DELETE
  // ───────────────────────────────
  it('should delete evaluation', async () => {
    mockTypeOrmRepo.delete.mockResolvedValue({ affected: 1 });

    await repository.delete(1);

    expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith(1);
  });
});