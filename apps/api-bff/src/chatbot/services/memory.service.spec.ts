// src/chatbot/services/memory.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { MemoryService } from './memory.service';

describe('MemoryService', () => {
  let service: MemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryService],
    }).compile();

    service = module.get<MemoryService>(MemoryService);
  });

  describe('getHistory', () => {
    it('returns empty array for unknown session', () => {
      const result = service.getHistory('unknown-session');

      expect(result).toEqual([]);
    });
  });

  describe('addExchange', () => {
    it('adds a human message then an ai message to history', () => {
      service.addExchange('session-1', 'Bonjour', 'Salut, comment puis-je aider ?');

      const history = service.getHistory('session-1');

      expect(history).toHaveLength(2);
      expect(history[0]).toBeInstanceOf(HumanMessage);
      expect(history[0].content).toBe('Bonjour');
      expect(history[1]).toBeInstanceOf(AIMessage);
      expect(history[1].content).toBe('Salut, comment puis-je aider ?');
    });

    it('appends to existing history across multiple exchanges', () => {
      service.addExchange('session-1', 'Premier message', 'Première réponse');
      service.addExchange('session-1', 'Deuxième message', 'Deuxième réponse');

      const history = service.getHistory('session-1');

      expect(history).toHaveLength(4);
      expect(history[2].content).toBe('Deuxième message');
      expect(history[3].content).toBe('Deuxième réponse');
    });

    it('keeps separate histories for different sessions', () => {
      service.addExchange('session-1', 'Message session 1', 'Réponse session 1');
      service.addExchange('session-2', 'Message session 2', 'Réponse session 2');

      expect(service.getHistory('session-1')).toHaveLength(2);
      expect(service.getHistory('session-2')).toHaveLength(2);
      expect(service.getHistory('session-1')[0].content).toBe('Message session 1');
      expect(service.getHistory('session-2')[0].content).toBe('Message session 2');
    });
  });

  describe('clearHistory', () => {
    it('removes history for a session', () => {
      service.addExchange('session-1', 'Bonjour', 'Salut');
      service.clearHistory('session-1');

      expect(service.getHistory('session-1')).toEqual([]);
    });

    it('does nothing when clearing an unknown session', () => {
      expect(() => service.clearHistory('unknown-session')).not.toThrow();
    });
  });

  describe('getSessionCount', () => {
    it('returns 0 when no sessions exist', () => {
      expect(service.getSessionCount()).toBe(0);
    });

    it('counts distinct sessions', () => {
      service.addExchange('session-1', 'a', 'b');
      service.addExchange('session-2', 'c', 'd');

      expect(service.getSessionCount()).toBe(2);
    });

    it('does not double count repeated exchanges in the same session', () => {
      service.addExchange('session-1', 'a', 'b');
      service.addExchange('session-1', 'c', 'd');

      expect(service.getSessionCount()).toBe(1);
    });

    it('decreases after clearing a session', () => {
      service.addExchange('session-1', 'a', 'b');
      service.addExchange('session-2', 'c', 'd');
      service.clearHistory('session-1');

      expect(service.getSessionCount()).toBe(1);
    });
  });
});