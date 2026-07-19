import { describe, it, expect, vi, afterEach } from 'vitest';

import { UnifiedAssistantMapper } from './unified-assistant.mapper';
import {
  ApiItConversation,
  ApiItMessage,
  ApiRhMessage,
  Source,
} from '../models/unified-assistant.model';

const FIXED_UUID = '12345678-1234-1234-1234-123456789012' as const;

const buildSource = (overrides: Partial<Source> = {}): Source => ({
  title: 'Guide RH',
  source: 'handbook.pdf',
  page: 12,
  ...overrides,
});

interface NullableSourceFields {
  title: string | null;
  source: string | null;
  page: string | number | null;
}

const buildNullSource = (): Source => {
  const nullable: NullableSourceFields = { title: null, source: null, page: null };
  return nullable as NullableSourceFields as Source;
};

const buildItMessage = (overrides: Partial<ApiItMessage> = {}): ApiItMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Comment fonctionne Docker ?',
  createdAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
});

const buildRhMessage = (overrides: Partial<ApiRhMessage> = {}): ApiRhMessage => ({
  id: 1,
  role: 'user',
  content: 'Combien de congés ?',
  sources: null,
  createdAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
});

const buildItConversation = (overrides: Partial<ApiItConversation> = {}): ApiItConversation => ({
  id: 'it-1',
  title: 'Conversation IT',
  isPinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('UnifiedAssistantMapper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toSourceList', () => {
    it('mappe une liste de sources avec valeurs par défaut si champs absents', () => {
      const sources: Source[] = [
        buildSource({ title: 'Guide', source: 'doc.pdf', page: 5 }),
        buildNullSource(),
      ];

      const result = UnifiedAssistantMapper.toSourceList(sources);

      expect(result[0]).toEqual({ title: 'Guide', source: 'doc.pdf', page: 5 });
      expect(result[1]).toEqual({ title: 'Inconnu', source: 'Inconnu', page: 'Inconnue' });
    });

    it('retourne un tableau vide si sources est null', () => {
      expect(UnifiedAssistantMapper.toSourceList(null)).toEqual([]);
    });

    it('retourne un tableau vide si sources est undefined', () => {
      expect(UnifiedAssistantMapper.toSourceList(undefined)).toEqual([]);
    });

    it('retourne un tableau vide si sources n’est pas un tableau', () => {
      const notAnArray = { length: 0 } as unknown as Source[];
      expect(UnifiedAssistantMapper.toSourceList(notAnArray)).toEqual([]);
    });

    it('retourne un tableau vide si sources est un tableau vide', () => {
      expect(UnifiedAssistantMapper.toSourceList([])).toEqual([]);
    });
  });

  describe('fromItMessage', () => {
    it('mappe un message IT utilisateur', () => {
      const api = buildItMessage({ role: 'user', content: 'Bonjour' });

      const result = UnifiedAssistantMapper.fromItMessage(api);

      expect(result).toEqual({
        id: 'msg-1',
        role: 'user',
        content: 'Bonjour',
        timestamp: new Date('2026-01-01T10:00:00.000Z'),
        mode: 'it',
        isLoading: false,
      });
    });

    it('mappe tout rôle différent de "user" vers "assistant"', () => {
      const api = buildItMessage({ role: 'bot' });

      const result = UnifiedAssistantMapper.fromItMessage(api);

      expect(result.role).toBe('assistant');
    });
  });

  describe('fromRhMessage', () => {
    it('mappe un message RH avec sources', () => {
      const api = buildRhMessage({ sources: [buildSource()] });

      const result = UnifiedAssistantMapper.fromRhMessage(api);

      expect(result).toEqual({
        id: 1,
        role: 'user',
        content: 'Combien de congés ?',
        timestamp: new Date('2026-01-01T10:00:00.000Z'),
        mode: 'rh',
        sources: [buildSource()],
        isLoading: false,
      });
    });

    it('mappe un message RH sans sources (null) vers un tableau vide', () => {
      const api = buildRhMessage({ sources: null });

      const result = UnifiedAssistantMapper.fromRhMessage(api);

      expect(result.sources).toEqual([]);
    });

    it('mappe tout rôle différent de "user" vers "assistant"', () => {
      const api = buildRhMessage({ role: 'bot' });

      const result = UnifiedAssistantMapper.fromRhMessage(api);

      expect(result.role).toBe('assistant');
    });
  });

  describe('fromItConversation', () => {
    it('mappe une conversation IT', () => {
      const api = buildItConversation({ id: 'it-42', title: 'Discussion', isPinned: true });

      const result = UnifiedAssistantMapper.fromItConversation(api);

      expect(result).toEqual({
        id: 'it-42',
        title: 'Discussion',
        mode: 'it',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        isPinned: true,
      });
    });
  });

  describe('createUserMessage', () => {
    it('crée un message utilisateur avec le mode fourni', () => {
      const result = UnifiedAssistantMapper.createUserMessage('Bonjour', 'rh');

      expect(result.role).toBe('user');
      expect(result.content).toBe('Bonjour');
      expect(result.mode).toBe('rh');
      expect(result.isLoading).toBe(false);
      expect(result.id).toEqual(expect.any(String));
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('utilise undefined comme mode si null est fourni', () => {
      const result = UnifiedAssistantMapper.createUserMessage('Bonjour', null);

      expect(result.mode).toBeUndefined();
    });

    it('génère un id via crypto.randomUUID', () => {
      const randomUUIDSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(FIXED_UUID);

      const result = UnifiedAssistantMapper.createUserMessage('Bonjour', 'it');

      expect(randomUUIDSpy).toHaveBeenCalled();
      expect(result.id).toBe(FIXED_UUID);
    });
  });

  describe('createLoadingMessage', () => {
    it('crée un message assistant vide en isLoading', () => {
      const result = UnifiedAssistantMapper.createLoadingMessage();

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('');
      expect(result.isLoading).toBe(true);
      expect(result.id).toEqual(expect.any(String));
    });
  });

  describe('createErrorMessage', () => {
    it('crée un message assistant d’erreur non isLoading', () => {
      const result = UnifiedAssistantMapper.createErrorMessage();

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Une erreur est survenue. Veuillez réessayer.');
      expect(result.isLoading).toBe(false);
      expect(result.id).toEqual(expect.any(String));
    });
  });
});
