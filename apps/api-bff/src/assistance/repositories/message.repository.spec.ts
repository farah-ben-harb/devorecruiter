import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessageRepository } from './message.repository';
import { MessageEntity } from '../entities/message.entity';
import { CreateMessageDto } from '../dtos/create-message.dto';

describe('MessageRepository', () => {
  let repository: MessageRepository;

  const typeOrmRepo = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageRepository,
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: typeOrmRepo,
        },
      ],
    }).compile();

    repository = module.get<MessageRepository>(MessageRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('findByConversationId should query asc by createdAt', async () => {
    typeOrmRepo.find.mockResolvedValue([]);

    await repository.findByConversationId('conv-1');

    expect(typeOrmRepo.find).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      order: { createdAt: 'ASC' },
    });
  });

  it('create should save mapped entity', async () => {
    const dto: CreateMessageDto = {
      conversationId: 'conv-1',
      role: 'user',
      content: 'hello',
    };
    const entity = { id: 'msg-1', ...dto };
    typeOrmRepo.create.mockReturnValue(entity);
    typeOrmRepo.save.mockResolvedValue(entity);

    const result = await repository.create(dto);

    expect(typeOrmRepo.create).toHaveBeenCalledWith(dto);
    expect(typeOrmRepo.save).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });
});
