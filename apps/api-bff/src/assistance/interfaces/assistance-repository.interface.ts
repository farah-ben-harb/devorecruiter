import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateConversationDto } from '../dtos/update-conversation.dto';

export interface IConversationRepository {
  findAllByUserId(userId: number): Promise<ConversationEntity[]>;
  findOneById(id: string, userId: number): Promise<ConversationEntity | null>;
  create(
    dto: CreateConversationDto,
    userId: number,
  ): Promise<ConversationEntity>;
  update(id: string, dto: UpdateConversationDto): Promise<ConversationEntity>;
  delete(id: string): Promise<void>;
}

export interface IMessageRepository {
  findByConversationId(conversationId: string): Promise<MessageEntity[]>;
  create(dto: CreateMessageDto): Promise<MessageEntity>;
}
export interface GroqStreamChunk {
  choices?: Array<{ delta?: { content?: string } }>;
}
