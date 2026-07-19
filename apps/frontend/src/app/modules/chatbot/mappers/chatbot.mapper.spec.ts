import { describe, it, expect, vi, afterEach } from 'vitest';
import { ChatbotMapper } from './chatbot.mapper';
import { ChatResponse } from '../models/chatbot.model';

describe('ChatbotMapper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('responseToMessage', () => {
    it('mappe une ChatResponse vers un ChatMessage assistant', () => {
      const response: ChatResponse = {
        response: 'Voici votre réponse.',
        sessionId: 'session-1',
        timestamp: '2026-01-01T10:00:00.000Z',
      };

      const result = ChatbotMapper.responseToMessage(response);

      expect(result.content).toBe('Voici votre réponse.');
      expect(result.role).toBe('assistant');
      expect(result.timestamp).toEqual(new Date('2026-01-01T10:00:00.000Z'));
      expect(result.id).toEqual(expect.any(String));
      expect(result.isLoading).toBeUndefined();
    });

    it('génère un id unique via crypto.randomUUID', () => {
      const FIXED_UUID = '12345678-1234-1234-1234-123456789012' as const;
      const randomUUIDSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(FIXED_UUID);

      const response: ChatResponse = {
        response: 'Réponse',
        sessionId: 'session-2',
        timestamp: '2026-01-01T10:00:00.000Z',
      };

      const result = ChatbotMapper.responseToMessage(response);

      expect(randomUUIDSpy).toHaveBeenCalled();
      expect(result.id).toBe(FIXED_UUID);
    });
  });

  describe('userInputToMessage', () => {
    it('mappe un contenu texte vers un ChatMessage utilisateur', () => {
      const result = ChatbotMapper.userInputToMessage('Combien de candidats ?');

      expect(result.content).toBe('Combien de candidats ?');
      expect(result.role).toBe('user');
      expect(result.id).toEqual(expect.any(String));
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.isLoading).toBeUndefined();
    });

    it('accepte une chaîne vide sans erreur', () => {
      const result = ChatbotMapper.userInputToMessage('');

      expect(result.content).toBe('');
      expect(result.role).toBe('user');
    });

    it('utilise l’heure actuelle comme timestamp', () => {
      const fixedDate = new Date('2026-06-15T08:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(fixedDate);

      const result = ChatbotMapper.userInputToMessage('Test');

      expect(result.timestamp).toEqual(fixedDate);

      vi.useRealTimers();
    });
  });

  describe('loadingMessage', () => {
    it('crée un message assistant vide avec isLoading à true', () => {
      const result = ChatbotMapper.loadingMessage();

      expect(result.content).toBe('');
      expect(result.role).toBe('assistant');
      expect(result.isLoading).toBe(true);
      expect(result.id).toEqual(expect.any(String));
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('génère un id différent à chaque appel', () => {
      const first = ChatbotMapper.loadingMessage();
      const second = ChatbotMapper.loadingMessage();

      expect(first.id).not.toBe(second.id);
    });
  });
});
