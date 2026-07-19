// src/unified-assistant/services/unified-assistant.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedAssistantService } from './unified-assistant.service';
import { ClassifierService } from './classifier.service';
import { AssistanceService } from '../../assistance/services/assistance.service';
import { RhAssistantService } from '../../rh-assistant/services/rh-assistant.service';
import { ChatbotService } from '../../chatbot/services/chatbot.service';
import { SendChatDto } from '../../assistance/dtos/chat-message.dto';
import { ConversationEntity } from '../../assistance/entities/conversation.entity';
import { RhResponseDto } from '../../rh-assistant/dtos/response.dto';

// Types we don't have exact source for: pull from the real class signatures
type ChatbotProcessInput = Parameters<ChatbotService['processMessage']>[0];
type ChatbotProcessOutput = Awaited<ReturnType<ChatbotService['processMessage']>>;
type RhSidebarHistory = Awaited<ReturnType<RhAssistantService['getSidebarHistory']>>;
type RhConversationById = Awaited<ReturnType<RhAssistantService['getConversationById']>>;
type RhStats = Awaited<ReturnType<RhAssistantService['getStats']>>;

// Helpers

function makeSendChatDto(overrides: Partial<SendChatDto> = {}): SendChatDto {
  return {
    conversationId: 'conv-1',
    messages: [{ role: 'user', content: 'Comment configurer Docker ?' }],
    ...overrides,
  };
}

function makeConversationEntity(overrides: Partial<ConversationEntity> = {}): ConversationEntity {
  return {
    id: 'conv-1',
    title: 'Nouvelle conversation',
    userId: 1,
    isPinned: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    user: {} as ConversationEntity['user'],
    messages: [],
    ...overrides,
  };
}

function makeRhResponse(overrides: Partial<RhResponseDto> = {}): RhResponseDto {
  return {
    response: 'Vous avez 30 jours de congés.',
    sources: [],
    timestamp: new Date('2024-01-01T00:00:00.000Z'),
    conversationId: 5,
    ...overrides,
  };
}

async function collectStream<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) items.push(item);
  return items;
}

async function* makeAsyncEvents<T>(events: T[]): AsyncGenerator<T> {
  for (const e of events) yield e;
}

// Mock types

type MockedClassifierService = jest.Mocked<Pick<ClassifierService, 'classify'>>;

type MockedAssistanceService = jest.Mocked<
  Pick<
    AssistanceService,
    | 'chat'
    | 'chatStream'
    | 'getMessages'
    | 'getConversations'
    | 'createConversation'
    | 'updateConversation'
    | 'deleteConversation'
    | 'generateTitle'
  >
>;

type MockedRhAssistantService = jest.Mocked<
  Pick<
    RhAssistantService,
    | 'askQuestion'
    | 'getHistory'
    | 'getSidebarHistory'
    | 'getConversationById'
    | 'deleteConversation'
    | 'pinConversation'
    | 'renameConversation'
    | 'resetConversation'
    | 'getStats'
  >
>;

type MockedChatbotService = jest.Mocked<Pick<ChatbotService, 'processMessage'>>;

