import { Injectable, signal, computed, inject } from '@angular/core';
import {
  Conversation,
  ConversationResponse,
  Message,
  MessageRole,
} from '../models/assistance.model';
import { AssistanceService } from '../service/assistance.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AssistanceFacade {
  private readonly assistanceService = inject(AssistanceService);

  private readonly _conversations = signal<Conversation[]>([]);
  private readonly _activeConversationId = signal<string | null>(null);
  private readonly _isLoading = signal<boolean>(false);

  readonly conversations = this._conversations.asReadonly();
  readonly activeConversationId = this._activeConversationId.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  readonly activeConversation = computed(
    () => this._conversations().find((c) => c.id === this._activeConversationId()) ?? null,
  );

  readonly activeMessages = computed(() => this.activeConversation()?.messages ?? []);
  readonly messagesLoaded$ = new Subject<string>();
  loadConversations(selectId?: string): void {
    this.assistanceService.getConversations().subscribe((convs) => {
      const mapped: Conversation[] = convs.map((c) => ({
        id: c.id,
        title: c.title,
        messages: [],
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        userId: '',
        isPinned: c.isPinned,
      }));
      this._conversations.set(mapped);

      if (selectId && mapped.find((c) => c.id === selectId)) {
        this.setActiveConversation(selectId);
      } else {
        this._activeConversationId.set(null);
      }
    });
  }

  loadMessages(conversationId: string): void {
    this.assistanceService.getMessages(conversationId).subscribe((msgs) => {
      const mapped: Message[] = msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt),
      }));
      this._conversations.update((convs) =>
        convs.map((c) => (c.id === conversationId ? { ...c, messages: mapped } : c)),
      );
      this.messagesLoaded$.next(conversationId);
    });
  }

  setActiveConversation(id: string): void {
    this._activeConversationId.set(id);
    const conv = this._conversations().find((c) => c.id === id);
    if (conv && conv.messages.length === 0) {
      this.loadMessages(id);
    }
  }

  addPersistedConversation(conv: ConversationResponse): void {
    const newConversation: Conversation = {
      id: conv.id,
      title: conv.title,
      messages: [],
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      userId: '',
      isPinned: conv.isPinned,
    };
    this._conversations.update((convs) => [newConversation, ...convs]);
    this._activeConversationId.set(newConversation.id);
  }

  // ── Création ─────────────────────────────────────────────
  createConversation(): void {
    this._activeConversationId.set(null);
  }

  // ── Messages ─────────────────────────────────────────────
  addMessage(conversationId: string, role: MessageRole, content: string): void {
    const message: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
    this._conversations.update((convs) =>
      convs.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], updatedAt: new Date() }
          : c,
      ),
    );
  }

  // ── Suppression ──────────────────────────────────────────
  deleteConversation(id: string): void {
    this.assistanceService.deleteConversation(id).subscribe(() => {
      this._conversations.update((convs) => convs.filter((c) => c.id !== id));
      if (this._activeConversationId() === id) {
        const remaining = this._conversations();
        if (remaining.length > 0) {
          this.setActiveConversation(remaining[0].id);
        } else {
          this._activeConversationId.set(null);
        }
      }
    });
  }

  // ── Épingler / Dépingler → appel backend + état local ───
  pinConversation(id: string, isPinned: boolean): void {
    // Optimistic update : UI réactive immédiatement
    this._conversations.update((convs) => convs.map((c) => (c.id === id ? { ...c, isPinned } : c)));

    // Persistance backend
    this.assistanceService.updateConversation(id, { isPinned }).subscribe({
      next: (updated) => {
        // Sync avec la valeur réelle renvoyée par le serveur
        this._conversations.update((convs) =>
          convs.map((c) => (c.id === id ? { ...c, isPinned: updated.isPinned } : c)),
        );
      },
      error: () => {
        // Rollback si échec
        this._conversations.update((convs) =>
          convs.map((c) => (c.id === id ? { ...c, isPinned: !isPinned } : c)),
        );
      },
    });
  }

  // ── Renommer → appel backend + état local ────────────────
  renameConversation(id: string, title: string): void {
    const previous = this._conversations().find((c) => c.id === id)?.title ?? '';

    // Optimistic update
    this._conversations.update((convs) => convs.map((c) => (c.id === id ? { ...c, title } : c)));

    // Persistance backend
    this.assistanceService.updateConversation(id, { title }).subscribe({
      next: (updated) => {
        // Sync avec la valeur réelle renvoyée par le serveur
        this._conversations.update((convs) =>
          convs.map((c) => (c.id === id ? { ...c, title: updated.title } : c)),
        );
      },
      error: () => {
        // Rollback si échec
        this._conversations.update((convs) =>
          convs.map((c) => (c.id === id ? { ...c, title: previous } : c)),
        );
      },
    });
  }

  // ── Helpers internes (kept for compatibility) ────────────
  updateConversationTitle(conversationId: string, title: string): void {
    this._conversations.update((convs) =>
      convs.map((c) => (c.id === conversationId ? { ...c, title } : c)),
    );
  }

  updateConversationPin(conversationId: string, isPinned: boolean): void {
    this._conversations.update((convs) =>
      convs.map((c) => (c.id === conversationId ? { ...c, isPinned } : c)),
    );
  }

  setLoading(value: boolean): void {
    this._isLoading.set(value);
  }
}
