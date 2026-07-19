import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementRef } from '@angular/core';

import { ChatbotWidgetComponent } from './chatbot-widget.component';
import { ChatbotFacade } from '../states/chatbot.facade';
import { ChatMessage } from '../models/chatbot.model';

type ChatbotFacadeMock = Pick<ChatbotFacade, 'sendMessage'>;

const buildMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg-1',
  content: 'Bonjour',
  role: 'user',
  timestamp: new Date('2026-01-01T10:00:00.000Z'),
  ...overrides,
});

describe('ChatbotWidgetComponent', () => {
  let component: ChatbotWidgetComponent;
  let facadeMock: ChatbotFacadeMock;

  beforeEach(() => {
    facadeMock = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    };
    component = new ChatbotWidgetComponent(facadeMock as Partial<ChatbotFacade> as ChatbotFacade);
  });

  describe('suggestedQuestions', () => {
    it('expose une liste de 4 questions suggérées', () => {
      expect(component.suggestedQuestions).toHaveLength(4);
      expect(component.suggestedQuestions).toContain("Combien j'ai de candidats ?");
    });
  });

  describe('send', () => {
    it('envoie le texte saisi et vide le champ', async () => {
      component.inputText.set('Bonjour, comment ça va ?');

      await component.send();

      expect(facadeMock.sendMessage).toHaveBeenCalledWith('Bonjour, comment ça va ?');
      expect(component.inputText()).toBe('');
    });

    it('rogne les espaces avant/après avant envoi', async () => {
      component.inputText.set('   Bonjour   ');

      await component.send();

      expect(facadeMock.sendMessage).toHaveBeenCalledWith('Bonjour');
    });

    it("n'envoie rien si le texte est vide ou composé uniquement d'espaces", async () => {
      component.inputText.set('   ');

      await component.send();

      expect(facadeMock.sendMessage).not.toHaveBeenCalled();
      // Le champ n'est pas vidé puisqu'on sort avant le set('')
      expect(component.inputText()).toBe('   ');
    });
  });

  describe('sendSuggestion', () => {
    it('envoie directement la question suggérée sans passer par inputText', async () => {
      await component.sendSuggestion('Quel est le score moyen au QCM ?');

      expect(facadeMock.sendMessage).toHaveBeenCalledWith('Quel est le score moyen au QCM ?');
      expect(component.inputText()).toBe('');
    });
  });

  describe('onKeydown', () => {
    it('déclenche l’envoi sur Enter sans Shift', () => {
      const sendSpy = vi.spyOn(component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalled();
    });

    it("n'envoie pas et n'empêche pas le comportement par défaut sur Shift+Enter", () => {
      const sendSpy = vi.spyOn(component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onKeydown(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('ignore les autres touches', () => {
      const sendSpy = vi.spyOn(component, 'send').mockResolvedValue(undefined);
      const event = new KeyboardEvent('keydown', { key: 'a' });

      component.onKeydown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('ngAfterViewChecked / scrollToBottom', () => {
    it('positionne scrollTop à scrollHeight quand le conteneur existe', () => {
      const div = document.createElement('div');
      Object.defineProperty(div, 'scrollHeight', { value: 500, configurable: true });
      div.scrollTop = 0;
      component.messagesContainer = new ElementRef(div);

      component.ngAfterViewChecked();

      expect(div.scrollTop).toBe(500);
    });

    it('ne lève aucune erreur si le conteneur est absent', () => {
      component.messagesContainer = undefined as unknown as ElementRef<HTMLDivElement>;

      expect(() => component.ngAfterViewChecked()).not.toThrow();
    });
  });

  describe('formatTime', () => {
    it('formate une date en heure:minute au format français', () => {
      const date = new Date('2026-01-01T14:05:00.000Z');

      const result = component.formatTime(date);

      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('accepte un message construit via buildMessage', () => {
      const message = buildMessage({ timestamp: new Date('2026-01-01T09:30:00.000Z') });

      const result = component.formatTime(message.timestamp);

      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});
