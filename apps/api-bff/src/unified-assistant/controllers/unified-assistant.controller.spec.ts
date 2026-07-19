// src/unified-assistant/controllers/unified-assistant.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { UnifiedAssistantController } from './unified-assistant.controller';
import { UnifiedAssistantService } from '../services/unified-assistant.service';
import { SendChatDto } from '../../assistance/dtos/chat-message.dto';
import { CreateConversationDto } from '../../assistance/dtos/create-conversation.dto';
import { UpdateConversationDto } from '../../assistance/dtos/update-conversation.dto';
import type { AuthRequest, GoogleAuthenticatedUser } from '../../auth/interfaces/auth.interface';

// Helpers

function makeAuthenticatedUser(overrides: Partial<GoogleAuthenticatedUser> = {}): GoogleAuthenticatedUser {
  return {
    id: 1,
    googleAccessToken: 'token-abc',
    ...overrides,
  } as GoogleAuthenticatedUser;
}

function makeAuthRequest(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    user: makeAuthenticatedUser(),
    ...overrides,
  } as AuthRequest;
}

function makeSendChatDto(overrides: Partial<SendChatDto> = {}): SendChatDto {
  return {
    conversationId: 'conv-1',
    messages: [{ role: 'user', content: 'Salut' }],
    ...overrides,
  };
}

// Small fake Express response, only what the controller uses

type MockExpressResponse = jest.Mocked<
  Pick<ExpressResponse, 'setHeader' | 'flushHeaders' | 'write' | 'end'>
>;

function makeMockResponse(): MockExpressResponse {
  return {
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  } as MockExpressResponse;
}

async function* makeAsyncEvents<T>(events: T[]): AsyncGenerator<T> {
  for (const e of events) yield e;
}

// Mock type for the service

type MockedUnifiedAssistantService = jest.Mocked<
  Pick<
    UnifiedAssistantService,
    | 'chat'
    | 'chatStream'
    | 'getConversations'
    | 'createConversation'
    | 'updateConversation'
    | 'deleteConversation'
    | 'getMessages'
    | 'generateTitle'
    | 'getRhHistory'
    | 'getRhSidebarHistory'
    | 'getRhStats'
    | 'resetRhConversation'
    | 'getRhConversationById'
    | 'deleteRhConversation'
    | 'pinRhConversation'
    | 'renameRhConversation'
  >
>;

