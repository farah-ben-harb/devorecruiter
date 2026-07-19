import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RhAssistantRepository } from './rh-assistant.repository';
import { RhConversationEntity } from '../entities/rh_conversations.entity';
import { RhMessageEntity } from '../entities/rh_messages.entity';

function mockRepo<T extends object>(): jest.Mocked<
  Pick<
    Repository<T>,
    'create' | 'save' | 'findOne' | 'update' | 'delete' | 'find'
  >
> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };
}

describe('RhAssistantRepository', () => {
  let repository: RhAssistantRepository;
  let convRepo: jest.Mocked<
    Pick<
      Repository<RhConversationEntity>,
      'create' | 'save' | 'findOne' | 'update' | 'delete' | 'find'
    >
  >;
  let msgRepo: jest.Mocked<
    Pick<Repository<RhMessageEntity>, 'create' | 'save' | 'find'>
  > & {
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    convRepo = mockRepo<RhConversationEntity>();
    msgRepo = {
      ...mockRepo<RhMessageEntity>(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RhAssistantRepository,
        {
          provide: getRepositoryToken(RhConversationEntity),
          useValue: convRepo,
        },
        { provide: getRepositoryToken(RhMessageEntity), useValue: msgRepo },
      ],
    }).compile();

    repository = module.get(RhAssistantRepository);
  });

  it('should create conversation', async () => {
    const conv: RhConversationEntity = {
      id: 1,
      userId: 1,
    } as RhConversationEntity;

    convRepo.create.mockReturnValue(conv);
    convRepo.save.mockResolvedValue(conv);

    const result = await repository.createConversation(1);

    const { create } = convRepo;
    expect(create).toHaveBeenCalledWith({ userId: 1, isActive: true });
    expect(result).toEqual(conv);
  });

  it('should find active conversation', async () => {
    const conv: RhConversationEntity = { id: 1 } as RhConversationEntity;
    convRepo.findOne.mockResolvedValue(conv);

    const result = await repository.findActiveConversation(1);

    const { findOne } = convRepo;
    expect(findOne).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should close conversation', async () => {
    convRepo.update.mockResolvedValue({
      affected: 1,
      raw: {},
      generatedMaps: [],
    });

    await repository.closeConversation(1);

    const { update } = convRepo;
    expect(update).toHaveBeenCalledWith(1, { isActive: false });
  });

  it('should save message', async () => {
    const msg: RhMessageEntity = { id: 1 } as RhMessageEntity;

    msgRepo.create.mockReturnValue(msg);
    msgRepo.save.mockResolvedValue(msg);

    const result = await repository.saveMessage({ content: 'hello' });

    const { create } = msgRepo;
    expect(create).toHaveBeenCalled();
    expect(result).toEqual(msg);
  });

  it('should find messages by conversation', async () => {
    const msgs: RhMessageEntity[] = [{ id: 1 } as RhMessageEntity];
    msgRepo.find.mockResolvedValue(msgs);

    const result = await repository.findMessagesByConversation(1);

    const { find } = msgRepo;
    expect(find).toHaveBeenCalledWith({
      where: { conversationId: 1 },
      order: { createdAt: 'ASC' },
    });
    expect(result.length).toBe(1);
  });

  it('should count messages by user', async () => {
    const mockQueryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(5),
    };

    msgRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const result = await repository.countMessagesByUser(1);

    const { createQueryBuilder } = msgRepo;
    expect(createQueryBuilder).toHaveBeenCalledWith('message');
    expect(result).toBe(5);
  });

  it('should find all conversations by user', async () => {
    const convs: RhConversationEntity[] = [{ id: 1 } as RhConversationEntity];
    convRepo.find.mockResolvedValue(convs);

    const result = await repository.findAllConversationsByUser(1);

    const { find } = convRepo;
    expect(find).toHaveBeenCalledWith({
      where: { userId: 1 },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });
    expect(result.length).toBe(1);
  });

  it('should delete conversation', async () => {
    convRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

    await repository.deleteConversation(1, 2);

    const { delete: deleteFn } = convRepo;
    expect(deleteFn).toHaveBeenCalledWith({ id: 1, userId: 2 });
  });

  it('should pin conversation', async () => {
    convRepo.update.mockResolvedValue({
      affected: 1,
      raw: {},
      generatedMaps: [],
    });

    await repository.pinConversation(1, 2, true);

    const { update } = convRepo;
    expect(update).toHaveBeenCalledWith(
      { id: 1, userId: 2 },
      { isPinned: true },
    );
  });
});
