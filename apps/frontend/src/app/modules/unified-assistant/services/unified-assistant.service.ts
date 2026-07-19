import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { StorageService } from '@core/services/storage.service';

import {
  ApiItConversation,
  ApiItMessage,
  ApiRhMessage,
  ApiStreamEvent,
  RhSidebarConversation,
} from '../models/unified-assistant.model';

@Injectable({ providedIn: 'root' })
export class UnifiedAssistantService {
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);
  private readonly API = `${environment.apiUrl}/api/assistant`;

  // ─── Streaming SSE ───────────────────────────────────────
  chatStream(
    conversationId: string,
    messages: { role: string; content: string }[],
    onMode: (mode: 'it' | 'rh') => void,
    onChunk: (token: string) => void,
    onDone: (event: ApiStreamEvent) => void,
    onError?: (err: unknown) => void,
  ): void {
    const token = this.storageService.get('access_token');

    fetch(`${this.API}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, messages }),
    })
      .then(async (response) => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let done = false;

        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) {
            buffer += decoder.decode(result.value, { stream: true });
          }
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const event = JSON.parse(raw) as ApiStreamEvent;
              if (event.mode && !event.chunk && !event.done) onMode(event.mode);
              if (event.chunk) onChunk(event.chunk);
              if (event.done) onDone(event);
            } catch {
              /* ignore */
            }
          }
        }
      })
      .catch(onError);
  }

  // ─── IT — Conversations ──────────────────────────────────
  getItConversations(): Observable<ApiItConversation[]> {
    return this.http.get<ApiItConversation[]>(`${this.API}/it/conversations`);
  }

  createItConversation(title: string): Observable<ApiItConversation> {
    return this.http.post<ApiItConversation>(`${this.API}/it/conversations`, { title });
  }

  updateItConversation(
    id: string,
    data: { title?: string; isPinned?: boolean },
  ): Observable<ApiItConversation> {
    return this.http.patch<ApiItConversation>(`${this.API}/it/conversations/${id}`, data);
  }

  deleteItConversation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/it/conversations/${id}`);
  }

  getItMessages(conversationId: string): Observable<ApiItMessage[]> {
    return this.http.get<ApiItMessage[]>(`${this.API}/it/conversations/${conversationId}/messages`);
  }

  // ─── RH — Conversations ──────────────────────────────────
  getRhSidebarHistory(): Observable<{ conversations: RhSidebarConversation[] }> {
    return this.http.get<{ conversations: RhSidebarConversation[] }>(
      `${this.API}/rh/sidebar-history`,
    );
  }

  getRhConversationById(
    id: number,
  ): Observable<{ conversationId: number; messages: ApiRhMessage[] }> {
    return this.http.get<{ conversationId: number; messages: ApiRhMessage[] }>(
      `${this.API}/rh/conversation/${id}`,
    );
  }

  deleteRhConversation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/rh/conversation/${id}`);
  }

  pinRhConversation(id: number, isPinned: boolean): Observable<void> {
    return this.http.patch<void>(`${this.API}/rh/conversation/${id}/pin`, { isPinned });
  }

  renameRhConversation(id: number, title: string): Observable<void> {
    return this.http.patch<void>(`${this.API}/rh/conversation/${id}/rename`, { title });
  }

  resetRhConversation(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/rh/reset`);
  }
}
