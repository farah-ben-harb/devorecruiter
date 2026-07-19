import { Test, TestingModule } from '@nestjs/testing';
import { AssistanceController } from './assistance.controller';
import { AssistanceService } from '../services/assistance.service';
import { SendChatDto } from '../dtos/chat-message.dto';
import { ConversationEntity } from '../entities/conversation.entity';
import { AuthRequest } from '../../auth/interfaces/auth.interface';
import { Response as ExpressResponse } from 'express';

describe('AssistanceController', () => {
  let controller: AssistanceController;
  let service: jest.Mocked<AssistanceService>;

  const mockUserId = 1;
  const mockId = '550e8400-e29b-41d4-a716-446655440000';

  const mockRequest = {
    user: { id: mockUserId },
  } as AuthRequest;

  const createMockConversation = (title = 'Test'): ConversationEntity => {
    const conv = new ConversationEntity();
    Object.assign(conv, { id: mockId, title, userId: mockUserId });
    return conv;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistanceController],
      providers: [
        {
          provide: AssistanceService,
          useValue: {
            chat: jest.fn().mockResolvedValue({ content: 'response' }),
            generateTitle: jest.fn().mockResolvedValue('Generated Title'),
            getConversations: jest.fn().mockResolvedValue([]),
            createConversation: jest
              .fn()
              .mockResolvedValue(new ConversationEntity()),
            updateConversation: jest
              .fn()
              .mockResolvedValue(new ConversationEntity()),
            deleteConversation: jest.fn().mockResolvedValue(undefined),
            getMessages: jest.fn().mockResolvedValue([]),
            saveMessage: jest.fn().mockResolvedValue(undefined),
            chatStream: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AssistanceController>(AssistanceController);
    service = module.get(AssistanceService);
  });

  describe('chat', () => {
    it('should call service.chat with correct params', async () => {
      const dto: SendChatDto = { conversationId: mockId, messages: [] };
      const expectedResponse = { content: 'AI Response' };
      service.chat.mockResolvedValue(expectedResponse);

      const result = await controller.chat(dto, mockRequest);

      expect(result).toEqual(expectedResponse);
      // Utilisation de l'accès par propriété pour éviter 'unbound-method'
      expect(service['chat']).toHaveBeenCalledWith(dto, mockUserId);
    });
  });

  describe('conversations', () => {
    it('should get all conversations for a user', async () => {
      const conversations = [createMockConversation()];
      service.getConversations.mockResolvedValue(conversations);

      const result = await controller.getConversations(mockRequest);

      expect(result).toEqual(conversations);
      expect(service['getConversations']).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('chatStream', () => {
    it('should setup stream headers and iterate through generator', async () => {
      const dto: SendChatDto = { conversationId: mockId, messages: [] };

      const mockRes = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      } as unknown as jest.Mocked<ExpressResponse>;

      // Correction : On retire 'async' car on n'utilise pas 'await' à l'intérieur
      // On utilise un générateur simple pour simuler le flux
      function* mockGenerator() {
        yield { chunk: 'Hello' };
        yield { chunk: ' World' };
        yield { done: true, title: 'Title' };
      }

      // Le service attend un AsyncGenerator, un générateur synchrone est compatible ici pour le test
      service.chatStream.mockReturnValue(mockGenerator() as any);

      await controller.chatStream(dto, mockRequest, mockRes);

      expect(mockRes['setHeader']).toHaveBeenCalledWith(
        'Content-Type',
        'text/event-stream',
      );
      expect(mockRes['write']).toHaveBeenCalledTimes(3);
      expect(mockRes['end']).toHaveBeenCalled();
    });
  });

  describe('generateTitle', () => {
    it('should return a title object', async () => {
      const message = 'How to use NestJS?';
      service.generateTitle.mockResolvedValue('NestJS Guide');

      const result = await controller.generateTitle(message);

      expect(result).toEqual({ title: 'NestJS Guide' });
      expect(service['generateTitle']).toHaveBeenCalledWith(message);
    });
  });
});
