// src/chatbot/services/chatbot.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatbotService } from './chatbot.service';
import { AgentService } from './agent.service';
import { MemoryService } from './memory.service';
import { ChatMessageDto } from '../dtos/chat-message.dto';

function makeAiHistoryEntry(content: string): BaseMessage {
  return ({
    id: ['langchain', 'schema', 'messages', 'AIMessage'],
    kwargs: { content },
  } as unknown) as BaseMessage;
}

function makeChatMessageDto(overrides: Partial<ChatMessageDto> = {}): ChatMessageDto {
  return {
    message: 'Combien de candidats ?',
    sessionId: 'session-1',
    ...overrides,
  };
}

type MockedAgentService = jest.Mocked<Pick<AgentService, 'chat'>>;
type MockedMemoryService = jest.Mocked<Pick<MemoryService, 'getHistory' | 'addExchange' | 'clearHistory'>>;

describe('ChatbotService', () => {
  let service: ChatbotService;
  let agentService: MockedAgentService;
  let memoryService: MockedMemoryService;

  beforeEach(async () => {
    const mockAgentService: MockedAgentService = {
      chat: jest.fn(),
    };

    const mockMemoryService: MockedMemoryService = {
      getHistory: jest.fn(),
      addExchange: jest.fn(),
      clearHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: AgentService, useValue: mockAgentService },
        { provide: MemoryService, useValue: mockMemoryService },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
    agentService = mockAgentService;
    memoryService = mockMemoryService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // processMessage, no pronoun in message

  describe('processMessage without pronoun', () => {
    it('sends the original message to agentService and saves it unchanged', async () => {
      memoryService.getHistory.mockReturnValue([]);
      agentService.chat.mockResolvedValue('Il y a 42 candidats.');

      const dto = makeChatMessageDto({ message: 'Combien de candidats ?', sessionId: 'session-1' });
      const result = await service.processMessage(dto);

      expect(agentService.chat).toHaveBeenCalledWith('Combien de candidats ?', []);
      expect(memoryService.addExchange).toHaveBeenCalledWith(
        'session-1',
        'Combien de candidats ?',
        'Il y a 42 candidats.',
      );
      expect(result.response).toBe('Il y a 42 candidats.');
      expect(result.sessionId).toBe('session-1');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  // processMessage, pronoun resolved from history

  describe('processMessage with pronoun resolution', () => {
    it('replaces the pronoun with the last matched name from history', async () => {
      const history = [makeAiHistoryEntry('Le CV est celui de Wissem Lallahem.')];
      memoryService.getHistory.mockReturnValue(history);
      agentService.chat.mockResolvedValue('Son email est wissem@example.com');

      const dto = makeChatMessageDto({ message: 'Quel est son email ?', sessionId: 'session-1' });
      await service.processMessage(dto);

      expect(agentService.chat).toHaveBeenCalledWith(
        'Quel est de Wissem Lallahem email ?',
        history,
      );
    });

    it('saves the ORIGINAL message in memory, not the resolved one', async () => {
      const history = [makeAiHistoryEntry('Le CV est celui de Wissem Lallahem.')];
      memoryService.getHistory.mockReturnValue(history);
      agentService.chat.mockResolvedValue('Son email est wissem@example.com');

      const dto = makeChatMessageDto({ message: 'Quel est son email ?', sessionId: 'session-1' });
      await service.processMessage(dto);

      expect(memoryService.addExchange).toHaveBeenCalledWith(
        'session-1',
        'Quel est son email ?',
        'Son email est wissem@example.com',
      );
    });

    it('leaves the message unchanged when no name is found in history', async () => {
      memoryService.getHistory.mockReturnValue([makeAiHistoryEntry('Aucune information trouvée.')]);
      agentService.chat.mockResolvedValue('Je ne sais pas.');

      const dto = makeChatMessageDto({ message: 'Quel est son email ?', sessionId: 'session-1' });
      await service.processMessage(dto);

      expect(agentService.chat).toHaveBeenCalledWith(
        'Quel est son email ?',
        [makeAiHistoryEntry('Aucune information trouvée.')],
      );
    });
  });

  // clearHistory

  describe('clearHistory', () => {
    it('delegates to memoryService and returns success', () => {
      const result = service.clearHistory('session-1');

      expect(memoryService.clearHistory).toHaveBeenCalledWith('session-1');
      expect(result).toEqual({ success: true });
    });
  });
});