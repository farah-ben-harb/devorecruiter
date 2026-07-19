import { IRhAssistantRepository } from './rh-assistant.interface';
import { RhConversationEntity } from '../entities/rh_conversations.entity';
import { RhMessageEntity } from '../entities/rh_messages.entity';

describe('IRhAssistantRepository (contract tests)', () => {
  let repository: jest.Mocked<IRhAssistantRepository>;

  beforeEach(() => {
    repository = {
      createConversation: jest
        .fn()
        .mockResolvedValue({} as RhConversationEntity),
      findActiveConversation: jest.fn().mockResolvedValue(null),
      findConversationById: jest.fn().mockResolvedValue(null),
      closeConversation: jest.fn().mockResolvedValue(undefined),
      saveMessage: jest.fn().mockResolvedValue({} as RhMessageEntity),
      findMessagesByConversation: jest.fn().mockResolvedValue([]),
      countMessagesByUser: jest.fn().mockResolvedValue(0),
    };
  });

  it('should create a conversation', async () => {
    const mockConv: RhConversationEntity = { id: 1 } as RhConversationEntity;
    repository.createConversation.mockResolvedValue(mockConv);

    const { createConversation } = repository;
    const result = await repository.createConversation(1);

    expect(createConversation).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockConv);
  });

  it('should return active conversation or null', async () => {
    repository.findActiveConversation.mockResolvedValue(null);

    const { findActiveConversation } = repository;
    const result = await repository.findActiveConversation(1);

    expect(result).toBeNull();
    expect(findActiveConversation).toHaveBeenCalledWith(1);
  });

  it('should save message', async () => {
    const message: RhMessageEntity = { id: 1 } as RhMessageEntity;
    repository.saveMessage.mockResolvedValue(message);

    const { saveMessage } = repository;
    const result = await repository.saveMessage({
      content: 'hello',
    } as RhMessageEntity);

    expect(result).toEqual(message);
    expect(saveMessage).toHaveBeenCalled();
  });

  it('should count messages by user', async () => {
    repository.countMessagesByUser.mockResolvedValue(5);

    const { countMessagesByUser } = repository;
    const result = await repository.countMessagesByUser(10);

    expect(result).toBe(5);
    expect(countMessagesByUser).toHaveBeenCalledWith(10);
  });

  it('should fetch messages by conversation', async () => {
    const messages: RhMessageEntity[] = [];
    repository.findMessagesByConversation.mockResolvedValue(messages);

    const { findMessagesByConversation } = repository;
    const result = await repository.findMessagesByConversation(1);

    expect(result).toEqual(messages);
    expect(findMessagesByConversation).toHaveBeenCalledWith(1);
  });
});
