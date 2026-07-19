import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ConversationResponse, Message, MessageResponse } from '../models/assistance.model';
import { StorageService } from '@core/services/storage.service';

@Injectable({
  providedIn: 'root',
})
export class AssistanceService {
  private readonly http = inject(HttpClient);
  private readonly API = '/api/assistance';
  private readonly storageService = inject(StorageService);

  // ── Chat ────────────────────────────────────────────────────────────────
  sendMessage(
    conversationId: string,
    messages: Message[],
  ): Observable<{ content: string; title?: string }> {
    // Le backend retourne { content, title? }
    // title est présent uniquement lors du premier message de la conversation
    return this.http.post<{ content: string; title?: string }>(`${this.API}/chat`, {
      conversationId,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  }

  generateTitle(userMessage: string): Observable<string> {
    // Le backend retourne { title: string } (objet JSON, pas une string brute)
    return this.http
      .post<{ title: string }>(`${this.API}/generate-title`, {
        message: userMessage,
      })
      .pipe(map((res) => res.title));
  }

  // ── Conversations ────────────────────────────────────────────────────────
  getConversations(): Observable<ConversationResponse[]> {
    return this.http.get<ConversationResponse[]>(`${this.API}/conversations`);
  }

  createConversation(title: string): Observable<ConversationResponse> {
    return this.http.post<ConversationResponse>(`${this.API}/conversations`, {
      title,
    });
  }

  updateConversation(
    id: string,
    data: { title?: string; isPinned?: boolean },
  ): Observable<ConversationResponse> {
    return this.http.patch<ConversationResponse>(`${this.API}/conversations/${id}`, data);
  }

  deleteConversation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/conversations/${id}`);
  }

  // ── Messages ─────────────────────────────────────────────────────────────
  getMessages(conversationId: string): Observable<MessageResponse[]> {
    return this.http.get<MessageResponse[]>(`${this.API}/conversations/${conversationId}/messages`);
  }
  sendMessageStream(
    conversationId: string,
    messages: Message[],
    onChunk: (token: string) => void,
    onDone: (title?: string) => void,
    onError?: (err: unknown) => void,
  ): void {
    // SSE via fetch (supporte POST + JWT)
    const token = this.storageService.get('access_token');

    fetch(`${this.API}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversationId,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
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
            const raw = line.replace('data: ', '').trim();
            if (!raw) continue;

            try {
              const event = JSON.parse(raw) as {
                chunk?: string;
                title?: string;
                done?: boolean;
              };
              if (event.chunk) onChunk(event.chunk);
              if (event.done) onDone(event.title);
            } catch {
              // ignore
            }
          }
        }
      })
      .catch(onError);
  }
}
