// chatbot.service.ts — garde uniquement clearHistory
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private readonly http: HttpClient) {}

  clearHistory(sessionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/history/${sessionId}`);
  }
}
