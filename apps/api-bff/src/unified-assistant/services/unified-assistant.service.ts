import { Injectable } from '@nestjs/common';
import { ClassifierService } from './classifier.service';
import { AssistanceService } from '../../assistance/services/assistance.service';
import { RhAssistantService } from '../../rh-assistant/services/rh-assistant.service';
import { SendChatDto } from '../../assistance/dtos/chat-message.dto';
import { CreateConversationDto } from '../../assistance/dtos/create-conversation.dto';
import { UpdateConversationDto } from '../../assistance/dtos/update-conversation.dto';
import { ChatbotService } from '../../chatbot/services/chatbot.service';
import { AssistantMode, UnifiedChatResponse } from '../interfaces/unified-assistant.interface';

@Injectable()
export class UnifiedAssistantService {
  constructor(
    private readonly classifierService: ClassifierService,
    private readonly assistanceService: AssistanceService,
    private readonly rhAssistantService: RhAssistantService,
    private readonly chatbotService: ChatbotService,
  ) {}

  // ── Classify ──────────────────────────────────────────────────────────────

  async classify(question: string): Promise<AssistantMode> {
    return this.classifierService.classify(question);
  }

  // ── Chat non-streaming ────────────────────────────────────────────────────

  async chat(
    dto: SendChatDto,
    userId: number,
  ): Promise<UnifiedChatResponse> {
    const lastUserMessage = dto.messages
      .filter((m) => m.role === 'user')
      .at(-1)?.content ?? '';

    const mode = await this.classifierService.classify(lastUserMessage);

    if (mode === 'db') {
      const sessionId = dto.conversationId?.toString() ?? `user-${userId}`;
      const result = await this.chatbotService.processMessage({
        message: lastUserMessage,
        sessionId,
      });
      return {
        content: result.response,
        mode: 'db',
        conversationId: dto.conversationId,
      };
    }

    if (mode === 'rh') {
      const result = await this.rhAssistantService.askQuestion(userId, {
        question: lastUserMessage,
      });
      return {
        content: result.response,
        sources: result.sources,
        conversationId: result.conversationId,
        mode: 'rh',
      };
    }

    // IT
    const result = await this.assistanceService.chat(dto, userId);
    return {
      content: result.content,
      title: result.title,
      mode: 'it',
    };
  }

  // ── Chat streaming ────────────────────────────────────────────────────────

  async *chatStream(
  dto: SendChatDto,
  userId: number,
): AsyncGenerator<{
  chunk?: string;
  title?: string;
  done?: boolean;
  mode?: AssistantMode;
  sources?: { title: string; source: string; page: string | number }[];
  conversationId?: string | number;
}> {
  const lastUserMessage = dto.messages
    .filter((m) => m.role === 'user')
    .at(-1)?.content ?? '';

  const mode = await this.classifierService.classify(lastUserMessage);

  // Émettre le mode en premier
  yield { mode };

  if (mode === 'db') {
    const sessionId = dto.conversationId?.toString() ?? `user-${userId}`;
    const result = await this.chatbotService.processMessage({
      message: lastUserMessage,
      sessionId,
    });

    const words = result.response.split(' ');
    for (const word of words) {
      yield { chunk: word + ' ' };
      await new Promise<void>((r) => setTimeout(r, 12));
    }

    yield { done: true, mode: 'db' };
    return;
  }

  if (mode === 'rh') {
    const result = await this.rhAssistantService.askQuestion(userId, {
      question: lastUserMessage,
    });
    yield {
      chunk: result.response,
      sources: result.sources,
      conversationId: result.conversationId,
    };
    yield { done: true, mode: 'rh' };
    return;
  }

  // ── IT : s'assurer qu'une conversation valide existe ──────────────────────
  let itDto = dto;
  try {
    if (dto.conversationId) {
      await this.assistanceService.getMessages(dto.conversationId, userId);
    } else {
      throw new Error('no conversationId');
    }
  } catch {
    // conversationId absent ou inconnu → créer une conversation temporaire
    const newConv = await this.assistanceService.createConversation(
      { title: 'Nouvelle conversation' },
      userId,
    );
    itDto = { ...dto, conversationId: newConv.id };
  }

  for await (const event of this.assistanceService.chatStream(itDto, userId)) {
    yield { ...event, mode: 'it' };
  }
}

  // ── Délégation IT — Conversations ────────────────────────────────────────

  getConversations(userId: number) {
    return this.assistanceService.getConversations(userId);
  }

  getMessages(conversationId: string, userId: number) {
    return this.assistanceService.getMessages(conversationId, userId);
  }

  createConversation(dto: CreateConversationDto, userId: number) {
    return this.assistanceService.createConversation(dto, userId);
  }

  updateConversation(id: string, dto: UpdateConversationDto, userId: number) {
    return this.assistanceService.updateConversation(id, dto, userId);
  }

  deleteConversation(id: string, userId: number) {
    return this.assistanceService.deleteConversation(id, userId);
  }

  generateTitle(message: string) {
    return this.assistanceService.generateTitle(message);
  }

  // ── Délégation RH — Conversations ────────────────────────────────────────

  getRhHistory(userId: number) {
    return this.rhAssistantService.getHistory(userId);
  }

  getRhSidebarHistory(userId: number) {
    return this.rhAssistantService.getSidebarHistory(userId);
  }

  getRhConversationById(conversationId: number, userId: number) {
    return this.rhAssistantService.getConversationById(conversationId, userId);
  }

  deleteRhConversation(conversationId: number, userId: number) {
    return this.rhAssistantService.deleteConversation(conversationId, userId);
  }

  pinRhConversation(id: number, userId: number, isPinned: boolean) {
    return this.rhAssistantService.pinConversation(id, userId, isPinned);
  }

  renameRhConversation(id: number, userId: number, title: string) {
    return this.rhAssistantService.renameConversation(id, userId, title);
  }

  resetRhConversation(userId: number) {
    return this.rhAssistantService.resetConversation(userId);
  }

  getRhStats(userId: number) {
    return this.rhAssistantService.getStats(userId);
  }
}