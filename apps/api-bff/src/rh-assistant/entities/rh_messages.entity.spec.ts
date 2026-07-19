import { RhMessageEntity } from './rh_messages.entity';
import { RhConversationEntity } from './rh_conversations.entity';

describe('RhMessageEntity', () => {
  it('should create a valid message entity', () => {
    const message = new RhMessageEntity();

    message.id = 1;
    message.conversationId = 10;
    message.role = 'user';
    message.content = 'Hello assistant';
    message.sources = [
      {
        title: 'Doc AI',
        source: 'internal-db',
        page: 2,
      },
    ];
    message.createdAt = new Date();

    expect(message).toBeDefined();
    expect(message.id).toBe(1);
    expect(message.conversationId).toBe(10);
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello assistant');
    expect(message.sources?.length).toBe(1);
    expect(message.createdAt).toBeInstanceOf(Date);
  });

  it('should allow assistant role', () => {
    const message = new RhMessageEntity();

    message.role = 'assistant';
    message.content = 'I am the assistant';

    expect(message.role).toBe('assistant');
  });

  it('should accept null sources', () => {
    const message = new RhMessageEntity();

    message.sources = null;

    expect(message.sources).toBeNull();
  });

  it('should define conversation relation object', () => {
    const message = new RhMessageEntity();

    const conversation = new RhConversationEntity();
    conversation.id = 99;

    message.conversation = conversation;

    expect(message.conversation).toBeDefined();
    expect(message.conversation.id).toBe(99);
  });

  it('should validate structure of sources object', () => {
    const message = new RhMessageEntity();

    message.sources = [
      {
        title: 'API Guide',
        source: 'rag-system',
        page: '12A',
      },
    ];

    const source = message.sources[0];

    expect(source.title).toBe('API Guide');
    expect(source.source).toBe('rag-system');
    expect(
      typeof source.page === 'string' || typeof source.page === 'number',
    ).toBe(true);
  });
});
