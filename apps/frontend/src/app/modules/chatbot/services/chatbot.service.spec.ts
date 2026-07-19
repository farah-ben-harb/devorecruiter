import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ChatbotService } from './chatbot.service';
import { environment } from '../../../../environments/environment';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/chatbot`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    // Instanciation manuelle pour contourner NG0202 : la génération de factory
    // Angular perd les métadonnées de type du paramètre de constructeur dans
    // cet environnement Vitest. `new` ne dépend pas de ces métadonnées.
    const http = TestBed.inject(HttpClient);
    service = new ChatbotService(http);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('clearHistory', () => {
    it('envoie une requête DELETE vers l’URL avec le sessionId', () => {
      const sessionId = 'session-abc-123';
      let result: { success: boolean } | undefined;

      service.clearHistory(sessionId).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${apiUrl}/history/${sessionId}`);
      expect(req.request.method).toBe('DELETE');

      req.flush({ success: true });

      expect(result).toEqual({ success: true });
    });

    it('propage la réponse success: false', () => {
      const sessionId = 'session-xyz-789';
      let result: { success: boolean } | undefined;

      service.clearHistory(sessionId).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${apiUrl}/history/${sessionId}`);
      req.flush({ success: false });

      expect(result).toEqual({ success: false });
    });
  });
});
