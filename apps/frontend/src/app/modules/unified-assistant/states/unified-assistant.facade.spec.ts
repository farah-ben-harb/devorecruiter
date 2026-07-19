import { describe, it, expect, vi } from 'vitest';

import { UnifiedAssistantFacade } from './unified-assistant.facade';
import { UnifiedConversation, UnifiedMessage } from '../models/unified-assistant.model';

const buildConversation = (overrides: Partial<UnifiedConversation> = {}): UnifiedConversation => ({
  id: 'conv-1',
  title: 'Conversation',
  mode: 'it',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  isPinned: false,
  ...overrides,
});

const buildMessage = (overrides: Partial<UnifiedMessage> = {}): UnifiedMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Bonjour',
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('UnifiedAssistantFacade', () => {
  describe('état initial', () => {
    it('démarre avec l’état par défaut', () => {
      const facade = new UnifiedAssistantFacade();

      expect(facade.snapshot).toEqual({
        detectedMode: null,
        conversations: [],
        activeConversationId: null,
        currentMessages: [],
        status: 'idle',
        error: null,
        showSidebar: true,
      });
    });
  });

  describe('setDetectedMode', () => {
    it('met à jour detectedMode', () => {
      const facade = new UnifiedAssistantFacade();

      facade.setDetectedMode('rh');

      expect(facade.snapshot.detectedMode).toBe('rh');
    });
  });

  describe('status', () => {
    it('setLoading passe status à loading et réinitialise error', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setError('Erreur précédente');

      facade.setLoading();

      expect(facade.snapshot.status).toBe('loading');
      expect(facade.snapshot.error).toBeNull();
    });

    it('setSuccess passe status à success', () => {
      const facade = new UnifiedAssistantFacade();

      facade.setSuccess();

      expect(facade.snapshot.status).toBe('success');
    });

    it('setError passe status à error et définit le message', () => {
      const facade = new UnifiedAssistantFacade();

      facade.setError('Une erreur');

      expect(facade.snapshot.status).toBe('error');
      expect(facade.snapshot.error).toBe('Une erreur');
    });
  });

  describe('setConversations', () => {
    it('trie les conversations épinglées en premier', () => {
      const facade = new UnifiedAssistantFacade();
      const unpinned = buildConversation({ id: 'a', isPinned: false });
      const pinned = buildConversation({ id: 'b', isPinned: true });

      facade.setConversations([unpinned, pinned]);

      expect(facade.snapshot.conversations.map((c) => c.id)).toEqual(['b', 'a']);
    });

    it('trie par createdAt décroissant à égalité de isPinned', () => {
      const facade = new UnifiedAssistantFacade();
      const older = buildConversation({ id: 'old', createdAt: new Date('2026-01-01') });
      const newer = buildConversation({ id: 'new', createdAt: new Date('2026-06-01') });

      facade.setConversations([older, newer]);

      expect(facade.snapshot.conversations.map((c) => c.id)).toEqual(['new', 'old']);
    });
  });

  describe('addConversation', () => {
    it('ajoute la conversation en tête de liste', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setConversations([buildConversation({ id: 'existing' })]);

      facade.addConversation(buildConversation({ id: 'new' }));

      expect(facade.snapshot.conversations.map((c) => c.id)).toEqual(['new', 'existing']);
    });
  });

  describe('setActiveConversation', () => {
    it('met à jour activeConversationId', () => {
      const facade = new UnifiedAssistantFacade();

      facade.setActiveConversation('conv-1');

      expect(facade.snapshot.activeConversationId).toBe('conv-1');
    });

    it('accepte null', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setActiveConversation('conv-1');

      facade.setActiveConversation(null);

      expect(facade.snapshot.activeConversationId).toBeNull();
    });
  });

  describe('updateConversationTitle', () => {
    it('met à jour le titre de la conversation correspondante uniquement', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setConversations([
        buildConversation({ id: 'a', title: 'A' }),
        buildConversation({ id: 'b', title: 'B' }),
      ]);

      facade.updateConversationTitle('a', 'Nouveau titre');

      const convs = facade.snapshot.conversations;
      expect(convs.find((c) => c.id === 'a')?.title).toBe('Nouveau titre');
      expect(convs.find((c) => c.id === 'b')?.title).toBe('B');
    });
  });

  describe('updateConversationPin', () => {
    it('met à jour isPinned et retrie la liste', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setConversations([
        buildConversation({ id: 'a', isPinned: false, createdAt: new Date('2026-01-01') }),
        buildConversation({ id: 'b', isPinned: false, createdAt: new Date('2026-02-01') }),
      ]);

      facade.updateConversationPin('a', true);

      expect(facade.snapshot.conversations[0].id).toBe('a');
      expect(facade.snapshot.conversations[0].isPinned).toBe(true);
    });
  });

  describe('removeConversation', () => {
    it('retire la conversation de la liste', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setConversations([buildConversation({ id: 'a' }), buildConversation({ id: 'b' })]);

      facade.removeConversation('a');

      expect(facade.snapshot.conversations.map((c) => c.id)).toEqual(['b']);
    });

    it('bascule activeConversationId sur la première conversation restante si la conversation active est supprimée', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setConversations([buildConversation({ id: 'a' }), buildConversation({ id: 'b' })]);
      facade.setActiveConversation('a');

      facade.removeConversation('a');

      expect(facade.snapshot.activeConversationId).toBe('b');
    });

    it('met activeConversationId à null si plus aucune conversation ne reste', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setConversations([buildConversation({ id: 'a' })]);
      facade.setActiveConversation('a');

      facade.removeConversation('a');

      expect(facade.snapshot.activeConversationId).toBeNull();
      expect(facade.snapshot.currentMessages).toEqual([]);
    });

    it('ne modifie pas activeConversationId si une autre conversation est supprimée', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setConversations([buildConversation({ id: 'a' }), buildConversation({ id: 'b' })]);
      facade.setActiveConversation('a');
      facade.setCurrentMessages([buildMessage()]);

      facade.removeConversation('b');

      expect(facade.snapshot.activeConversationId).toBe('a');
      expect(facade.snapshot.currentMessages).toHaveLength(1);
    });
  });

  describe('setCurrentMessages', () => {
    it('remplace la liste des messages courants', () => {
      const facade = new UnifiedAssistantFacade();
      const messages = [buildMessage({ id: 'm1' }), buildMessage({ id: 'm2' })];

      facade.setCurrentMessages(messages);

      expect(facade.snapshot.currentMessages).toEqual(messages);
    });
  });

  describe('clearCurrentMessages', () => {
    it('vide les messages, le mode détecté et la conversation active', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setCurrentMessages([buildMessage()]);
      facade.setDetectedMode('rh');
      facade.setActiveConversation('conv-1');

      facade.clearCurrentMessages();

      expect(facade.snapshot.currentMessages).toEqual([]);
      expect(facade.snapshot.detectedMode).toBeNull();
      expect(facade.snapshot.activeConversationId).toBeNull();
    });
  });

  describe('addUserMessage', () => {
    it('ajoute un message utilisateur avec le mode détecté courant', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setDetectedMode('rh');

      facade.addUserMessage('Bonjour');

      const last = facade.snapshot.currentMessages[facade.snapshot.currentMessages.length - 1];
      expect(last.role).toBe('user');
      expect(last.content).toBe('Bonjour');
      expect(last.mode).toBe('rh');
    });

    it('conserve les messages existants', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setCurrentMessages([buildMessage({ id: 'existing' })]);

      facade.addUserMessage('Nouveau message');

      expect(facade.snapshot.currentMessages).toHaveLength(2);
    });
  });

  describe('addLoadingMessage', () => {
    it('ajoute un message assistant en isLoading', () => {
      const facade = new UnifiedAssistantFacade();

      facade.addLoadingMessage();

      const last = facade.snapshot.currentMessages[facade.snapshot.currentMessages.length - 1];
      expect(last.role).toBe('assistant');
      expect(last.isLoading).toBe(true);
      expect(last.content).toBe('');
    });
  });

  describe('appendChunkToLastMessage', () => {
    it('concatène le chunk au contenu du dernier message assistant', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setCurrentMessages([buildMessage({ role: 'assistant', content: 'Bon' })]);

      facade.appendChunkToLastMessage('jour');

      expect(facade.snapshot.currentMessages[0].content).toBe('Bonjour');
      expect(facade.snapshot.currentMessages[0].isLoading).toBe(false);
    });

    it('ne fait rien si le dernier message n’est pas de rôle assistant', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setCurrentMessages([buildMessage({ role: 'user', content: 'Bonjour' })]);

      facade.appendChunkToLastMessage('chunk');

      expect(facade.snapshot.currentMessages[0].content).toBe('Bonjour');
    });

    it('ne fait rien si la liste de messages est vide', () => {
      const facade = new UnifiedAssistantFacade();

      expect(() => facade.appendChunkToLastMessage('chunk')).not.toThrow();
      expect(facade.snapshot.currentMessages).toEqual([]);
    });
  });

  describe('finalizeLastMessage', () => {
    it('applique le patch au dernier message et passe isLoading à false', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setCurrentMessages([buildMessage({ role: 'assistant', isLoading: true })]);

      facade.finalizeLastMessage({ mode: 'it', sources: [] });

      const last = facade.snapshot.currentMessages[0];
      expect(last.mode).toBe('it');
      expect(last.sources).toEqual([]);
      expect(last.isLoading).toBe(false);
      expect(facade.snapshot.status).toBe('success');
    });

    it('ne fait rien si la liste de messages est vide', () => {
      const facade = new UnifiedAssistantFacade();

      facade.finalizeLastMessage({ mode: 'it' });

      expect(facade.snapshot.currentMessages).toEqual([]);
      expect(facade.snapshot.status).toBe('idle');
    });
  });

  describe('replaceLoadingWithError', () => {
    it('remplace le dernier message en isLoading par un message d’erreur', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setCurrentMessages([
        buildMessage({ id: 'user-msg', role: 'user' }),
        buildMessage({ id: 'loading-msg', role: 'assistant', isLoading: true, content: '' }),
      ]);

      facade.replaceLoadingWithError();

      const messages = facade.snapshot.currentMessages;
      expect(messages[1].content).toBe('Une erreur est survenue. Veuillez réessayer.');
      expect(messages[1].isLoading).toBe(false);
      expect(facade.snapshot.status).toBe('error');
    });

    it('ne modifie rien si aucun message n’est en isLoading', () => {
      const facade = new UnifiedAssistantFacade();
      const messages = [buildMessage({ role: 'assistant', isLoading: false })];
      facade.setCurrentMessages(messages);

      facade.replaceLoadingWithError();

      expect(facade.snapshot.currentMessages).toEqual(messages);
      expect(facade.snapshot.status).toBe('error');
    });

    it('remplace le dernier message en isLoading si plusieurs le sont', () => {
      const facade = new UnifiedAssistantFacade();
      facade.setCurrentMessages([
        buildMessage({ id: 'm1', isLoading: true, content: 'Premier' }),
        buildMessage({ id: 'm2', isLoading: true, content: 'Deuxième' }),
      ]);

      facade.replaceLoadingWithError();

      const messages = facade.snapshot.currentMessages;
      expect(messages[0].content).toBe('Premier');
      expect(messages[1].content).toBe('Une erreur est survenue. Veuillez réessayer.');
    });
  });

  describe('toggleSidebar', () => {
    it('inverse showSidebar', () => {
      const facade = new UnifiedAssistantFacade();

      facade.toggleSidebar();
      expect(facade.snapshot.showSidebar).toBe(false);

      facade.toggleSidebar();
      expect(facade.snapshot.showSidebar).toBe(true);
    });
  });

  describe('Observables dérivés', () => {
    it('isLoading$ reflète le status loading', () => {
      const facade = new UnifiedAssistantFacade();
      const values: boolean[] = [];
      facade.isLoading$.subscribe((v) => values.push(v));

      facade.setLoading();
      facade.setSuccess();

      expect(values).toEqual([false, true, false]);
    });

    it('hasMessages$ reflète la présence de messages', () => {
      const facade = new UnifiedAssistantFacade();
      const values: boolean[] = [];
      facade.hasMessages$.subscribe((v) => values.push(v));

      facade.addUserMessage('Bonjour');

      expect(values).toEqual([false, true]);
    });

    it('activeConversation$ retourne la conversation active ou null', () => {
      const facade = new UnifiedAssistantFacade();
      const values: (UnifiedConversation | null)[] = [];
      facade.activeConversation$.subscribe((v) => values.push(v));

      const conv = buildConversation({ id: 'conv-1' });
      facade.setConversations([conv]);
      facade.setActiveConversation('conv-1');

      expect(values[values.length - 1]).toEqual(conv);
    });

    it('conversations$ n’émet pas si la référence ne change pas (distinctUntilChanged)', () => {
      const facade = new UnifiedAssistantFacade();
      const emitSpy = vi.fn();
      facade.conversations$.subscribe(emitSpy);

      const initialCallCount = emitSpy.mock.calls.length;
      facade.setDetectedMode('rh'); // ne touche pas conversations

      expect(emitSpy.mock.calls.length).toBe(initialCallCount);
    });
  });
});