describe('UnifiedAssistantService', () => {
  let service: UnifiedAssistantService;
  let classifierService: MockedClassifierService;
  let assistanceService: MockedAssistanceService;
  let rhAssistantService: MockedRhAssistantService;
  let chatbotService: MockedChatbotService;

  beforeEach(async () => {
    const mockClassifierService: MockedClassifierService = {
      classify: jest.fn(),
    };

    const mockAssistanceService: MockedAssistanceService = {
      chat: jest.fn(),
      chatStream: jest.fn(),
      getMessages: jest.fn(),
      getConversations: jest.fn(),
      createConversation: jest.fn(),
      updateConversation: jest.fn(),
      deleteConversation: jest.fn(),
      generateTitle: jest.fn(),
    };

    const mockRhAssistantService: MockedRhAssistantService = {
      askQuestion: jest.fn(),
      getHistory: jest.fn(),
      getSidebarHistory: jest.fn(),
      getConversationById: jest.fn(),
      deleteConversation: jest.fn(),
      pinConversation: jest.fn(),
      renameConversation: jest.fn(),
      resetConversation: jest.fn(),
      getStats: jest.fn(),
    };

    const mockChatbotService: MockedChatbotService = {
      processMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedAssistantService,
        { provide: ClassifierService, useValue: mockClassifierService },
        { provide: AssistanceService, useValue: mockAssistanceService },
        { provide: RhAssistantService, useValue: mockRhAssistantService },
        { provide: ChatbotService, useValue: mockChatbotService },
      ],
    }).compile();

    service = module.get<UnifiedAssistantService>(UnifiedAssistantService);
    classifierService = mockClassifierService;
    assistanceService = mockAssistanceService;
    rhAssistantService = mockRhAssistantService;
    chatbotService = mockChatbotService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // classify

  describe('classify', () => {
    it('delegates to classifierService', async () => {
      classifierService.classify.mockResolvedValue('it');

      const result = await service.classify('Comment utiliser Docker ?');

      expect(classifierService.classify).toHaveBeenCalledWith('Comment utiliser Docker ?');
      expect(result).toBe('it');
    });
  });

  // chat

  describe('chat', () => {
    it('routes to chatbotService when mode is db', async () => {
      const dto = makeSendChatDto({ conversationId: 'conv-1' });
      classifierService.classify.mockResolvedValue('db');
      const chatbotOutput: ChatbotProcessOutput = {
        response: 'Il y a 12 candidats.',
        sessionId: 'conv-1',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      };
      chatbotService.processMessage.mockResolvedValue(chatbotOutput);

      const result = await service.chat(dto, 7);

      const expectedInput: ChatbotProcessInput = {
        message: 'Comment configurer Docker ?',
        sessionId: 'conv-1',
      };
      expect(chatbotService.processMessage).toHaveBeenCalledWith(expectedInput);
      expect(result).toEqual({
        content: 'Il y a 12 candidats.',
        mode: 'db',
        conversationId: 'conv-1',
      });
    });

    it('uses fallback sessionId when conversationId is undefined for db mode', async () => {
      const dto = makeSendChatDto({ conversationId: undefined });
      classifierService.classify.mockResolvedValue('db');
      chatbotService.processMessage.mockResolvedValue({
        response: 'Réponse',
        sessionId: 'user-7',
        timestamp: new Date(),
      });

      await service.chat(dto, 7);

      expect(chatbotService.processMessage).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'user-7' }),
      );
    });

    it('routes to rhAssistantService when mode is rh', async () => {
      const dto = makeSendChatDto({ messages: [{ role: 'user', content: 'Combien de jours de congés ?' }] });
      classifierService.classify.mockResolvedValue('rh');
      const rhResponse = makeRhResponse();
      rhAssistantService.askQuestion.mockResolvedValue(rhResponse);

      const result = await service.chat(dto, 7);

      expect(rhAssistantService.askQuestion).toHaveBeenCalledWith(7, {
        question: 'Combien de jours de congés ?',
      });
      expect(result).toEqual({
        content: rhResponse.response,
        sources: rhResponse.sources,
        conversationId: rhResponse.conversationId,
        mode: 'rh',
      });
    });

    it('routes to assistanceService when mode is it', async () => {
      const dto = makeSendChatDto();
      classifierService.classify.mockResolvedValue('it');
      assistanceService.chat.mockResolvedValue({ content: 'Utilise docker-compose.', title: 'Docker Setup' });

      const result = await service.chat(dto, 7);

      expect(assistanceService.chat).toHaveBeenCalledWith(dto, 7);
      expect(result).toEqual({
        content: 'Utilise docker-compose.',
        title: 'Docker Setup',
        mode: 'it',
      });
    });

    it('uses the last user message for classification', async () => {
      const dto = makeSendChatDto({
        messages: [
          { role: 'user', content: 'Premier message' },
          { role: 'assistant', content: 'Réponse' },
          { role: 'user', content: 'Deuxième message' },
        ],
      });
      classifierService.classify.mockResolvedValue('it');
      assistanceService.chat.mockResolvedValue({ content: 'ok' });

      await service.chat(dto, 7);

      expect(classifierService.classify).toHaveBeenCalledWith('Deuxième message');
    });
  });

  // chatStream

  describe('chatStream', () => {
    it('yields mode then chunks then done for db mode', async () => {
      const dto = makeSendChatDto({ conversationId: 'conv-1' });
      classifierService.classify.mockResolvedValue('db');
      chatbotService.processMessage.mockResolvedValue({
        response: 'ok super',
        sessionId: 'conv-1',
        timestamp: new Date(),
      });

      const events = await collectStream(service.chatStream(dto, 7));

      expect(events[0]).toEqual({ mode: 'db' });
      expect(events[events.length - 1]).toEqual({ done: true, mode: 'db' });
      expect(events.some((e) => e.chunk === 'ok ')).toBe(true);
      expect(events.some((e) => e.chunk === 'super ')).toBe(true);
    });

    it('yields mode, content and done for rh mode', async () => {
      const dto = makeSendChatDto();
      classifierService.classify.mockResolvedValue('rh');
      const rhResponse = makeRhResponse();
      rhAssistantService.askQuestion.mockResolvedValue(rhResponse);

      const events = await collectStream(service.chatStream(dto, 7));

      expect(events).toEqual([
        { mode: 'rh' },
        {
          chunk: rhResponse.response,
          sources: rhResponse.sources,
          conversationId: rhResponse.conversationId,
        },
        { done: true, mode: 'rh' },
      ]);
    });

    it('reuses existing conversation for it mode when conversationId is valid', async () => {
      const dto = makeSendChatDto({ conversationId: 'conv-1' });
      classifierService.classify.mockResolvedValue('it');
      assistanceService.getMessages.mockResolvedValue([]);
      assistanceService.chatStream.mockImplementation(() =>
        makeAsyncEvents([{ chunk: 'Salut ' }, { done: true }]),
      );

      const events = await collectStream(service.chatStream(dto, 7));

      expect(assistanceService.getMessages).toHaveBeenCalledWith('conv-1', 7);
      expect(assistanceService.createConversation).not.toHaveBeenCalled();
      expect(assistanceService.chatStream).toHaveBeenCalledWith(dto, 7);
      expect(events).toEqual([
        { mode: 'it' },
        { chunk: 'Salut ', mode: 'it' },
        { done: true, mode: 'it' },
      ]);
    });

    it('creates a new conversation for it mode when conversationId is empty', async () => {
      const dto = makeSendChatDto({ conversationId: '' });
      classifierService.classify.mockResolvedValue('it');
      const newConv = makeConversationEntity({ id: 'conv-new' });
      assistanceService.createConversation.mockResolvedValue(newConv);
      assistanceService.chatStream.mockImplementation(() => makeAsyncEvents([{ done: true }]));

      await collectStream(service.chatStream(dto, 7));

      expect(assistanceService.getMessages).not.toHaveBeenCalled();
      expect(assistanceService.createConversation).toHaveBeenCalledWith(
        { title: 'Nouvelle conversation' },
        7,
      );
      expect(assistanceService.chatStream).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-new' }),
        7,
      );
    });

    it('creates a new conversation for it mode when getMessages throws (unknown conversationId)', async () => {
      const dto = makeSendChatDto({ conversationId: 'conv-unknown' });
      classifierService.classify.mockResolvedValue('it');
      assistanceService.getMessages.mockRejectedValue(new Error('not found'));
      const newConv = makeConversationEntity({ id: 'conv-new' });
      assistanceService.createConversation.mockResolvedValue(newConv);
      assistanceService.chatStream.mockImplementation(() => makeAsyncEvents([{ done: true }]));

      await collectStream(service.chatStream(dto, 7));

      expect(assistanceService.createConversation).toHaveBeenCalledWith(
        { title: 'Nouvelle conversation' },
        7,
      );
    });
  });

  // IT delegations

  describe('IT delegations', () => {
    it('getConversations delegates to assistanceService', () => {
      const conversations = [makeConversationEntity()];
      assistanceService.getConversations.mockResolvedValue(conversations);

      const result = service.getConversations(7);

      expect(assistanceService.getConversations).toHaveBeenCalledWith(7);
      expect(result).resolves.toBe(conversations);
    });

    it('getMessages delegates to assistanceService', () => {
      assistanceService.getMessages.mockResolvedValue([]);

      service.getMessages('conv-1', 7);

      expect(assistanceService.getMessages).toHaveBeenCalledWith('conv-1', 7);
    });

    it('createConversation delegates to assistanceService', () => {
      const dto = { title: 'Nouvelle discussion' };
      const created = makeConversationEntity({ title: 'Nouvelle discussion' });
      assistanceService.createConversation.mockResolvedValue(created);

      service.createConversation(dto, 7);

      expect(assistanceService.createConversation).toHaveBeenCalledWith(dto, 7);
    });

    it('updateConversation delegates to assistanceService', () => {
      const dto = { title: 'Titre modifié' };
      assistanceService.updateConversation.mockResolvedValue(makeConversationEntity());

      service.updateConversation('conv-1', dto, 7);

      expect(assistanceService.updateConversation).toHaveBeenCalledWith('conv-1', dto, 7);
    });

    it('deleteConversation delegates to assistanceService', () => {
      assistanceService.deleteConversation.mockResolvedValue(undefined);

      service.deleteConversation('conv-1', 7);

      expect(assistanceService.deleteConversation).toHaveBeenCalledWith('conv-1', 7);
    });

    it('generateTitle delegates to assistanceService', () => {
      assistanceService.generateTitle.mockResolvedValue('Titre généré');

      service.generateTitle('Comment configurer Docker ?');

      expect(assistanceService.generateTitle).toHaveBeenCalledWith('Comment configurer Docker ?');
    });
  });

  // RH delegations

  describe('RH delegations', () => {
    it('getRhHistory delegates to rhAssistantService', () => {
      rhAssistantService.getHistory.mockResolvedValue({
        conversationId: null,
        userId: 7,
        messages: [],
        total: 0,
        createdAt: null,
      });

      service.getRhHistory(7);

      expect(rhAssistantService.getHistory).toHaveBeenCalledWith(7);
    });

    it('getRhSidebarHistory delegates to rhAssistantService', () => {
      const sidebar: RhSidebarHistory = { conversations: [] };
      rhAssistantService.getSidebarHistory.mockResolvedValue(sidebar);

      service.getRhSidebarHistory(7);

      expect(rhAssistantService.getSidebarHistory).toHaveBeenCalledWith(7);
    });

    it('getRhConversationById delegates to rhAssistantService', () => {
      const conv: RhConversationById = { conversationId: 5, messages: [], userId: 7 };
      rhAssistantService.getConversationById.mockResolvedValue(conv);

      service.getRhConversationById(5, 7);

      expect(rhAssistantService.getConversationById).toHaveBeenCalledWith(5, 7);
    });

    it('deleteRhConversation delegates to rhAssistantService', () => {
      rhAssistantService.deleteConversation.mockResolvedValue({ message: 'Conversation supprimée.' });

      service.deleteRhConversation(5, 7);

      expect(rhAssistantService.deleteConversation).toHaveBeenCalledWith(5, 7);
    });

    it('pinRhConversation delegates to rhAssistantService', () => {
      rhAssistantService.pinConversation.mockResolvedValue({ message: 'Conversation épinglée.' });

      service.pinRhConversation(5, 7, true);

      expect(rhAssistantService.pinConversation).toHaveBeenCalledWith(5, 7, true);
    });

    it('renameRhConversation delegates to rhAssistantService', () => {
      rhAssistantService.renameConversation.mockResolvedValue({ message: 'Conversation renommée.' });

      service.renameRhConversation(5, 7, 'Nouveau titre');

      expect(rhAssistantService.renameConversation).toHaveBeenCalledWith(5, 7, 'Nouveau titre');
    });

    it('resetRhConversation delegates to rhAssistantService', () => {
      rhAssistantService.resetConversation.mockResolvedValue({ message: 'Conversation réinitialisée.' });

      service.resetRhConversation(7);

      expect(rhAssistantService.resetConversation).toHaveBeenCalledWith(7);
    });

    it('getRhStats delegates to rhAssistantService', () => {
      const stats: RhStats = { totalConversations: 3, totalMessages: 20, userId: 7 };
      rhAssistantService.getStats.mockResolvedValue(stats);

      service.getRhStats(7);

      expect(rhAssistantService.getStats).toHaveBeenCalledWith(7);
    });
  });
});