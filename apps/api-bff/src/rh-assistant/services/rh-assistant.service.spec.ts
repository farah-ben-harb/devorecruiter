import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';

import { RhAssistantService } from './rh-assistant.service';
import { RhAssistantRepository } from '../repositories/rh-assistant.repository';
import { RhConversationEntity } from '../entities/rh_conversations.entity';
import { RhMessageEntity } from '../entities/rh_messages.entity';
import { QuestionDto } from '../dtos/question.dto';
import { IRagApiResponse } from '../interfaces/rh-assistant.interface';

// ====================== TYPES MOCKS ======================
type MockRhAssistantRepository = {
  findActiveConversation: jest.Mock<
    Promise<RhConversationEntity | null>,
    [number]
  >;
  findConversationById: jest.Mock<
    Promise<RhConversationEntity | null>,
    [number, number]
  >;
  createConversation: jest.Mock<Promise<RhConversationEntity>, [number]>;
  saveMessage: jest.Mock<Promise<RhMessageEntity>, [Partial<RhMessageEntity>]>;
  findMessagesByConversation: jest.Mock<Promise<RhMessageEntity[]>, [number]>;
  closeConversation: jest.Mock<Promise<void>, [number]>;
  findAllConversationsByUser: jest.Mock<
    Promise<RhConversationEntity[]>,
    [number]
  >;
  countMessagesByUser: jest.Mock<Promise<number>, [number]>;
  findAllConversationsWithFirstMessage: jest.Mock<
    Promise<RhConversationEntity[]>,
    [number]
  >;
  deleteConversation: jest.Mock<Promise<void>, [number, number]>;
  pinConversation: jest.Mock<Promise<void>, [number, number, boolean]>;
  renameConversation: jest.Mock<Promise<void>, [number, number, string]>;
};

