import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';

import { RhAssistantService } from './rh-assistant.service';
import { RhAssistantMapper } from '../mappers/rh-assistant.mapper';
import {
  ApiRhResponse,
  ApiConversationHistory,
  ApiStats,
  SidebarConversation,
} from '../models/rh-assistant.model';

const API = 'http://localhost:3000/api/rh-assistant';

const makeApiRhResponse = (): ApiRhResponse => ({
  response: 'Voici la réponse.',
  sources: [{ title: 'Doc', source: 'doc.pdf', page: 1 }],
  timestamp: '2024-01-15T10:00:00.000Z',
  conversationId: 7,
});

const makeApiHistory = (): ApiConversationHistory => ({
  conversationId: 5,
  userId: 1,
  messages: [
    {
      id: 1,
      role: 'user',
      content: 'Bonjour',
      sources: null,
      createdAt: '2024-01-15T10:00:00.000Z',
    },
  ],
  total: 1,
  createdAt: '2024-01-15T10:00:00.000Z',
});

const makeApiStats = (): ApiStats => ({
  totalConversations: 3,
  totalMessages: 9,
  userId: 1,
});

const makeConv = (overrides?: Partial<SidebarConversation>): SidebarConversation => ({
  id: 1,
  title: 'Conv 1',
  createdAt: '2024-01-15T10:00:00.000Z',
  isActive: false,
  isPinned: false,
  ...overrides,
});

function createService() {
  const http = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  };
  // ✅ any → unknown puis cast vers le type attendu
  const service = new RhAssistantService(
    http as unknown as import('@angular/common/http').HttpClient,
  );
  return { service, http };
}

describe('ask', () => {
  it("POST vers l'URL racine avec la question", () => {
    const { service, http } = createService();
    http.post.mockReturnValue(of(makeApiRhResponse()));
    service.ask('Quels sont les congés ?').subscribe();
    expect(http.post).toHaveBeenCalledWith(API, { question: 'Quels sont les congés ?' });
  });

  it('mappe la réponse via RhAssistantMapper.toRhResponse', () => {
    const { service, http } = createService();
    const apiRes = makeApiRhResponse();
    http.post.mockReturnValue(of(apiRes));
    const spy = vi.spyOn(RhAssistantMapper, 'toRhResponse');
    service.ask('Question').subscribe();
    expect(spy).toHaveBeenCalledWith(apiRes);
  });

  it('retourne un RhResponse mappé correctement', () => {
    const { service, http } = createService();
    http.post.mockReturnValue(of(makeApiRhResponse()));
    let result: unknown;
    service.ask('Question').subscribe((r) => (result = r));
    expect((result as { response: string }).response).toBe('Voici la réponse.');
    expect((result as { conversationId: number }).conversationId).toBe(7);
    expect((result as { sources: unknown[] }).sources).toHaveLength(1);
    expect((result as { timestamp: Date }).timestamp).toBeInstanceOf(Date);
  });

  it("POST sur l'URL exacte sans suffixe", () => {
    const { service, http } = createService();
    http.post.mockReturnValue(of(makeApiRhResponse()));
    service.ask('x').subscribe();
    const [url] = http.post.mock.calls[0];
    expect(url).toBe(API);
  });
});

describe('getHistory', () => {
  it('GET vers /history', () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of(makeApiHistory()));
    service.getHistory().subscribe();
    expect(http.get).toHaveBeenCalledWith(`${API}/history`);
  });

  it('mappe via RhAssistantMapper.toHistory', () => {
    const { service, http } = createService();
    const apiHistory = makeApiHistory();
    http.get.mockReturnValue(of(apiHistory));
    const spy = vi.spyOn(RhAssistantMapper, 'toHistory');
    service.getHistory().subscribe();
    expect(spy).toHaveBeenCalledWith(apiHistory);
  });

  it('retourne un ConversationHistory mappé', () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of(makeApiHistory()));
    let result: unknown;
    service.getHistory().subscribe((r) => (result = r));
    expect((result as { conversationId: number }).conversationId).toBe(5);
    expect((result as { messages: unknown[] }).messages).toHaveLength(1);
    expect((result as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
  });
});

describe('getStats', () => {
  it('GET vers /stats', () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of(makeApiStats()));
    service.getStats().subscribe();
    expect(http.get).toHaveBeenCalledWith(`${API}/stats`);
  });

  it('mappe via RhAssistantMapper.toStats', () => {
    const { service, http } = createService();
    const apiStats = makeApiStats();
    http.get.mockReturnValue(of(apiStats));
    const spy = vi.spyOn(RhAssistantMapper, 'toStats');
    service.getStats().subscribe();
    expect(spy).toHaveBeenCalledWith(apiStats);
  });

  it('retourne un Stats mappé', () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of(makeApiStats()));
    let result: unknown;
    service.getStats().subscribe((r) => (result = r));
    expect((result as { totalConversations: number }).totalConversations).toBe(3);
    expect((result as { totalMessages: number }).totalMessages).toBe(9);
    expect((result as { userId: number }).userId).toBe(1);
  });
});

