import { Test, TestingModule } from '@nestjs/testing';
import { RhAssistantController } from './rh-assistant.controller';
import { RhAssistantService } from '../services/rh-assistant.service';
import {
  RequestWithUser,
  ConversationHistoryDto,
} from '../interfaces/rh-assistant.interface';
import { QuestionDto } from '../dtos/question.dto';
import { RhResponseDto } from '../dtos/response.dto';

describe('RhAssistantController', () => {
  let controller: RhAssistantController;
  let service: jest.Mocked<RhAssistantService>;

  const mockReq = {
    user: { id: 42, email: 'test@test.com', role: 'user' },
  } as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RhAssistantController],
      providers: [
        {
          provide: RhAssistantService,
          useValue: {
            askQuestion: jest.fn().mockResolvedValue({} as RhResponseDto),
            getHistory: jest
              .fn()
              .mockResolvedValue({} as ConversationHistoryDto),
            getStats: jest.fn().mockResolvedValue({
              totalConversations: 0,
              totalMessages: 0,
              userId: 0,
            }),
            resetConversation: jest.fn().mockResolvedValue({ message: '' }),
            getSidebarHistory: jest
              .fn()
              .mockResolvedValue({ conversations: [] }),
            getConversationById: jest.fn().mockResolvedValue({
              conversationId: 0,
              messages: [],
              userId: 0,
            }),
            deleteConversation: jest.fn().mockResolvedValue({ message: '' }),
            pinConversation: jest.fn().mockResolvedValue({ message: '' }),
          },
        },
      ],
    }).compile();

    controller = module.get<RhAssistantController>(RhAssistantController);
    service = module.get(RhAssistantService);
  });

  it('should ask question', async () => {
    const dto: QuestionDto = { question: 'Hello' };
    const mockResponse: RhResponseDto = {
      response: 'hi',
      sources: [],
      timestamp: new Date(),
      conversationId: 1,
    };
    service.askQuestion.mockResolvedValue(mockResponse);

    const { askQuestion } = service;
    const result = await controller.ask(dto, mockReq);

    expect(askQuestion).toHaveBeenCalledWith(42, dto);
    expect(result).toEqual(mockResponse);
  });

  it('should get history', async () => {
    const mockHistory: ConversationHistoryDto = {
      conversationId: 1,
      userId: 42,
      messages: [],
      total: 0,
      createdAt: null,
    };
    service.getHistory.mockResolvedValue(mockHistory);

    const { getHistory } = service;
    const result = await controller.getHistory(mockReq);

    expect(getHistory).toHaveBeenCalledWith(42);
    expect(result).toEqual(mockHistory);
  });

  it('should get stats', async () => {
    const mockStats = { totalConversations: 10, totalMessages: 50, userId: 42 };
    service.getStats.mockResolvedValue(mockStats);

    const { getStats } = service;
    const result = await controller.getStats(mockReq);

    expect(getStats).toHaveBeenCalledWith(42);
    expect(result).toEqual(mockStats);
  });

  it('should reset conversation', async () => {
    const mockReset: { message: string } = { message: 'reset done' };
    service.resetConversation.mockResolvedValue(mockReset);

    const { resetConversation } = service;
    const result = await controller.reset(mockReq);

    expect(resetConversation).toHaveBeenCalledWith(42);
    expect(result).toEqual(mockReset);
  });

  it('should get sidebar history', async () => {
    const mockSidebar = {
      conversations: [
        { id: 1, title: 'Conv 1', createdAt: new Date(), isActive: true },
      ],
    };
    service.getSidebarHistory.mockResolvedValue(mockSidebar);

    const { getSidebarHistory } = service;
    const result = await controller.getSidebarHistory(mockReq);

    expect(getSidebarHistory).toHaveBeenCalledWith(42);
    expect(result).toEqual(mockSidebar);
  });

  it('should get conversation by id', async () => {
    const mockConversation = { conversationId: 1, messages: [], userId: 42 };
    service.getConversationById.mockResolvedValue(mockConversation);

    const { getConversationById } = service;
    const result = await controller.getConversation('1', mockReq);

    expect(getConversationById).toHaveBeenCalledWith(1, 42);
    expect(result).toEqual(mockConversation);
  });

  it('should delete conversation', async () => {
    const mockDelete: { message: string } = {
      message: 'Conversation supprimée.',
    };
    service.deleteConversation.mockResolvedValue(mockDelete);

    const { deleteConversation } = service;
    const result = await controller.deleteConversation('5', mockReq);

    expect(deleteConversation).toHaveBeenCalledWith(5, 42);
    expect(result).toEqual(mockDelete);
  });

  it('should pin conversation', async () => {
    const mockPin: { message: string } = { message: 'Conversation épinglée.' };
    service.pinConversation.mockResolvedValue(mockPin);

    const { pinConversation } = service;
    const result = await controller.pinConversation(
      '3',
      { isPinned: true },
      mockReq,
    );

    expect(pinConversation).toHaveBeenCalledWith(3, 42, true);
    expect(result).toEqual(mockPin);
  });
});
