import {
  SourceDto,
  RhResponseDto,
  MessageDto,
  ConversationHistoryDto,
} from './response.dto';

describe('DTOs - RH Assistant', () => {
  it('should create SourceDto correctly', () => {
    const source: SourceDto = {
      title: 'Doc AI',
      source: 'internal-db',
      page: 12,
    };

    expect(source.title).toBe('Doc AI');
    expect(source.source).toBe('internal-db');
    expect(source.page).toBe(12);
  });

  it('should create RhResponseDto correctly', () => {
    const response: RhResponseDto = {
      response: 'Hello AI',
      sources: [
        {
          title: 'Guide',
          source: 'rag',
          page: '3A',
        },
      ],
      timestamp: new Date(),
      conversationId: 1,
    };

    expect(response.response).toBe('Hello AI');
    expect(response.sources.length).toBe(1);
    expect(response.conversationId).toBe(1);
    expect(response.timestamp).toBeInstanceOf(Date);
  });

  it('should create MessageDto correctly with optional sources', () => {
    const message: MessageDto = {
      id: 1,
      role: 'user',
      content: 'Hello',
      sources: [
        {
          title: 'Ref',
          source: 'system',
          page: 2,
        },
      ],
      createdAt: new Date(),
    };

    expect(message.id).toBe(1);
    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello');
    expect(message.sources?.length).toBe(1);
    expect(message.createdAt).toBeInstanceOf(Date);
  });

  it('should allow MessageDto without sources', () => {
    const message: MessageDto = {
      id: 2,
      role: 'assistant',
      content: 'Hi there',
      createdAt: new Date(),
    };

    expect(message.sources).toBeUndefined();
    expect(message.role).toBe('assistant');
  });

  it('should create ConversationHistoryDto correctly', () => {
    const history: ConversationHistoryDto = {
      conversationId: 10,
      userId: 99,
      messages: [
        {
          id: 1,
          role: 'user',
          content: 'Hello',
          createdAt: new Date(),
        },
      ],
      total: 1,
      createdAt: new Date(),
    };

    expect(history.conversationId).toBe(10);
    expect(history.userId).toBe(99);
    expect(history.messages.length).toBe(1);
    expect(history.total).toBe(1);
    expect(history.createdAt).toBeInstanceOf(Date);
  });
});