describe('reset', () => {
  it('DELETE vers /reset', () => {
    const { service, http } = createService();
    http.delete.mockReturnValue(of({ message: 'ok' }));
    service.reset().subscribe();
    expect(http.delete).toHaveBeenCalledWith(`${API}/reset`);
  });

  it('retourne le message de confirmation', () => {
    const { service, http } = createService();
    http.delete.mockReturnValue(of({ message: 'Conversation réinitialisée' }));
    let result: unknown;
    service.reset().subscribe((r) => (result = r));
    expect((result as { message: string }).message).toBe('Conversation réinitialisée');
  });

  it('ne passe aucun body', () => {
    const { service, http } = createService();
    http.delete.mockReturnValue(of({ message: 'ok' }));
    service.reset().subscribe();
    expect(http.delete).toHaveBeenCalledWith(`${API}/reset`);
    expect(http.delete.mock.calls[0]).toHaveLength(1);
  });
});

describe('getSidebarHistory', () => {
  it('GET vers /sidebar-history', () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of({ conversations: [] }));
    service.getSidebarHistory().subscribe();
    expect(http.get).toHaveBeenCalledWith(`${API}/sidebar-history`);
  });

  it('retourne les conversations telles quelles', () => {
    const { service, http } = createService();
    const convs = [makeConv({ id: 1 }), makeConv({ id: 2, title: 'C2' })];
    http.get.mockReturnValue(of({ conversations: convs }));
    let result: unknown;
    service.getSidebarHistory().subscribe((r) => (result = r));
    expect((result as { conversations: unknown[] }).conversations).toHaveLength(2);
    expect((result as { conversations: SidebarConversation[] }).conversations[0].id).toBe(1);
  });

  it('retourne un tableau vide si aucune conversation', () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of({ conversations: [] }));
    let result: unknown;
    service.getSidebarHistory().subscribe((r) => (result = r));
    expect((result as { conversations: unknown[] }).conversations).toEqual([]);
  });
});

describe('getConversationById', () => {
  it('GET vers /conversation/:id', () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of({ conversationId: 42, messages: [] }));
    service.getConversationById(42).subscribe();
    expect(http.get).toHaveBeenCalledWith(`${API}/conversation/42`);
  });

  it("interpole correctement l'id dans l'URL", () => {
    const { service, http } = createService();
    http.get.mockReturnValue(of({ conversationId: 99, messages: [] }));
    service.getConversationById(99).subscribe();
    const [url] = http.get.mock.calls[0];
    expect(url).toBe(`${API}/conversation/99`);
  });

  it('retourne conversationId et messages', () => {
    const { service, http } = createService();
    const messages = [{ id: 1, role: 'user', content: 'Bonjour', sources: null, createdAt: '' }];
    http.get.mockReturnValue(of({ conversationId: 5, messages }));
    let result: unknown;
    service.getConversationById(5).subscribe((r) => (result = r));
    expect((result as { conversationId: number }).conversationId).toBe(5);
    expect((result as { messages: unknown[] }).messages).toHaveLength(1);
  });
});

describe('deleteConversation', () => {
  it('DELETE vers /conversation/:id', () => {
    const { service, http } = createService();
    http.delete.mockReturnValue(of({}));
    service.deleteConversation(3).subscribe();
    expect(http.delete).toHaveBeenCalledWith(`${API}/conversation/3`);
  });

  it("interpole correctement l'id dans l'URL", () => {
    const { service, http } = createService();
    http.delete.mockReturnValue(of({}));
    service.deleteConversation(77).subscribe();
    const [url] = http.delete.mock.calls[0];
    expect(url).toBe(`${API}/conversation/77`);
  });

  it('ne passe aucun body', () => {
    const { service, http } = createService();
    http.delete.mockReturnValue(of({}));
    service.deleteConversation(1).subscribe();
    expect(http.delete.mock.calls[0]).toHaveLength(1);
  });
});

describe('pinConversation', () => {
  it('PATCH vers /conversation/:id/pin', () => {
    const { service, http } = createService();
    http.patch.mockReturnValue(of({}));
    service.pinConversation(4, true).subscribe();
    expect(http.patch).toHaveBeenCalledWith(`${API}/conversation/4/pin`, { isPinned: true });
  });

  it('passe isPinned: true quand on épingle', () => {
    const { service, http } = createService();
    http.patch.mockReturnValue(of({}));
    service.pinConversation(1, true).subscribe();
    const [, body] = http.patch.mock.calls[0];
    expect(body).toEqual({ isPinned: true });
  });

  it('passe isPinned: false quand on dépingle', () => {
    const { service, http } = createService();
    http.patch.mockReturnValue(of({}));
    service.pinConversation(1, false).subscribe();
    const [, body] = http.patch.mock.calls[0];
    expect(body).toEqual({ isPinned: false });
  });

  it("interpole correctement l'id dans l'URL", () => {
    const { service, http } = createService();
    http.patch.mockReturnValue(of({}));
    service.pinConversation(55, true).subscribe();
    const [url] = http.patch.mock.calls[0];
    expect(url).toBe(`${API}/conversation/55/pin`);
  });
});
