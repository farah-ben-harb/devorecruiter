import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

import {
  UnifiedAssistantState,
  UnifiedMessage,
  UnifiedConversation,
  AssistantMode,
} from '../models/unified-assistant.model';
import { UnifiedAssistantMapper } from '../mappers/unified-assistant.mapper';

const initialState: UnifiedAssistantState = {
  detectedMode: null,
  conversations: [],
  activeConversationId: null,
  currentMessages: [],
  status: 'idle',
  error: null,
  showSidebar: true,
};

@Injectable({ providedIn: 'root' })
export class UnifiedAssistantFacade {
  private readonly _state$ = new BehaviorSubject<UnifiedAssistantState>(initialState);

  readonly detectedMode$ = this.select((s) => s.detectedMode);
  readonly conversations$ = this.select((s) => s.conversations);
  readonly activeConversationId$ = this.select((s) => s.activeConversationId);
  readonly currentMessages$ = this.select((s) => s.currentMessages);
  readonly isLoading$ = this.select((s) => s.status === 'loading');
  readonly hasMessages$ = this.select((s) => s.currentMessages.length > 0);
  readonly error$ = this.select((s) => s.error);
  readonly showSidebar$ = this.select((s) => s.showSidebar);
  readonly activeConversation$ = this.select(
    (s) =>
      s.conversations.find((c: UnifiedConversation) => c.id === s.activeConversationId) ?? null,
  );

  get snapshot(): UnifiedAssistantState {
    return this._state$.getValue();
  }

  private patch(partial: Partial<UnifiedAssistantState>): void {
    this._state$.next({ ...this.snapshot, ...partial });
  }

  private select<T>(fn: (s: UnifiedAssistantState) => T): Observable<T> {
    return this._state$.pipe(map(fn), distinctUntilChanged());
  }

  // ─── Mode ────────────────────────────────────────────────
  setDetectedMode(mode: AssistantMode): void {
    this.patch({ detectedMode: mode });
  }

  // ─── Status ──────────────────────────────────────────────
  setLoading(): void {
    this.patch({ status: 'loading', error: null });
  }

  setSuccess(): void {
    this.patch({ status: 'success' });
  }

  setError(error: string): void {
    this.patch({ status: 'error', error });
  }

  // ─── Conversations ────────────────────────────────────────
  setConversations(conversations: UnifiedConversation[]): void {
    const sorted = [...conversations].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    this.patch({ conversations: sorted });
  }

  addConversation(conv: UnifiedConversation): void {
    this.patch({ conversations: [conv, ...this.snapshot.conversations] });
  }

  setActiveConversation(id: string | number | null): void {
    this.patch({ activeConversationId: id });
  }

  updateConversationTitle(id: string | number, title: string): void {
    this.patch({
      conversations: this.snapshot.conversations.map((c: UnifiedConversation) =>
        c.id === id ? { ...c, title } : c,
      ),
    });
  }

  updateConversationPin(id: string | number, isPinned: boolean): void {
    const updated = this.snapshot.conversations.map((c: UnifiedConversation) =>
      c.id === id ? { ...c, isPinned } : c,
    );
    this.setConversations(updated);
  }

  removeConversation(id: string | number): void {
    const remaining = this.snapshot.conversations.filter((c: UnifiedConversation) => c.id !== id);
    const newActive =
      this.snapshot.activeConversationId === id
        ? (remaining[0]?.id ?? null)
        : this.snapshot.activeConversationId;
    this.patch({
      conversations: remaining,
      activeConversationId: newActive,
      currentMessages: newActive ? this.snapshot.currentMessages : [],
    });
  }

  // ─── Messages ────────────────────────────────────────────
  setCurrentMessages(messages: UnifiedMessage[]): void {
    this.patch({ currentMessages: messages });
  }

  clearCurrentMessages(): void {
    this.patch({
      currentMessages: [],
      detectedMode: null,
      activeConversationId: null,
    });
  }

  addUserMessage(content: string): void {
    const msg = UnifiedAssistantMapper.createUserMessage(content, this.snapshot.detectedMode);
    this.patch({ currentMessages: [...this.snapshot.currentMessages, msg] });
  }

  addLoadingMessage(): void {
    this.patch({
      currentMessages: [
        ...this.snapshot.currentMessages,
        UnifiedAssistantMapper.createLoadingMessage(),
      ],
    });
  }

  appendChunkToLastMessage(chunk: string): void {
    const messages = [...this.snapshot.currentMessages];
    const last = messages.length - 1;
    if (last >= 0 && messages[last].role === 'assistant') {
      messages[last] = {
        ...messages[last],
        content: messages[last].content + chunk,
        isLoading: false,
      };
      this.patch({ currentMessages: messages });
    }
  }

  finalizeLastMessage(patch: Partial<UnifiedMessage>): void {
    const messages = [...this.snapshot.currentMessages];
    const last = messages.length - 1;
    if (last >= 0) {
      messages[last] = { ...messages[last], ...patch, isLoading: false };
      this.patch({ currentMessages: messages, status: 'success' });
    }
  }

  replaceLoadingWithError(): void {
    const messages = [...this.snapshot.currentMessages];
    const idx = messages.reduce((last, m, i) => (m.isLoading ? i : last), -1);
    if (idx !== -1) {
      messages[idx] = UnifiedAssistantMapper.createErrorMessage();
    }
    this.patch({ currentMessages: messages, status: 'error' });
  }

  // ─── UI ──────────────────────────────────────────────────
  toggleSidebar(): void {
    this.patch({ showSidebar: !this.snapshot.showSidebar });
  }
}
