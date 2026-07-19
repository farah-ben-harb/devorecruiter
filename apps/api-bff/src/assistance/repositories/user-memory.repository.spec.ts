import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserMemoryRepository } from './user-memory.repository';
import { UserMemoryEntity } from '../entities/user-memory.entity';

describe('UserMemoryRepository', () => {
  let repository: UserMemoryRepository;

  const typeOrmRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserMemoryRepository,
        {
          provide: getRepositoryToken(UserMemoryEntity),
          useValue: typeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<UserMemoryRepository>(UserMemoryRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('upsert should update summary when record exists', async () => {
    typeOrmRepo.findOne.mockResolvedValue({
      id: 1,
      userId: 10,
      summary: 'old',
    });

    await repository.upsert(10, 'new summary');

    expect(typeOrmRepo.update).toHaveBeenCalledWith(
      { userId: 10 },
      { summary: 'new summary' },
    );
    expect(typeOrmRepo.save).not.toHaveBeenCalled();
  });

  it('upsert should create and save when record does not exist', async () => {
    typeOrmRepo.findOne.mockResolvedValue(null);
    typeOrmRepo.create.mockReturnValue({ userId: 10, summary: 'new summary' });

    await repository.upsert(10, 'new summary');

    expect(typeOrmRepo.create).toHaveBeenCalledWith({
      userId: 10,
      summary: 'new summary',
    });
    expect(typeOrmRepo.save).toHaveBeenCalledWith({
      userId: 10,
      summary: 'new summary',
    });
  });
});
