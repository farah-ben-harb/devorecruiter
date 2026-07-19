import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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
  RagErrorResponse,
} from '../interfaces/rh-assistant.interface';

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
      throw new Error('FASTAPI_BASE_URL or RAG_URL is not defined in environment variables');
    }
  }

  async askQuestion(userId: number, dto: QuestionDto): Promise<RhResponseDto> {
    let conversation = await this.rhAssistantRepository.findActiveConversation(userId);
    const isNewConversation = !conversation;

    if (isNewConversation) {
      conversation = await this.rhAssistantRepository.createConversation(userId);
    }

    if (!conversation) {
      throw new HttpException(
        'Erreur lors de la création de la conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

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
        this.httpService.post<IRagApiResponse>(`${this.fastApiBaseUrl}/chat`, {
          question: dto.question,
        }),
      );
      ragResponse = res.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        const responseData = error.response?.data as RagErrorResponse | undefined;
        throw new HttpException(
          responseData?.detail ?? 'Erreur de communication avec le service RAG.',
          error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        'Erreur inconnue avec le service RAG.',
        HttpStatus.INTERNAL_SERVER_ERROR,
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

    firstValueFrom(this.httpService.delete(`${this.fastApiBaseUrl}/chat/reset`)).catch(
      () => {},
    );

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
    const messages =
      await this.rhAssistantRepository.findMessagesByConversation(
        conversationId,
      );

    return { conversationId, messages, userId };
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
