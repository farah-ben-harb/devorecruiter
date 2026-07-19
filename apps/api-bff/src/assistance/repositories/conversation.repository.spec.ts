import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationRepository } from './conversation.repository';
import { ConversationEntity } from '../entities/conversation.entity';

describe('ConversationRepository', () => {
  let repository: ConversationRepository;

  const typeOrmRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOneOrFail: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationRepository,
        {
          provide: getRepositoryToken(ConversationEntity),
          useValue: typeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<ConversationRepository>(ConversationRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('findAllByUserId should query by user and order by updatedAt desc', async () => {
    typeOrmRepo.find.mockResolvedValue([]);

    await repository.findAllByUserId(3);

    expect(typeOrmRepo.find).toHaveBeenCalledWith({
      where: { userId: 3 },
      order: { updatedAt: 'DESC' },
    });
  });

  it('create should persist created conversation', async () => {
    const entity = { id: 'conv-1', title: 'test', userId: 1 };
    typeOrmRepo.create.mockReturnValue(entity);
    typeOrmRepo.save.mockResolvedValue(entity);

    const result = await repository.create({ title: 'test' }, 1);

    expect(typeOrmRepo.create).toHaveBeenCalledWith({
      title: 'test',
      userId: 1,
    });
    expect(typeOrmRepo.save).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });
});
