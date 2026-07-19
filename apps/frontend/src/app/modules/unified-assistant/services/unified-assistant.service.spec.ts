import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { UnifiedAssistantService } from './unified-assistant.service';
import { StorageService } from '@core/services/storage.service';
import { environment } from '@env/environment';
import {
  ApiItConversation,
  ApiItMessage,
  ApiRhMessage,
  ApiStreamEvent,
  RhSidebarConversation,
} from '../models/unified-assistant.model';

type StorageServiceMock = Pick<StorageService, 'get'>;

const API = `${environment.apiUrl}/api/assistant`;

const buildItConversation = (overrides: Partial<ApiItConversation> = {}): ApiItConversation => ({
  id: 'it-1',
  title: 'Conversation IT',
  isPinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildRhSidebarConversation = (
  overrides: Partial<RhSidebarConversation> = {},
): RhSidebarConversation => ({
  id: 1,
  title: 'Conversation RH',
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: false,
  isPinned: false,
  ...overrides,
});

const buildItMessage = (overrides: Partial<ApiItMessage> = {}): ApiItMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Bonjour',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildRhMessage = (overrides: Partial<ApiRhMessage> = {}): ApiRhMessage => ({
  id: 1,
  role: 'user',
  content: 'Combien de congés ?',
  sources: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

/**
 * Construit un stream lisible simulant une réponse SSE, à partir d'une
 * liste de lignes "data: {...}" déjà formatées. Chaque ligne est encodée
 * séparément pour se rapprocher d'un vrai flux réseau découpé en chunks.
 */
function buildSseBody(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= lines.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(lines[index] + '\n'));
      index += 1;
    },
  });
}

function buildFetchResponse(body: ReadableStream<Uint8Array>): Response {
  return { body } as unknown as Response;
}

