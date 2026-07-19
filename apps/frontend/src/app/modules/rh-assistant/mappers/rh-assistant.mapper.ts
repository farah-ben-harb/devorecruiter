import {
  ApiMessage,
  ApiSource,
  ApiConversationHistory,
  ApiRhResponse,
  ApiStats,
  Message,
  Source,
  ConversationHistory,
  RhResponse,
  Stats,
} from '../models/rh-assistant.model';

export class RhAssistantMapper {
  // ─── Source ──────────────────────────────────────
  static toSource(api: ApiSource): Source {
    return {
      title: api.title ?? 'Inconnu',
      source: api.source ?? 'Inconnu',
      page: api.page ?? 'Inconnue',
    };
  }

  static toSourceList(api: ApiSource[] | null): Source[] {
    if (!api || !Array.isArray(api)) return [];
    return api.map((s) => RhAssistantMapper.toSource(s));
  }

  // ─── Message ─────────────────────────────────────
  static toMessage(api: ApiMessage): Message {
    return {
      id: api.id,
      role: api.role === 'user' ? 'user' : 'assistant',
      content: api.content ?? '',
      sources: RhAssistantMapper.toSourceList(api.sources),
      createdAt: api.createdAt ? new Date(api.createdAt) : undefined,
      isLoading: false,
    };
  }

  static toMessageList(api: ApiMessage[]): Message[] {
    if (!api || !Array.isArray(api)) return [];
    return api.map((m) => RhAssistantMapper.toMessage(m));
  }

  // ─── RhResponse ──────────────────────────────────
  static toRhResponse(api: ApiRhResponse): RhResponse {
    return {
      response: api.response ?? '',
      sources: RhAssistantMapper.toSourceList(api.sources),
      timestamp: api.timestamp ? new Date(api.timestamp) : new Date(),
      conversationId: api.conversationId ?? 0,
    };
  }

  // ─── ConversationHistory ──────────────────────────
  static toHistory(api: ApiConversationHistory): ConversationHistory {
    return {
      conversationId: api.conversationId ?? 0,
      userId: api.userId ?? 0,
      messages: RhAssistantMapper.toMessageList(api.messages ?? []),
      total: api.total ?? 0,
      createdAt: api.createdAt ? new Date(api.createdAt) : new Date(),
    };
  }

  // ─── Stats ───────────────────────────────────────
  static toStats(api: ApiStats): Stats {
    return {
      totalConversations: api.totalConversations ?? 0,
      totalMessages: api.totalMessages ?? 0,
      userId: api.userId ?? 0,
    };
  }

  // ─── Message local (sans API) ────────────────────
  static createUserMessage(content: string): Message {
    return {
      role: 'user',
      content,
      createdAt: new Date(),
      isLoading: false,
    };
  }

  static createLoadingMessage(): Message {
    return {
      role: 'assistant',
      content: '',
      isLoading: true,
      createdAt: new Date(),
    };
  }

  static createErrorMessage(): Message {
    return {
      role: 'assistant',
      content: 'Une erreur est survenue. Veuillez réessayer.',
      isLoading: false,
      createdAt: new Date(),
    };
  }
}
