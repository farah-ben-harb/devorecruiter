import { describe, it, expect } from 'vitest';

import { RhAssistantMapper } from './rh-assistant.mapper';
import {
  ApiSource,
  ApiMessage,
  ApiRhResponse,
  ApiConversationHistory,
  ApiStats,
} from '../models/rh-assistant.model';

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

const makeApiRhResponse = (overrides?: Partial<ApiRhResponse>): ApiRhResponse => ({
  response: 'Voici la réponse.',
  sources: [makeApiSource()],
  timestamp: '2024-01-15T10:05:00.000Z',
  conversationId: 7,
  ...overrides,
});

const makeApiHistory = (overrides?: Partial<ApiConversationHistory>): ApiConversationHistory => ({
  conversationId: 5,
  userId: 1,
  messages: [makeApiMessage()],
  total: 1,
  createdAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

const makeApiStats = (overrides?: Partial<ApiStats>): ApiStats => ({
  totalConversations: 3,
  totalMessages: 9,
  userId: 1,
  ...overrides,
});

// ─── Type helper pour forcer des champs manquants dans les tests ──────────────
// On utilise Omit + reconstitution partielle pour simuler des données invalides
// sans recourir à `any` ni `unknown`

describe('toSource', () => {
  it('mappe les champs correctement', () => {
    const result = RhAssistantMapper.toSource(makeApiSource());
    expect(result).toEqual({ title: 'Règlement intérieur', source: 'doc.pdf', page: 3 });
  });

  it('utilise "Inconnu" si title est undefined', () => {
    // ✅ On construit un objet conforme à ApiSource mais avec title absent
    const input: ApiSource = { ...makeApiSource(), title: undefined as never };
    const result = RhAssistantMapper.toSource(input);
    expect(result.title).toBe('Inconnu');
  });

  it('utilise "Inconnu" si source est undefined', () => {
    const input: ApiSource = { ...makeApiSource(), source: undefined as never };
    const result = RhAssistantMapper.toSource(input);
    expect(result.source).toBe('Inconnu');
  });

  it('utilise "Inconnue" si page est undefined', () => {
    const input: ApiSource = { ...makeApiSource(), page: undefined as never };
    const result = RhAssistantMapper.toSource(input);
    expect(result.page).toBe('Inconnue');
  });

  it('accepte page de type string', () => {
    const result = RhAssistantMapper.toSource(makeApiSource({ page: '5' }));
    expect(result.page).toBe('5');
  });

  it('accepte page de type number', () => {
    const result = RhAssistantMapper.toSource(makeApiSource({ page: 5 }));
    expect(result.page).toBe(5);
  });
});

describe('toSourceList', () => {
  it('retourne [] si null', () => {
    expect(RhAssistantMapper.toSourceList(null)).toEqual([]);
  });

  it('retourne [] si undefined', () => {
    const input = undefined as never;
    expect(RhAssistantMapper.toSourceList(input)).toEqual([]);
  });

  it('retourne [] si tableau vide', () => {
    expect(RhAssistantMapper.toSourceList([])).toEqual([]);
  });

  it('mappe chaque source du tableau', () => {
    const list = [makeApiSource({ page: 1 }), makeApiSource({ page: 2 })];
    const result = RhAssistantMapper.toSourceList(list);
    expect(result).toHaveLength(2);
    expect(result[0].page).toBe(1);
    expect(result[1].page).toBe(2);
  });

  it("retourne [] si la valeur n'est pas un tableau", () => {
    const input = 'not an array' as never;
    expect(RhAssistantMapper.toSourceList(input)).toEqual([]);
  });
});

describe('toMessage', () => {
  it('mappe un message user correctement', () => {
    const result = RhAssistantMapper.toMessage(makeApiMessage());
    expect(result.id).toBe(1);
    expect(result.role).toBe('user');
    expect(result.content).toBe('Bonjour');
    expect(result.isLoading).toBe(false);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('mappe role "assistant" correctement', () => {
    const result = RhAssistantMapper.toMessage(makeApiMessage({ role: 'assistant' }));
    expect(result.role).toBe('assistant');
  });

  it('tout rôle différent de "user" devient "assistant"', () => {
    const input: ApiMessage = { ...makeApiMessage(), role: 'system' as never };
    const result = RhAssistantMapper.toMessage(input);
    expect(result.role).toBe('assistant');
  });

  it('content vaut "" si undefined', () => {
    const input: ApiMessage = { ...makeApiMessage(), content: undefined as never };
    const result = RhAssistantMapper.toMessage(input);
    expect(result.content).toBe('');
  });

  it('createdAt est undefined si la string est vide', () => {
    const result = RhAssistantMapper.toMessage(makeApiMessage({ createdAt: '' }));
    expect(result.createdAt).toBeUndefined();
  });

  it('parse createdAt en Date', () => {
    const result = RhAssistantMapper.toMessage(
      makeApiMessage({ createdAt: '2024-06-01T08:00:00.000Z' }),
    );
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt!.getFullYear()).toBe(2024);
  });

  it('sources vaut [] si null', () => {
    const result = RhAssistantMapper.toMessage(makeApiMessage({ sources: null }));
    expect(result.sources).toEqual([]);
  });

  it('mappe les sources si présentes', () => {
    const result = RhAssistantMapper.toMessage(
      makeApiMessage({ sources: [makeApiSource(), makeApiSource({ page: 2 })] }),
    );
    expect(result.sources).toHaveLength(2);
  });

  it('isLoading est toujours false', () => {
    const result = RhAssistantMapper.toMessage(makeApiMessage());
    expect(result.isLoading).toBe(false);
  });
});

describe('toMessageList', () => {
  it('retourne [] si null', () => {
    const input = null as never;
    expect(RhAssistantMapper.toMessageList(input)).toEqual([]);
  });

  it('retourne [] si undefined', () => {
    const input = undefined as never;
    expect(RhAssistantMapper.toMessageList(input)).toEqual([]);
  });

  it('retourne [] si tableau vide', () => {
    expect(RhAssistantMapper.toMessageList([])).toEqual([]);
  });

  it('mappe chaque message du tableau', () => {
    const list = [
      makeApiMessage({ id: 1, role: 'user' }),
      makeApiMessage({ id: 2, role: 'assistant', content: 'Réponse' }),
    ];
    const result = RhAssistantMapper.toMessageList(list);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
  });
});

describe('toRhResponse', () => {
  it('mappe tous les champs correctement', () => {
    const result = RhAssistantMapper.toRhResponse(makeApiRhResponse());
    expect(result.response).toBe('Voici la réponse.');
    expect(result.conversationId).toBe(7);
    expect(result.sources).toHaveLength(1);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('response vaut "" si undefined', () => {
    const input: ApiRhResponse = { ...makeApiRhResponse(), response: undefined as never };
    const result = RhAssistantMapper.toRhResponse(input);
    expect(result.response).toBe('');
  });

  it('conversationId vaut 0 si undefined', () => {
    const input: ApiRhResponse = { ...makeApiRhResponse(), conversationId: undefined as never };
    const result = RhAssistantMapper.toRhResponse(input);
    expect(result.conversationId).toBe(0);
  });

  it('timestamp est une Date valide parsée depuis la string', () => {
    const result = RhAssistantMapper.toRhResponse(
      makeApiRhResponse({ timestamp: '2024-03-10T14:00:00.000Z' }),
    );
    expect(result.timestamp.getFullYear()).toBe(2024);
  });

  it('timestamp est new Date() si la string est vide', () => {
    const before = Date.now();
    const result = RhAssistantMapper.toRhResponse(makeApiRhResponse({ timestamp: '' }));
    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('sources vaut [] si null', () => {
    const input: ApiRhResponse = { ...makeApiRhResponse(), sources: null as never };
    const result = RhAssistantMapper.toRhResponse(input);
    expect(result.sources).toEqual([]);
  });
});

describe('toHistory', () => {
  it('mappe tous les champs correctement', () => {
    const result = RhAssistantMapper.toHistory(makeApiHistory());
    expect(result.conversationId).toBe(5);
    expect(result.userId).toBe(1);
    expect(result.total).toBe(1);
    expect(result.messages).toHaveLength(1);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('conversationId vaut 0 si undefined', () => {
    const input: ApiConversationHistory = {
      ...makeApiHistory(),
      conversationId: undefined as never,
    };
    const result = RhAssistantMapper.toHistory(input);
    expect(result.conversationId).toBe(0);
  });

  it('userId vaut 0 si undefined', () => {
    const input: ApiConversationHistory = { ...makeApiHistory(), userId: undefined as never };
    const result = RhAssistantMapper.toHistory(input);
    expect(result.userId).toBe(0);
  });

  it('total vaut 0 si undefined', () => {
    const input: ApiConversationHistory = { ...makeApiHistory(), total: undefined as never };
    const result = RhAssistantMapper.toHistory(input);
    expect(result.total).toBe(0);
  });

  it('messages vaut [] si undefined', () => {
    const input: ApiConversationHistory = { ...makeApiHistory(), messages: undefined as never };
    const result = RhAssistantMapper.toHistory(input);
    expect(result.messages).toEqual([]);
  });

  it('createdAt est new Date() si la string est vide', () => {
    const before = Date.now();
    const result = RhAssistantMapper.toHistory(makeApiHistory({ createdAt: '' }));
    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('parse createdAt en Date', () => {
    const result = RhAssistantMapper.toHistory(
      makeApiHistory({ createdAt: '2024-05-20T09:00:00.000Z' }),
    );
    expect(result.createdAt.getFullYear()).toBe(2024);
    expect(result.createdAt.getMonth()).toBe(4);
  });
});

describe('toStats', () => {
  it('mappe tous les champs correctement', () => {
    const result = RhAssistantMapper.toStats(makeApiStats());
    expect(result.totalConversations).toBe(3);
    expect(result.totalMessages).toBe(9);
    expect(result.userId).toBe(1);
  });

  it('totalConversations vaut 0 si undefined', () => {
    const input: ApiStats = { ...makeApiStats(), totalConversations: undefined as never };
    const result = RhAssistantMapper.toStats(input);
    expect(result.totalConversations).toBe(0);
  });

  it('totalMessages vaut 0 si undefined', () => {
    const input: ApiStats = { ...makeApiStats(), totalMessages: undefined as never };
    const result = RhAssistantMapper.toStats(input);
    expect(result.totalMessages).toBe(0);
  });

  it('userId vaut 0 si undefined', () => {
    const input: ApiStats = { ...makeApiStats(), userId: undefined as never };
    const result = RhAssistantMapper.toStats(input);
    expect(result.userId).toBe(0);
  });
});

describe('createUserMessage', () => {
  it('crée un message user avec le contenu fourni', () => {
    const result = RhAssistantMapper.createUserMessage('Ma question');
    expect(result.role).toBe('user');
    expect(result.content).toBe('Ma question');
    expect(result.isLoading).toBe(false);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('createdAt est proche de maintenant', () => {
    const before = Date.now();
    const result = RhAssistantMapper.createUserMessage('Test');
    expect(result.createdAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("n'a pas d'id ni de sources", () => {
    const result = RhAssistantMapper.createUserMessage('Test');
    expect(result.id).toBeUndefined();
    expect(result.sources).toBeUndefined();
  });
});

describe('createLoadingMessage', () => {
  it('crée un message assistant avec isLoading à true', () => {
    const result = RhAssistantMapper.createLoadingMessage();
    expect(result.role).toBe('assistant');
    expect(result.content).toBe('');
    expect(result.isLoading).toBe(true);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('content est une string vide', () => {
    expect(RhAssistantMapper.createLoadingMessage().content).toBe('');
  });
});

describe('createErrorMessage', () => {
  it('crée un message assistant avec isLoading à false', () => {
    const result = RhAssistantMapper.createErrorMessage();
    expect(result.role).toBe('assistant');
    expect(result.isLoading).toBe(false);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("content contient le message d'erreur attendu", () => {
    const result = RhAssistantMapper.createErrorMessage();
    expect(result.content).toBe('Une erreur est survenue. Veuillez réessayer.');
  });

  it('createdAt est proche de maintenant', () => {
    const before = Date.now();
    const result = RhAssistantMapper.createErrorMessage();
    expect(result.createdAt!.getTime()).toBeGreaterThanOrEqual(before);
  });
});
