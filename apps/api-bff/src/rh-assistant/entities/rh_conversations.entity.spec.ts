import { RhConversationEntity } from './rh_conversations.entity';
import { RhMessageEntity } from './rh_messages.entity';
import { User } from '../../users/entities/user.entity';

describe('RhConversationEntity', () => {
  it('should create a valid conversation entity', () => {
    const conversation = new RhConversationEntity();

    conversation.id = 1;
    conversation.userId = 10;
    conversation.isActive = true;
    conversation.isPinned = false;
    conversation.createdAt = new Date();
    conversation.updatedAt = new Date();

    expect(conversation).toBeDefined();
    expect(conversation.id).toBe(1);
    expect(conversation.userId).toBe(10);
    expect(conversation.isActive).toBe(true);
    expect(conversation.isPinned).toBe(false);
    expect(conversation.createdAt).toBeInstanceOf(Date);
    expect(conversation.updatedAt).toBeInstanceOf(Date);
  });

  it('should assign a user relation', () => {
    const conversation = new RhConversationEntity();
    const user = new User();

    Object.assign(user, { id: 99 });
    conversation.user = user;

    expect(conversation.user).toBeDefined();
    expect(conversation.user.id).toBe(99);
  });

  it('should initialize messages array', () => {
    const conversation = new RhConversationEntity();
    const message = new RhMessageEntity();

    message.id = 1;
    message.content = 'Hello';
    conversation.messages = [message];

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]?.content).toBe('Hello');
  });

  it('should allow empty messages list', () => {
    const conversation = new RhConversationEntity();
    conversation.messages = [];
    expect(conversation.messages).toEqual([]);
  });

  it('should support default boolean values', () => {
    const conversation = new RhConversationEntity();
    conversation.isActive = true;
    conversation.isPinned = false;

    expect(typeof conversation.isActive).toBe('boolean');
    expect(typeof conversation.isPinned).toBe('boolean');
  });

  it('should validate relation consistency with userId', () => {
    const conversation = new RhConversationEntity();
    conversation.userId = 5;

    const user = new User();
    Object.assign(user, { id: 5 });
    conversation.user = user;

    expect(conversation.userId).toBe(conversation.user.id);
  });
});