describe('UnifiedAssistantService', () => {
  let service: UnifiedAssistantService;
  let httpMock: HttpTestingController;
  let storageServiceMock: StorageServiceMock;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    storageServiceMock = {
      get: vi.fn().mockReturnValue('mock-access-token'),
    };

    TestBed.configureTestingModule({
      providers: [
        UnifiedAssistantService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storageServiceMock },
      ],
    });

    service = TestBed.inject(UnifiedAssistantService);
    httpMock = TestBed.inject(HttpTestingController);

    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    httpMock.verify();
    fetchSpy.mockRestore();
  });

  describe('chatStream', () => {
    it('envoie une requête POST avec le token et le body attendus', async () => {
      fetchSpy.mockResolvedValue(buildFetchResponse(buildSseBody([])));

      service.chatStream(
        'conv-1',
        [{ role: 'user', content: 'Bonjour' }],
        vi.fn(),
        vi.fn(),
        vi.fn(),
      );

      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());

      expect(fetchSpy).toHaveBeenCalledWith(`${API}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-access-token',
        },
        body: JSON.stringify({
          conversationId: 'conv-1',
          messages: [{ role: 'user', content: 'Bonjour' }],
        }),
      });
    });

    it('appelle onMode quand un événement contient mode sans chunk ni done', async () => {
      const onMode = vi.fn();
      fetchSpy.mockResolvedValue(buildFetchResponse(buildSseBody(['data: {"mode":"rh"}'])));

      service.chatStream('conv-1', [], onMode, vi.fn(), vi.fn());

      await vi.waitFor(() => expect(onMode).toHaveBeenCalledWith('rh'));
    });

    it('appelle onChunk pour chaque événement contenant chunk', async () => {
      const onChunk = vi.fn();
      fetchSpy.mockResolvedValue(
        buildFetchResponse(buildSseBody(['data: {"chunk":"Bon"}', 'data: {"chunk":"jour"}'])),
      );

      service.chatStream('conv-1', [], vi.fn(), onChunk, vi.fn());

      await vi.waitFor(() => expect(onChunk).toHaveBeenCalledTimes(2));

      expect(onChunk).toHaveBeenNthCalledWith(1, 'Bon');
      expect(onChunk).toHaveBeenNthCalledWith(2, 'jour');
    });

    it('appelle onDone avec l’événement complet quand done est true', async () => {
      const onDone = vi.fn();
      const finalEvent: ApiStreamEvent = { done: true, mode: 'it', title: 'Titre généré' };
      fetchSpy.mockResolvedValue(
        buildFetchResponse(buildSseBody([`data: ${JSON.stringify(finalEvent)}`])),
      );

      service.chatStream('conv-1', [], vi.fn(), vi.fn(), onDone);

      await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(finalEvent));
    });

    it('ignore les lignes qui ne commencent pas par "data: "', async () => {
      const onChunk = vi.fn();
      fetchSpy.mockResolvedValue(
        buildFetchResponse(
          buildSseBody([': commentaire SSE', 'event: ping', 'data: {"chunk":"OK"}']),
        ),
      );

      service.chatStream('conv-1', [], vi.fn(), onChunk, vi.fn());

      await vi.waitFor(() => expect(onChunk).toHaveBeenCalledWith('OK'));
      expect(onChunk).toHaveBeenCalledTimes(1);
    });

    it('ignore les lignes "data: " vides', async () => {
      const onChunk = vi.fn();
      const onDone = vi.fn();
      fetchSpy.mockResolvedValue(
        buildFetchResponse(buildSseBody(['data:    ', 'data: {"done":true}'])),
      );

      service.chatStream('conv-1', [], vi.fn(), onChunk, onDone);

      await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
      expect(onChunk).not.toHaveBeenCalled();
    });

    it('ignore silencieusement une ligne JSON invalide sans planter le flux', async () => {
      const onDone = vi.fn();
      fetchSpy.mockResolvedValue(
        buildFetchResponse(buildSseBody(['data: {invalide', 'data: {"done":true}'])),
      );

      service.chatStream('conv-1', [], vi.fn(), vi.fn(), onDone);

      await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('appelle onError si fetch rejette', async () => {
      const onError = vi.fn();
      const error = new Error('network error');
      fetchSpy.mockRejectedValue(error);

      service.chatStream('conv-1', [], vi.fn(), vi.fn(), vi.fn(), onError);

      await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(error));
    });

    it('récupère le token via storageService.get("access_token")', async () => {
      fetchSpy.mockResolvedValue(buildFetchResponse(buildSseBody([])));

      service.chatStream('conv-1', [], vi.fn(), vi.fn(), vi.fn());

      await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled());
      expect(storageServiceMock.get).toHaveBeenCalledWith('access_token');
    });
  });

  describe('getItConversations', () => {
    it('envoie une requête GET vers /it/conversations', () => {
      const conversations = [buildItConversation()];
      let result: ApiItConversation[] | undefined;

      service.getItConversations().subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${API}/it/conversations`);
      expect(req.request.method).toBe('GET');
      req.flush(conversations);

      expect(result).toEqual(conversations);
    });
  });

  describe('createItConversation', () => {
    it('envoie une requête POST avec le titre', () => {
      const created = buildItConversation({ id: 'it-2', title: 'Nouvelle conv' });

      service.createItConversation('Nouvelle conv').subscribe();

      const req = httpMock.expectOne(`${API}/it/conversations`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ title: 'Nouvelle conv' });
      req.flush(created);
    });
  });

  describe('updateItConversation', () => {
    it('envoie une requête PATCH avec les données partielles', () => {
      const updated = buildItConversation({ id: 'it-1', isPinned: true });

      service.updateItConversation('it-1', { isPinned: true }).subscribe();

      const req = httpMock.expectOne(`${API}/it/conversations/it-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isPinned: true });
      req.flush(updated);
    });
  });

  describe('deleteItConversation', () => {
    it('envoie une requête DELETE', () => {
      service.deleteItConversation('it-1').subscribe();

      const req = httpMock.expectOne(`${API}/it/conversations/it-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getItMessages', () => {
    it('envoie une requête GET vers les messages de la conversation', () => {
      const messages = [buildItMessage()];
      let result: ApiItMessage[] | undefined;

      service.getItMessages('it-1').subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${API}/it/conversations/it-1/messages`);
      expect(req.request.method).toBe('GET');
      req.flush(messages);

      expect(result).toEqual(messages);
    });
  });

  describe('getRhSidebarHistory', () => {
    it('envoie une requête GET vers /rh/sidebar-history', () => {
      const conversations = [buildRhSidebarConversation()];
      let result: { conversations: RhSidebarConversation[] } | undefined;

      service.getRhSidebarHistory().subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${API}/rh/sidebar-history`);
      expect(req.request.method).toBe('GET');
      req.flush({ conversations });

      expect(result).toEqual({ conversations });
    });
  });

  describe('getRhConversationById', () => {
    it('envoie une requête GET vers /rh/conversation/:id', () => {
      const messages = [buildRhMessage()];
      let result: { conversationId: number; messages: ApiRhMessage[] } | undefined;

      service.getRhConversationById(1).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${API}/rh/conversation/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ conversationId: 1, messages });

      expect(result).toEqual({ conversationId: 1, messages });
    });
  });

  describe('deleteRhConversation', () => {
    it('envoie une requête DELETE vers /rh/conversation/:id', () => {
      service.deleteRhConversation(1).subscribe();

      const req = httpMock.expectOne(`${API}/rh/conversation/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('pinRhConversation', () => {
    it('envoie une requête PATCH avec isPinned', () => {
      service.pinRhConversation(1, true).subscribe();

      const req = httpMock.expectOne(`${API}/rh/conversation/1/pin`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isPinned: true });
      req.flush(null);
    });
  });

  describe('renameRhConversation', () => {
    it('envoie une requête PATCH avec le titre', () => {
      service.renameRhConversation(1, 'Nouveau titre').subscribe();

      const req = httpMock.expectOne(`${API}/rh/conversation/1/rename`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ title: 'Nouveau titre' });
      req.flush(null);
    });
  });

  describe('resetRhConversation', () => {
    it('envoie une requête DELETE vers /rh/reset', () => {
      let result: { message: string } | undefined;

      service.resetRhConversation().subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${API}/rh/reset`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Conversation réinitialisée.' });

      expect(result).toEqual({ message: 'Conversation réinitialisée.' });
    });
  });
});
