import {
  UnifiedMessage,
  UnifiedConversation,
  Source,
  ApiItConversation,
  ApiItMessage,
  ApiRhMessage,
  AssistantMode,
} from '../models/unified-assistant.model';

export class UnifiedAssistantMapper {
  static toSourceList(sources: Source[] | null | undefined): Source[] {
    if (!sources || !Array.isArray(sources)) return [];
    return sources.map((s) => ({
      title: s.title ?? 'Inconnu',
      source: s.source ?? 'Inconnu',
      page: s.page ?? 'Inconnue',
    }));
  }

  static fromItMessage(api: ApiItMessage): UnifiedMessage {
    return {
      id: api.id,
      role: api.role === 'user' ? 'user' : 'assistant',
      content: api.content ?? '',
      timestamp: new Date(api.createdAt),
      mode: 'it',
      isLoading: false,
    };
  }

  static fromRhMessage(api: ApiRhMessage): UnifiedMessage {
    return {
      id: api.id,
      role: api.role === 'user' ? 'user' : 'assistant',
      content: api.content ?? '',
      timestamp: new Date(api.createdAt),
      mode: 'rh',
      sources: UnifiedAssistantMapper.toSourceList(api.sources),
      isLoading: false,
    };
  }

  static fromItConversation(api: ApiItConversation): UnifiedConversation {
    return {
      id: api.id,
      title: api.title,
      mode: 'it',
      createdAt: new Date(api.createdAt),
      updatedAt: new Date(api.updatedAt),
      isPinned: api.isPinned,
    };
  }

  static createUserMessage(content: string, mode: AssistantMode | null): UnifiedMessage {
    return {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      mode: mode ?? undefined,
      isLoading: false,
    };
  }

  static createLoadingMessage(): UnifiedMessage {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
  }

  static createErrorMessage(): UnifiedMessage {
    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Une erreur est survenue. Veuillez réessayer.',
      timestamp: new Date(),
      isLoading: false,
    };
  }
}
