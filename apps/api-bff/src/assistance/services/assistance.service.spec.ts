import { Test, TestingModule } from '@nestjs/testing';
import { AssistanceService } from './assistance.service';
import { HttpService } from '@nestjs/axios';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { UserMemoryRepository } from '../repositories/user-memory.repository';
import { of } from 'rxjs';
import { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';
import { UserMemoryEntity } from '../entities/user-memory.entity';

describe('AssistanceService', () => {
  let service: AssistanceService;
  let conversationRepo: jest.Mocked<ConversationRepository>;
  let messageRepo: jest.Mocked<MessageRepository>;
  let userMemoryRepo: jest.Mocked<UserMemoryRepository>;
  let httpService: jest.Mocked<HttpService>;

  const mockUserId = 1;
  const mockConversationId = 'conv-123';

  // 1. Helper pour créer une entité complète sans "as any"
  const createMockMessage = (
    overrides: Partial<MessageEntity> = {},
  ): MessageEntity => {
    const message = new MessageEntity();
    Object.assign(message, {
      id: 1,
      content: 'test',
      role: 'user',
      conversationId: mockConversationId,
      createdAt: new Date(),
      ...overrides,
    });
    return message;
  };

  const createMockConversation = (
    overrides: Partial<ConversationEntity> = {},
  ): ConversationEntity => {
    const conv = new ConversationEntity();
    Object.assign(conv, {
      id: mockConversationId,
      title: 'Nouvelle conversation',
      userId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      ...overrides,
    });
    return conv;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistanceService,
        {
          provide: ConversationRepository,
          useValue: {
            findOneById: jest.fn(),
            findAllByUserId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: MessageRepository,
          useValue: {
            findByConversationId: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: UserMemoryRepository,
          useValue: {
            getByUserId: jest.fn(),
            upsert: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AssistanceService>(AssistanceService);
    conversationRepo = module.get(ConversationRepository);
    messageRepo = module.get(MessageRepository);
    userMemoryRepo = module.get(UserMemoryRepository);
    httpService = module.get(HttpService);
  });

  describe('chat', () => {
    const chatDto = {
      conversationId: mockConversationId,
      messages: [{ role: 'user' as const, content: 'Hello' }],
    };

    it('should process chat and return assistant reply', async () => {
      conversationRepo.findOneById.mockResolvedValue(createMockConversation());
      messageRepo.findByConversationId.mockResolvedValue([]);

      const memory = new UserMemoryEntity();
      memory.summary = 'L’utilisateur aime Node.js';
      userMemoryRepo.getByUserId.mockResolvedValue(memory);

      const mockAxiosResponse: AxiosResponse = {
        data: {
          choices: [{ message: { content: 'Réponse Assistant' } }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      };

      httpService.post.mockReturnValue(of(mockAxiosResponse));

      // Correction de l'erreur de scope "this" : on passe une fonction fléchée
      messageRepo.create.mockImplementation(() =>
        Promise.resolve(createMockMessage()),
      );
      const result = await service.chat(chatDto, mockUserId);

      expect(result.content).toBe('Réponse Assistant');
      // On vérifie l'appel via l'objet mocké directement
      expect(messageRepo['create']).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMessages', () => {
    it('should return messages if conversation exists', async () => {
      conversationRepo.findOneById.mockResolvedValue(createMockConversation());

      const mockMessages = [createMockMessage({ content: 'test-content' })];
      messageRepo.findByConversationId.mockResolvedValue(mockMessages);

      const messages = await service.getMessages(
        mockConversationId,
        mockUserId,
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('test-content');
    });
  });

  describe('Private Methods', () => {
    // Utilisation d'un type utilitaire pour mapper les méthodes privées
    type AssistanceServicePrivate = {
      shouldAutoGenerateTitle(title: string): boolean;
      fallbackTitleFromMessage(message: string): string;
    };

    it('should fallback to first 5 words for title', () => {
      const privates = service as unknown as AssistanceServicePrivate;
      const message = 'Un long message pour tester le titre';
      expect(privates.fallbackTitleFromMessage(message)).toBe(
        'Un long message pour tester',
      );
    });
  });
});
