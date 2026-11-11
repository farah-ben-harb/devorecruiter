import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

import { QuestionDto } from '../dtos/question.dto';
import { RhResponseDto } from '../dtos/response.dto';
import { RhAssistantRepository } from '../repositories/rh-assistant.repository';

import {
  IRhAssistantService,
  IRagApiResponse,
  ConversationHistoryDto,
  RagHistoryMessage,
} from '../interfaces/rh-assistant.interface';
import { createRagRequestHeaders } from '../security/rag-request-signature';

const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_CONTENT_LENGTH = 4000;

@Injectable()
export class RhAssistantService implements IRhAssistantService {
  private readonly fastApiBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly rhAssistantRepository: RhAssistantRepository,
    private readonly configService: ConfigService,
  ) {
    this.fastApiBaseUrl =
      this.configService.get<string>('FASTAPI_BASE_URL') ??
      this.configService.get<string>('RAG_URL')!;

    if (!this.fastApiBaseUrl) {
      throw new Error(
        'FASTAPI_BASE_URL or RAG_URL is not defined in environment variables',
      );
    }
  }

  async askQuestion(userId: number, dto: QuestionDto): Promise<RhResponseDto> {
    let conversation =
      await this.rhAssistantRepository.findActiveConversation(userId);
    const isNewConversation = !conversation;

    if (isNewConversation) {
      conversation =
        await this.rhAssistantRepository.createConversation(userId);
    }

    if (!conversation) {
      throw new ServiceUnavailableException(
        'Le service de conversation est temporairement indisponible.',
      );
    }

    const ragInternalSecret = this.configService.get<string>(
      'RAG_INTERNAL_SECRET',
    );
    if (!ragInternalSecret || ragInternalSecret.length < 32) {
      throw new ServiceUnavailableException(
        'Le service RAG est temporairement indisponible.',
      );
    }

    const history: RagHistoryMessage[] = (conversation.messages ?? [])
      .filter(
        (message) => message.role === 'user' || message.role === 'assistant',
      )
      .slice(-MAX_HISTORY_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content.slice(0, MAX_HISTORY_CONTENT_LENGTH),
      }));

    // Sauvegarder la question utilisateur
    await this.rhAssistantRepository.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content: dto.question,
    });

    // Appel au RAG
    let ragResponse: IRagApiResponse;
    try {
      const res = await firstValueFrom(
        this.httpService.post<IRagApiResponse>(
          `${this.fastApiBaseUrl}/chat`,
          {
            question: dto.question,
            history,
          },
          {
            headers: createRagRequestHeaders({
              action: 'chat',
              question: dto.question,
              secret: ragInternalSecret,
              sessionId: String(conversation.id),
              userId,
            }),
          },
        ),
      );
      ragResponse = res.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new BadGatewayException(
          'Le service RAG est temporairement indisponible.',
        );
      }
      throw new BadGatewayException(
        'Le service RAG est temporairement indisponible.',
      );
    }

    await this.rhAssistantRepository.saveMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: ragResponse.response,
      sources: ragResponse.sources,
    });
    if (isNewConversation) {
      let title = dto.question.trim();
      if (title.length > 70) {
        title = title.substring(0, 67) + '...';
      }

      await this.rhAssistantRepository.renameConversation(
        conversation.id,
        userId,
        title,
      );
    }

    return {
      response: ragResponse.response,
      sources: ragResponse.sources,
      timestamp: new Date(),
      conversationId: conversation.id,
    };
  }

  async getHistory(userId: number): Promise<ConversationHistoryDto> {
    const conversation =
      await this.rhAssistantRepository.findActiveConversation(userId);

    if (!conversation) {
      return {
        conversationId: null,
        userId,
        messages: [],
        total: 0,
        createdAt: null,
      };
    }

    const messages =
      await this.rhAssistantRepository.findMessagesByConversation(
        conversation.id,
      );

    return {
      conversationId: conversation.id,
      userId,
      messages,
      total: messages.length,
      createdAt: conversation.createdAt,
    };
  }

  async resetConversation(userId: number): Promise<{ message: string }> {
    const conversation =
      await this.rhAssistantRepository.findActiveConversation(userId);

    if (conversation) {
      await this.rhAssistantRepository.closeConversation(conversation.id);
    }

    return { message: 'Conversation réinitialisée.' };
  }

  async getStats(userId: number) {
    const conversations =
      await this.rhAssistantRepository.findAllConversationsByUser(userId);

    const totalMessages =
      await this.rhAssistantRepository.countMessagesByUser(userId);

    return {
      totalConversations: conversations.length,
      totalMessages,
      userId,
    };
  }

  async getSidebarHistory(userId: number) {
    const conversations =
      await this.rhAssistantRepository.findAllConversationsWithFirstMessage(
        userId,
      );

    return {
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title ?? 'Nouvelle conversation',
        createdAt: conv.createdAt,
        isActive: conv.isActive,
        isPinned: conv.isPinned,
      })),
    };
  }

  async getConversationById(conversationId: number, userId: number) {
    const conversation = await this.rhAssistantRepository.findConversationById(
      conversationId,
      userId,
    );

    if (!conversation) {
      throw new NotFoundException('Conversation non trouvée.');
    }

    return {
      conversationId,
      messages: conversation.messages ?? [],
      userId,
    };
  }

  async deleteConversation(conversationId: number, userId: number) {
    await this.rhAssistantRepository.deleteConversation(conversationId, userId);

    return { message: 'Conversation supprimée.' };
  }

  async pinConversation(id: number, userId: number, isPinned: boolean) {
    await this.rhAssistantRepository.pinConversation(id, userId, isPinned);

    return {
      message: isPinned ? 'Conversation épinglée.' : 'Conversation dépinglée.',
    };
  }

  async renameConversation(id: number, userId: number, title: string) {
    await this.rhAssistantRepository.renameConversation(id, userId, title);
    return { message: 'Conversation renommée.' };
  }
}
