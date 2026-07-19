import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ChatbotFacade } from './chatbot.facade';
import { UnifiedAssistantService } from '@app/modules/unified-assistant/services/unified-assistant.service';
import { ApiStreamEvent } from '@app/modules/unified-assistant/models/unified-assistant.model';
import { StorageService } from '@core/services/storage.service';

type ChatStreamArgs = Parameters<UnifiedAssistantService['chatStream']>;
type OnChunkFn = ChatStreamArgs[3];
type OnDoneFn = ChatStreamArgs[4];
type OnErrorFn = NonNullable<ChatStreamArgs[5]>;

type StorageServiceMock = Pick<StorageService, 'get'>;

const buildStreamEvent = (overrides: Partial<ApiStreamEvent> = {}): ApiStreamEvent =>
  ({
    done: true,
    ...overrides,
  }) as ApiStreamEvent;

describe('ChatbotFacade', () => {
  let facade: ChatbotFacade;
  let capturedOnChunk: OnChunkFn;
  let capturedOnDone: OnDoneFn;
  let capturedOnError: OnErrorFn;

  beforeEach(() => {
    const storageServiceMock: StorageServiceMock = {
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
    const assistantService = TestBed.inject(UnifiedAssistantService);

    vi.spyOn(assistantService, 'chatStream').mockImplementation(
      (_conversationId, _messages, _onMode, onChunk, onDone, onError) => {
        capturedOnChunk = onChunk;
        capturedOnDone = onDone;
        if (onError) capturedOnError = onError;
      },
    );
    facade = new ChatbotFacade(assistantService);
  });

  describe('état initial', () => {
    it('démarre avec un état vide et un sessionId généré', () => {
      expect(facade.messages()).toEqual([]);
      expect(facade.isLoading()).toBe(false);
      expect(facade.isOpen()).toBe(false);
      expect(facade.error()).toBeNull();
      expect(facade.sessionId()).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('toggleChat / closeChat', () => {
    it('toggleChat inverse isOpen', () => {
      facade.toggleChat();
      expect(facade.isOpen()).toBe(true);
      facade.toggleChat();
      expect(facade.isOpen()).toBe(false);
    });

    it('closeChat force isOpen à false', () => {
      facade.toggleChat();
      facade.closeChat();
      expect(facade.isOpen()).toBe(false);
    });
  });

  describe('sendMessage', () => {
    it('ignore un message vide ou composé uniquement d’espaces', async () => {
      await facade.sendMessage('   ');

      expect(facade.messages()).toEqual([]);
    });

    it('ignore un nouvel envoi si isLoading est déjà true', async () => {
      await facade.sendMessage('Bonjour');

      expect(facade.isLoading()).toBe(true);

      await facade.sendMessage('Deuxième message');

      const userMessages = facade.messages().filter((m) => m.role === 'user');
      expect(userMessages).toHaveLength(1);
    });

    it('ajoute le message utilisateur et un message de chargement, puis passe isLoading à true', async () => {
      await facade.sendMessage('Quel est le statut de mon CV ?');

      const messages = facade.messages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toMatchObject({
        role: 'user',
        content: 'Quel est le statut de mon CV ?',
      });
      expect(messages[1]).toMatchObject({ role: 'assistant', content: '', isLoading: true });
      expect(facade.isLoading()).toBe(true);
      expect(facade.error()).toBeNull();
    });

    it('met à jour le contenu du dernier message au fil des chunks reçus', async () => {
      await facade.sendMessage('Bonjour');

      capturedOnChunk('Bon');
      capturedOnChunk('jour !');

      const messages = facade.messages();
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.content).toBe('Bonjour !');
      expect(lastMessage.isLoading).toBe(false);
    });

    it('à la réception de onDone, ajoute la réponse à l’historique et repasse isLoading à false', async () => {
      await facade.sendMessage('Bonjour');

      capturedOnChunk('Réponse complète');
      capturedOnDone(buildStreamEvent());

      expect(facade.isLoading()).toBe(false);

      await facade.sendMessage('Suite ?');

      const userMessages = facade.messages().filter((m) => m.role === 'user');
      expect(userMessages.map((m) => m.content)).toEqual(['Bonjour', 'Suite ?']);
    });

    it('à la réception de onError, définit un message d’erreur et retire les messages en chargement', async () => {
      await facade.sendMessage('Bonjour');

      capturedOnError(new Error('network failure'));

      expect(facade.isLoading()).toBe(false);
      expect(facade.error()).toBe('Une erreur est survenue. Veuillez réessayer.');
      expect(facade.messages().some((m) => m.isLoading)).toBe(false);
      expect(facade.messages()).toHaveLength(1);
      expect(facade.messages()[0]).toMatchObject({ role: 'user', content: 'Bonjour' });
    });
  });

  describe('clearHistory', () => {
    it('vide les messages et régénère un nouveau sessionId', async () => {
      await facade.sendMessage('Bonjour');
      const previousSessionId = facade.sessionId();

      facade.clearHistory();

      expect(facade.messages()).toEqual([]);
      expect(facade.sessionId()).not.toBe(previousSessionId);
    });

    it('réinitialise l’historique interne utilisé pour le contexte multi-tours', async () => {
      await facade.sendMessage('Bonjour');
      capturedOnDone(buildStreamEvent());

      facade.clearHistory();
      await facade.sendMessage('Nouveau départ');

      const userMessages = facade.messages().filter((m) => m.role === 'user');
      expect(userMessages.map((m) => m.content)).toEqual(['Nouveau départ']);
    });
  });
});