describe('RhAssistantService', () => {
  const ragSecret = 'test-rag-internal-secret-1234567890';
  let service: RhAssistantService;
  let httpService: jest.Mocked<HttpService>;
  let repository: MockRhAssistantRepository;

  const mockConversation: RhConversationEntity = {
    id: 1,
    title: 'Nouvelle conversation',
    userId: 42,
    isActive: true,
    isPinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {} as any, // Relation, pas utile dans les tests
    messages: [],
  };

  const mockMessage: RhMessageEntity = {
    id: 10,
    conversationId: 1,
    role: 'user',
    content: 'Test content',
    sources: null,
    createdAt: new Date(),
    conversation: {} as RhConversationEntity,
  };

  const makeAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse['config'],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RhAssistantService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RhAssistantRepository,
          useValue: {
            findActiveConversation: jest.fn(),
            findConversationById: jest.fn(),
            createConversation: jest.fn(),
            saveMessage: jest.fn(),
            findMessagesByConversation: jest.fn(),
            closeConversation: jest.fn(),
            findAllConversationsByUser: jest.fn(),
            countMessagesByUser: jest.fn(),
            findAllConversationsWithFirstMessage: jest.fn(),
            deleteConversation: jest.fn(),
            pinConversation: jest.fn(),
            renameConversation: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'RAG_INTERNAL_SECRET'
                ? ragSecret
                : 'http://localhost:8000',
            ),
          },
        },
      ],
    }).compile();

    service = module.get<RhAssistantService>(RhAssistantService);
    httpService = module.get(HttpService);
    repository = module.get(RhAssistantRepository) as MockRhAssistantRepository;
  });

  describe('askQuestion', () => {
    it('should use existing active conversation', async () => {
      repository.findActiveConversation.mockResolvedValue(mockConversation);
      repository.saveMessage.mockResolvedValue(mockMessage);
      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            response: "Réponse de l'assistant",
            sources: [],
          } as IRagApiResponse),
        ),
      );

      const dto: QuestionDto = { question: 'Quels sont mes congés ?' };
      const result = await service.askQuestion(42, dto);

      expect(repository.findActiveConversation).toHaveBeenCalledWith(42);
      expect(repository.createConversation).not.toHaveBeenCalled();
      expect(repository.renameConversation).not.toHaveBeenCalled();
      expect(result.response).toBe("Réponse de l'assistant");
      expect(result.sources).toEqual([]);
      expect(result.conversationId).toBe(1);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/chat',
        {
          question: 'Quels sont mes congés ?',
          history: [],
        },
        {
          headers: expect.objectContaining({
            'x-rag-action': 'chat',
            'x-rag-user-id': '42',
            'x-rag-session-id': '1',
            'x-rag-signature': expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        },
      );
    });

    it('should create new conversation and update title with first question', async () => {
      repository.findActiveConversation.mockResolvedValue(null);
      repository.createConversation.mockResolvedValue(mockConversation);
      repository.saveMessage.mockResolvedValue(mockMessage);
      repository.renameConversation.mockResolvedValue(undefined);

      httpService.post.mockReturnValue(
        of(
          makeAxiosResponse({
            response: 'Réponse IA',
            sources: [],
          } as IRagApiResponse),
        ),
      );

      const dto: QuestionDto = {
        question: 'Quelle est la procédure de télétravail chez nous ?',
      };
      const result = await service.askQuestion(42, dto);

      expect(repository.createConversation).toHaveBeenCalledWith(42);
      expect(repository.renameConversation).toHaveBeenCalledWith(
        1,
        42,
        expect.stringContaining('Quelle est la procédure'),
      );
      expect(result.conversationId).toBe(1);
    });

    it('should throw HttpException when RAG service fails', async () => {
      repository.findActiveConversation.mockResolvedValue(mockConversation);

      const axiosError = new AxiosError();
      axiosError.response = {
        data: { detail: 'RAG service unavailable' },
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      } as AxiosResponse;

      httpService.post.mockReturnValue(throwError(() => axiosError));

      const dto: QuestionDto = { question: 'Test erreur' };

      await expect(service.askQuestion(42, dto)).rejects.toThrow(
        'Le service RAG est temporairement indisponible.',
      );
    });
  });

  describe('getHistory', () => {
    it('should return empty history when no active conversation', async () => {
      repository.findActiveConversation.mockResolvedValue(null);

      const result = await service.getHistory(42);

      expect(result.conversationId).toBeNull();
      expect(result.messages).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getConversationById', () => {
    it('loads a conversation only for the authenticated owner', async () => {
      repository.findConversationById.mockResolvedValue(mockConversation);

      const result = await service.getConversationById(1, 42);

      expect(repository.findConversationById).toHaveBeenCalledWith(1, 42);
      expect(result.messages).toEqual([]);
    });

    it('does not expose another user conversation', async () => {
      repository.findConversationById.mockResolvedValue(null);

      await expect(service.getConversationById(1, 99)).rejects.toThrow(
        'Conversation non trouvée.',
      );
      expect(repository.findConversationById).toHaveBeenCalledWith(1, 99);
    });
  });

  describe('resetConversation', () => {
    it('should close active conversation', async () => {
      repository.findActiveConversation.mockResolvedValue(mockConversation);
      repository.closeConversation.mockResolvedValue(undefined);
      httpService.delete.mockReturnValue(of(makeAxiosResponse({})));

      const result = await service.resetConversation(42);

      expect(repository.closeConversation).toHaveBeenCalledWith(1);
      expect(httpService.delete).not.toHaveBeenCalled();
      expect(result.message).toBe('Conversation réinitialisée.');
    });
  });

  describe('getSidebarHistory', () => {
    it('should return conversations with title fallback', async () => {
      repository.findAllConversationsWithFirstMessage.mockResolvedValue([
        mockConversation,
      ]);

      const result = await service.getSidebarHistory(42);

      expect(result.conversations.length).toBe(1);
      expect(result.conversations[0].title).toBe('Nouvelle conversation');
    });
  });
});
