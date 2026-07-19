// chatbot.facade.ts — utilise UnifiedAssistantService pour le streaming
import { Injectable, computed, signal } from '@angular/core';
import { ChatState } from '../models/chatbot.model';
import { ChatbotMapper } from '../mappers/chatbot.mapper';
import { UnifiedAssistantService } from '@app/modules/unified-assistant/services/unified-assistant.service';

@Injectable({ providedIn: 'root' })
export class ChatbotFacade {
  private readonly state = signal<ChatState>({
    messages: [],
    isLoading: false,
    isOpen: false,
    sessionId: crypto.randomUUID(),
    error: null,
  });

  readonly messages = computed(() => this.state().messages);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly isOpen = computed(() => this.state().isOpen);
  readonly error = computed(() => this.state().error);
  readonly sessionId = computed(() => this.state().sessionId);

  // Historique pour le contexte multi-tours
  private messageHistory: { role: string; content: string }[] = [];

  constructor(private readonly assistantService: UnifiedAssistantService) {}

  toggleChat(): void {
    this.state.update((s) => ({ ...s, isOpen: !s.isOpen }));
  }

  closeChat(): void {
    this.state.update((s) => ({ ...s, isOpen: false }));
  }

  async sendMessage(content: string): Promise<void> {
    if (!content.trim() || this.state().isLoading) return;

    this.messageHistory.push({ role: 'user', content });

    this.state.update((s) => ({
      ...s,
      isLoading: true,
      error: null,
      messages: [
        ...s.messages,
        ChatbotMapper.userInputToMessage(content),
        ChatbotMapper.loadingMessage(),
      ],
    }));

    let fullResponse = '';

    this.assistantService.chatStream(
      this.state().sessionId,
      this.messageHistory,
      () => {},
      (chunk) => {
        fullResponse += chunk;
        this.state.update((s) => {
          const msgs = [...s.messages];
          const last = msgs.length - 1;
          msgs[last] = { ...msgs[last], content: fullResponse, isLoading: false };
          return { ...s, messages: msgs };
        });
      },
      () => {
        // onDone
        this.messageHistory.push({ role: 'assistant', content: fullResponse });
        this.state.update((s) => ({ ...s, isLoading: false }));
      },
      () => {
        // onError
        this.state.update((s) => ({
          ...s,
          isLoading: false,
          error: 'Une erreur est survenue. Veuillez réessayer.',
          messages: s.messages.filter((m) => !m.isLoading),
        }));
      },
    );
  }

  clearHistory(): void {
    this.messageHistory = [];
    this.state.update((s) => ({
      ...s,
      messages: [],
      sessionId: crypto.randomUUID(),
    }));
  }
}
