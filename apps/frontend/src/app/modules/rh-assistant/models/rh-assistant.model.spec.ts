import { describe, it, expect } from 'vitest';
import type {
  Source,
  Message,
  RhResponse,
  ConversationHistory,
  Stats,
  ApiMessage,
  ApiSource,
  ApiConversationHistory,
  ApiRhResponse,
  ApiStats,
  SidebarConversation,
} from './rh-assistant.model';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — factories typées
// ─────────────────────────────────────────────────────────────────────────────

const makeSource = (overrides?: Partial<Source>): Source => ({
  title: 'Règlement intérieur',
  source: 'doc.pdf',
  page: 3,
  ...overrides,
});

const makeMessage = (overrides?: Partial<Message>): Message => ({
  role: 'user',
  content: 'Bonjour',
  ...overrides,
});

const makeApiSource = (overrides?: Partial<ApiSource>): ApiSource => ({
  title: 'Règlement intérieur',
  source: 'doc.pdf',
  page: 3,
  ...overrides,
});

const makeApiMessage = (overrides?: Partial<ApiMessage>): ApiMessage => ({
  id: 1,
  role: 'user',
  content: 'Bonjour',
  sources: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Source
// ─────────────────────────────────────────────────────────────────────────────

describe('Source', () => {
  it('accepte une page de type number', () => {
    const s: Source = makeSource({ page: 5 });
    expect(typeof s.page).toBe('number');
  });

  it('accepte une page de type string', () => {
    const s: Source = makeSource({ page: '5' });
    expect(typeof s.page).toBe('string');
  });

  it('contient les champs title, source et page', () => {
    const s = makeSource();
    expect(s).toHaveProperty('title');
    expect(s).toHaveProperty('source');
    expect(s).toHaveProperty('page');
  });

  it('title et source sont des strings non vides', () => {
    const s = makeSource();
    expect(s.title.length).toBeGreaterThan(0);
    expect(s.source.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Message
// ─────────────────────────────────────────────────────────────────────────────

describe('Message', () => {
  it('crée un message user minimal sans champs optionnels', () => {
    const m: Message = makeMessage();
    expect(m.role).toBe('user');
    expect(m.content).toBe('Bonjour');
    expect(m.id).toBeUndefined();
    expect(m.sources).toBeUndefined();
    expect(m.createdAt).toBeUndefined();
    expect(m.isLoading).toBeUndefined();
  });

  it('crée un message assistant avec tous les champs optionnels', () => {
    const m: Message = makeMessage({
      id: 42,
      role: 'assistant',
      content: 'Voici la réponse.',
      sources: [makeSource()],
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
      isLoading: false,
    });
    expect(m.role).toBe('assistant');
    expect(m.id).toBe(42);
    expect(m.sources).toHaveLength(1);
    expect(m.createdAt).toBeInstanceOf(Date);
    expect(m.isLoading).toBe(false);
  });

  it('role est strictement "user" ou "assistant"', () => {
    const roles: Message['role'][] = ['user', 'assistant'];
    roles.forEach((role) => {
      const m = makeMessage({ role });
      expect(['user', 'assistant']).toContain(m.role);
    });
  });

  it('isLoading peut être true pour un message en attente', () => {
    const m: Message = makeMessage({ role: 'assistant', content: '', isLoading: true });
    expect(m.isLoading).toBe(true);
    expect(m.content).toBe('');
  });

  it('sources peut être un tableau vide', () => {
    const m: Message = makeMessage({ sources: [] });
    expect(m.sources).toEqual([]);
  });

  it('sources peut contenir plusieurs entrées', () => {
    const m: Message = makeMessage({
      sources: [makeSource({ page: 1 }), makeSource({ page: 2 })],
    });
    expect(m.sources).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RhResponse
// ─────────────────────────────────────────────────────────────────────────────

describe('RhResponse', () => {
  it('contient tous les champs requis', () => {
    const r: RhResponse = {
      response: 'Voici votre réponse.',
      sources: [makeSource()],
      timestamp: new Date(),
      conversationId: 7,
    };
    expect(r.response).toBeTruthy();
    expect(r.sources).toHaveLength(1);
    expect(r.timestamp).toBeInstanceOf(Date);
    expect(r.conversationId).toBe(7);
  });

  it('sources peut être vide', () => {
    const r: RhResponse = {
      response: 'Réponse sans source.',
      sources: [],
      timestamp: new Date(),
      conversationId: 1,
    };
    expect(r.sources).toEqual([]);
  });

  it('conversationId est un nombre positif', () => {
    const r: RhResponse = {
      response: '',
      sources: [],
      timestamp: new Date(),
      conversationId: 99,
    };
    expect(r.conversationId).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ConversationHistory
// ─────────────────────────────────────────────────────────────────────────────

describe('ConversationHistory', () => {
  it('contient tous les champs requis', () => {
    const h: ConversationHistory = {
      conversationId: 1,
      userId: 10,
      messages: [makeMessage()],
      total: 1,
      createdAt: new Date('2024-01-15'),
    };
    expect(h.conversationId).toBe(1);
    expect(h.userId).toBe(10);
    expect(h.messages).toHaveLength(1);
    expect(h.total).toBe(1);
    expect(h.createdAt).toBeInstanceOf(Date);
  });

  it('messages peut être un tableau vide', () => {
    const h: ConversationHistory = {
      conversationId: 2,
      userId: 5,
      messages: [],
      total: 0,
      createdAt: new Date(),
    };
    expect(h.messages).toEqual([]);
    expect(h.total).toBe(0);
  });

  it('total reflète le nombre de messages', () => {
    const msgs = [makeMessage(), makeMessage({ role: 'assistant', content: 'Ok' })];
    const h: ConversationHistory = {
      conversationId: 3,
      userId: 1,
      messages: msgs,
      total: msgs.length,
      createdAt: new Date(),
    };
    expect(h.total).toBe(h.messages.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('Stats', () => {
  it('contient tous les champs requis avec des valeurs numériques', () => {
    const s: Stats = { totalConversations: 5, totalMessages: 20, userId: 3 };
    expect(typeof s.totalConversations).toBe('number');
    expect(typeof s.totalMessages).toBe('number');
    expect(typeof s.userId).toBe('number');
  });

  it('accepte des valeurs à zéro', () => {
    const s: Stats = { totalConversations: 0, totalMessages: 0, userId: 1 };
    expect(s.totalConversations).toBe(0);
    expect(s.totalMessages).toBe(0);
  });

  it('totalMessages >= totalConversations est cohérent', () => {
    const s: Stats = { totalConversations: 3, totalMessages: 12, userId: 1 };
    expect(s.totalMessages).toBeGreaterThanOrEqual(s.totalConversations);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ApiSource
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiSource', () => {
  it('a la même structure que Source (mapping 1-pour-1)', () => {
    const api: ApiSource = makeApiSource();
    const domain: Source = { title: api.title, source: api.source, page: api.page };
    expect(domain).toEqual(api);
  });

  it('page accepte string ou number', () => {
    expect(typeof makeApiSource({ page: 2 }).page).toBe('number');
    expect(typeof makeApiSource({ page: '2' }).page).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ApiMessage
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiMessage', () => {
  it('sources peut être null (non encore chargé)', () => {
    const m = makeApiMessage({ sources: null });
    expect(m.sources).toBeNull();
  });

  it("sources peut être un tableau d'ApiSource", () => {
    const m = makeApiMessage({ sources: [makeApiSource()] });
    expect(m.sources).toHaveLength(1);
  });

  it('createdAt est une string ISO', () => {
    const m = makeApiMessage();
    expect(() => new Date(m.createdAt)).not.toThrow();
    expect(new Date(m.createdAt).toISOString()).toBe(m.createdAt);
  });

  it('role est une string libre (pas encore discriminée)', () => {
    const m = makeApiMessage({ role: 'system' });
    expect(typeof m.role).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ApiConversationHistory
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiConversationHistory', () => {
  it('contient tous les champs requis', () => {
    const h: ApiConversationHistory = {
      conversationId: 1,
      userId: 10,
      messages: [makeApiMessage()],
      total: 1,
      createdAt: '2024-01-15T10:00:00.000Z',
    };
    expect(h.conversationId).toBe(1);
    expect(h.messages).toHaveLength(1);
    expect(typeof h.createdAt).toBe('string');
  });

  it('createdAt est parseable en Date', () => {
    const h: ApiConversationHistory = {
      conversationId: 1,
      userId: 1,
      messages: [],
      total: 0,
      createdAt: '2024-06-01T08:30:00.000Z',
    };
    const d = new Date(h.createdAt);
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5); // juin = index 5
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ApiRhResponse
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiRhResponse', () => {
  it('contient tous les champs requis', () => {
    const r: ApiRhResponse = {
      response: 'Réponse API',
      sources: [makeApiSource()],
      timestamp: '2024-01-15T10:05:00.000Z',
      conversationId: 4,
    };
    expect(r.response).toBe('Réponse API');
    expect(r.sources).toHaveLength(1);
    expect(typeof r.timestamp).toBe('string');
    expect(r.conversationId).toBe(4);
  });

  it('timestamp est parseable en Date', () => {
    const r: ApiRhResponse = {
      response: '',
      sources: [],
      timestamp: '2024-03-10T14:00:00.000Z',
      conversationId: 1,
    };
    expect(new Date(r.timestamp)).toBeInstanceOf(Date);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ApiStats
// ─────────────────────────────────────────────────────────────────────────────

describe('ApiStats', () => {
  it('a exactement la même forme que Stats', () => {
    const api: ApiStats = { totalConversations: 3, totalMessages: 9, userId: 2 };
    const domain: Stats = { totalConversations: 3, totalMessages: 9, userId: 2 };
    expect(api).toEqual(domain);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SidebarConversation
// ─────────────────────────────────────────────────────────────────────────────

describe('SidebarConversation', () => {
  it('contient tous les champs requis', () => {
    const c: SidebarConversation = {
      id: 1,
      title: 'Question sur les congés',
      createdAt: '2024-01-15T10:00:00.000Z',
      isActive: true,
      isPinned: false,
    };
    expect(c.id).toBe(1);
    expect(c.title).toBeTruthy();
    expect(typeof c.createdAt).toBe('string');
    expect(c.isActive).toBe(true);
    expect(c.isPinned).toBe(false);
  });

  it('isPinned et isActive sont des booléens indépendants', () => {
    const pinned: SidebarConversation = {
      id: 1,
      title: 'A',
      createdAt: '',
      isActive: false,
      isPinned: true,
    };
    const active: SidebarConversation = {
      id: 2,
      title: 'B',
      createdAt: '',
      isActive: true,
      isPinned: false,
    };
    const both: SidebarConversation = {
      id: 3,
      title: 'C',
      createdAt: '',
      isActive: true,
      isPinned: true,
    };
    const neither: SidebarConversation = {
      id: 4,
      title: 'D',
      createdAt: '',
      isActive: false,
      isPinned: false,
    };

    expect(pinned.isPinned).toBe(true);
    expect(active.isActive).toBe(true);
    expect(both.isPinned && both.isActive).toBe(true);
    expect(neither.isPinned || neither.isActive).toBe(false);
  });

  it('createdAt est parseable en Date', () => {
    const c: SidebarConversation = {
      id: 1,
      title: 'T',
      createdAt: '2024-05-20T09:15:00.000Z',
      isActive: false,
      isPinned: false,
    };
    expect(new Date(c.createdAt)).toBeInstanceOf(Date);
  });

  it('id est un nombre entier positif', () => {
    const c: SidebarConversation = {
      id: 99,
      title: 'T',
      createdAt: '',
      isActive: false,
      isPinned: false,
    };
    expect(Number.isInteger(c.id)).toBe(true);
    expect(c.id).toBeGreaterThan(0);
  });
});