describe('UnifiedAssistantController', () => {
  let controller: UnifiedAssistantController;
  let service: MockedUnifiedAssistantService;

  beforeEach(async () => {
    const mockService: MockedUnifiedAssistantService = {
      chat: jest.fn(),
      chatStream: jest.fn(),
      getConversations: jest.fn(),
      createConversation: jest.fn(),
      updateConversation: jest.fn(),
      deleteConversation: jest.fn(),
      getMessages: jest.fn(),
      generateTitle: jest.fn(),
      getRhHistory: jest.fn(),
      getRhSidebarHistory: jest.fn(),
      getRhStats: jest.fn(),
      resetRhConversation: jest.fn(),
      getRhConversationById: jest.fn(),
      deleteRhConversation: jest.fn(),
      pinRhConversation: jest.fn(),
      renameRhConversation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnifiedAssistantController],
      providers: [{ provide: UnifiedAssistantService, useValue: mockService }],
    }).compile();

    controller = module.get<UnifiedAssistantController>(UnifiedAssistantController);
    service = mockService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // chat

  describe('chat', () => {
    it('calls service.chat with dto and userId', async () => {
      const dto = makeSendChatDto();
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });
      service.chat.mockResolvedValue({ content: 'ok', mode: 'it' });

      const result = await controller.chat(dto, req);

      expect(service.chat).toHaveBeenCalledWith(dto, 7);
      expect(result).toEqual({ content: 'ok', mode: 'it' });
    });

    it('throws UnauthorizedException when user is missing', async () => {
      const dto = makeSendChatDto();
      const req = makeAuthRequest({ user: undefined });

      await expect(controller.chat(dto, req)).rejects.toThrow(UnauthorizedException);
      expect(service.chat).not.toHaveBeenCalled();
    });
  });

  // chatStream

  describe('chatStream', () => {
    it('sets SSE headers and writes each event to the response', async () => {
      const dto = makeSendChatDto();
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });
      const res = makeMockResponse();

      service.chatStream.mockImplementation(() =>
        makeAsyncEvents([{ mode: 'it' }, { chunk: 'Salut ' }, { done: true }]),
      );

      await controller.chatStream(dto, req, res as unknown as ExpressResponse);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(res.flushHeaders).toHaveBeenCalled();

      expect(res.write).toHaveBeenCalledTimes(3);
      expect(res.write).toHaveBeenNthCalledWith(1, `data: ${JSON.stringify({ mode: 'it' })}\n\n`);
      expect(res.write).toHaveBeenNthCalledWith(2, `data: ${JSON.stringify({ chunk: 'Salut ' })}\n\n`);
      expect(res.write).toHaveBeenNthCalledWith(3, `data: ${JSON.stringify({ done: true })}\n\n`);
      expect(res.end).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user is missing, before touching the response', async () => {
      const dto = makeSendChatDto();
      const req = makeAuthRequest({ user: undefined });
      const res = makeMockResponse();

      await expect(
        controller.chatStream(dto, req, res as unknown as ExpressResponse),
      ).rejects.toThrow(UnauthorizedException);

      expect(res.setHeader).not.toHaveBeenCalled();
      expect(service.chatStream).not.toHaveBeenCalled();
    });
  });

  // IT conversations

  describe('IT conversations', () => {
    it('getItConversations delegates with userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });
      service.getConversations.mockResolvedValue([]);

      controller.getItConversations(req);

      expect(service.getConversations).toHaveBeenCalledWith(7);
    });

    it('createItConversation delegates with dto and userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });
      const dto: CreateConversationDto = { title: 'Nouvelle discussion' };

      controller.createItConversation(dto, req);

      expect(service.createConversation).toHaveBeenCalledWith(dto, 7);
    });

    it('updateItConversation delegates with id, dto and userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });
      const dto: UpdateConversationDto = { title: 'Titre modifié' };

      controller.updateItConversation('conv-1', dto, req);

      expect(service.updateConversation).toHaveBeenCalledWith('conv-1', dto, 7);
    });

    it('deleteItConversation delegates with id and userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.deleteItConversation('conv-1', req);

      expect(service.deleteConversation).toHaveBeenCalledWith('conv-1', 7);
    });

    it('getItMessages delegates with id and userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.getItMessages('conv-1', req);

      expect(service.getMessages).toHaveBeenCalledWith('conv-1', 7);
    });

    it('generateTitle returns a title object', async () => {
      service.generateTitle.mockResolvedValue('Titre généré');

      const result = await controller.generateTitle('Comment configurer Docker ?');

      expect(service.generateTitle).toHaveBeenCalledWith('Comment configurer Docker ?');
      expect(result).toEqual({ title: 'Titre généré' });
    });
  });

  // RH conversations

  describe('RH conversations', () => {
    it('getRhHistory delegates with userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.getRhHistory(req);

      expect(service.getRhHistory).toHaveBeenCalledWith(7);
    });

    it('getRhSidebarHistory delegates with userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.getRhSidebarHistory(req);

      expect(service.getRhSidebarHistory).toHaveBeenCalledWith(7);
    });

    it('getRhStats delegates with userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.getRhStats(req);

      expect(service.getRhStats).toHaveBeenCalledWith(7);
    });

    it('resetRhConversation delegates with userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.resetRhConversation(req);

      expect(service.resetRhConversation).toHaveBeenCalledWith(7);
    });

    it('getRhConversation delegates with id and userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.getRhConversation(5, req);

      expect(service.getRhConversationById).toHaveBeenCalledWith(5, 7);
    });

    it('deleteRhConversation delegates with id and userId', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.deleteRhConversation(5, req);

      expect(service.deleteRhConversation).toHaveBeenCalledWith(5, 7);
    });

    it('pinRhConversation delegates with id, userId and isPinned', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.pinRhConversation(5, { isPinned: true }, req);

      expect(service.pinRhConversation).toHaveBeenCalledWith(5, 7, true);
    });

    it('renameRhConversation delegates with id, userId and title', () => {
      const req = makeAuthRequest({ user: makeAuthenticatedUser({ id: 7 }) });

      controller.renameRhConversation(5, { title: 'Nouveau titre' }, req);

      expect(service.renameRhConversation).toHaveBeenCalledWith(5, 7, 'Nouveau titre');
    });
  });
});