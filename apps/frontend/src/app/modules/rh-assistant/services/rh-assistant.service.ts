import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

import { RhAssistantMapper } from '../mappers/rh-assistant.mapper';
import {
  RhResponse,
  ConversationHistory,
  Stats,
  ApiRhResponse,
  ApiConversationHistory,
  ApiMessage,
  ApiStats,
  SidebarConversation,
} from '../models/rh-assistant.model';

@Injectable({ providedIn: 'root' })
export class RhAssistantService {
  private readonly API = `${environment.apiUrl}/api/rh-assistant`;

  constructor(private http: HttpClient) {}

  ask(question: string): Observable<RhResponse> {
    return this.http
      .post<ApiRhResponse>(this.API, { question })
      .pipe(map((res) => RhAssistantMapper.toRhResponse(res)));
  }

  getHistory(): Observable<ConversationHistory> {
    return this.http
      .get<ApiConversationHistory>(`${this.API}/history`)
      .pipe(map((res) => RhAssistantMapper.toHistory(res)));
  }

  getStats(): Observable<Stats> {
    return this.http
      .get<ApiStats>(`${this.API}/stats`)
      .pipe(map((res) => RhAssistantMapper.toStats(res)));
  }

  reset(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API}/reset`);
  }

  getSidebarHistory(): Observable<{ conversations: SidebarConversation[] }> {
    return this.http.get<{ conversations: SidebarConversation[] }>(`${this.API}/sidebar-history`);
  }

  getConversationById(id: number): Observable<{ conversationId: number; messages: ApiMessage[] }> {
    return this.http.get<{ conversationId: number; messages: ApiMessage[] }>(
      `${this.API}/conversation/${id}`,
    );
  }
  deleteConversation(id: number): Observable<Record<string, never>> {
    return this.http.delete<Record<string, never>>(`${this.API}/conversation/${id}`);
  }
  pinConversation(id: number, isPinned: boolean): Observable<Record<string, never>> {
    return this.http.patch<Record<string, never>>(`${this.API}/conversation/${id}/pin`, {
      isPinned,
    });
  }
  renameConversation(id: number, title: string): Observable<Record<string, never>> {
    return this.http.patch<Record<string, never>>(`${this.API}/conversation/${id}/rename`, {
      title,
    });
  }
}
