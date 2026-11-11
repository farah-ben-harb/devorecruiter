import { Request } from 'express';
import { QuestionDto } from '../dtos/question.dto';
import { RhResponseDto } from '../dtos/response.dto';
import { RhMessageEntity } from '../entities/rh_messages.entity';
import { RhConversationEntity } from '../entities/rh_conversations.entity';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    role: string;
  };
}

export interface IRhAssistantRepository {
  // Conversation
  createConversation(userId: number): Promise<RhConversationEntity>;
  findActiveConversation(userId: number): Promise<RhConversationEntity | null>;
  findConversationById(
    id: number,
    userId: number,
  ): Promise<RhConversationEntity | null>;
  closeConversation(conversationId: number): Promise<void>;

  // Messages
  saveMessage(partial: Partial<RhMessageEntity>): Promise<RhMessageEntity>;
  findMessagesByConversation(
    conversationId: number,
  ): Promise<RhMessageEntity[]>;
  countMessagesByUser(userId: number): Promise<number>;
}

export interface IRhAssistantService {
  askQuestion(userId: number, dto: QuestionDto): Promise<RhResponseDto>;
  getHistory(userId: number): Promise<ConversationHistoryDto>;
  resetConversation(userId: number): Promise<{ message: string }>;
}

export interface IRagApiResponse {
  response: string;
  sources: {
    title: string;
    source: string;
    page: string | number;
  }[];
}

export interface RagHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationHistoryDto {
  conversationId: number | null;
  userId: number;
  messages: Partial<RhMessageEntity>[];
  total: number;
  createdAt: Date | null;
}

export interface RagErrorResponse {
  detail?: string;
}
