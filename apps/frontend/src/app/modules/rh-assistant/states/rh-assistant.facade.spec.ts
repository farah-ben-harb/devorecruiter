import { describe, it, expect } from 'vitest';
import { firstValueFrom } from 'rxjs';

import { RhAssistantFacade } from './rh-assistant.facade';
import { Message, Stats } from '../models/rh-assistant.model';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const makeMessage = (overrides?: Partial<Message>): Message => ({
  role: 'user',
  content: 'Bonjour',
  isLoading: false,
  createdAt: new Date(),
  ...overrides,
});

const makeStats = (): Stats => ({
  totalConversations: 5,
  totalMessages: 20,
  userId: 1,
});

function createFacade() {
  return new RhAssistantFacade();
}

describe('état initial', () => {
  it('snapshot reflète initialState', () => {
    const facade = createFacade();
    const s = facade.snapshot;
    expect(s.messages).toEqual([]);
    expect(s.conversationId).toBeNull();
    expect(s.createdAt).toBeNull();
    expect(s.stats).toBeNull();
    expect(s.status).toBe('idle');
    expect(s.historyStatus).toBe('idle');
    expect(s.statsStatus).toBe('idle');
    expect(s.error).toBeNull();
    expect(s.inputValue).toBe('');
    expect(s.showSidebar).toBe(true);
  });

  it('isLoading$ émet false', async () => {
    const facade = createFacade();
    expect(await firstValueFrom(facade.isLoading$)).toBe(false);
  });

  it('hasMessages$ émet false', async () => {
    const facade = createFacade();
    expect(await firstValueFrom(facade.hasMessages$)).toBe(false);
  });

  it('showSidebar$ émet true', async () => {
    const facade = createFacade();
    expect(await firstValueFrom(facade.showSidebar$)).toBe(true);
  });

  it('error$ émet null', async () => {
    const facade = createFacade();
    expect(await firstValueFrom(facade.error$)).toBeNull();
  });
});

describe('setHistoryLoading', () => {
  it('passe historyStatus à "loading"', () => {
    const facade = createFacade();
    facade.setHistoryLoading();
    expect(facade.snapshot.historyStatus).toBe('loading');
  });

  it("efface l'erreur existante", () => {
    const facade = createFacade();
    facade.setHistoryError('ancienne erreur');
    facade.setHistoryLoading();
    expect(facade.snapshot.error).toBeNull();
  });

  it('ne touche pas au status principal', () => {
    const facade = createFacade();
    facade.setHistoryLoading();
    expect(facade.snapshot.status).toBe('idle');
  });
});

describe('setHistorySuccess', () => {
  it('met à jour messages, conversationId, createdAt et historyStatus', () => {
    const facade = createFacade();
    const messages = [makeMessage(), makeMessage({ role: 'assistant', content: 'Réponse' })];
    const date = new Date('2024-01-15');
    facade.setHistorySuccess(messages, 42, date);
    const s = facade.snapshot;
    expect(s.messages).toEqual(messages);
    expect(s.conversationId).toBe(42);
    expect(s.createdAt).toEqual(date);
    expect(s.historyStatus).toBe('success');
  });

  it('hasMessages$ émet true après appel', async () => {
    const facade = createFacade();
    facade.setHistorySuccess([makeMessage()], 1, new Date());
    expect(await firstValueFrom(facade.hasMessages$)).toBe(true);
  });

  it('messages$ émet les messages mis à jour', async () => {
    const facade = createFacade();
    const messages = [makeMessage()];
    facade.setHistorySuccess(messages, 1, new Date());
    expect(await firstValueFrom(facade.messages$)).toEqual(messages);
  });
});

describe('setHistoryError', () => {
  it('passe historyStatus à "error"', () => {
    const facade = createFacade();
    facade.setHistoryError('Erreur réseau');
    expect(facade.snapshot.historyStatus).toBe('error');
  });

  it("stocke le message d'erreur", () => {
    const facade = createFacade();
    facade.setHistoryError('Impossible de charger');
    expect(facade.snapshot.error).toBe('Impossible de charger');
  });

  it("error$ émet l'erreur", async () => {
    const facade = createFacade();
    facade.setHistoryError('Oops');
    expect(await firstValueFrom(facade.error$)).toBe('Oops');
  });
});

describe('setAsking', () => {
  it('passe status à "loading"', () => {
    const facade = createFacade();
    facade.setAsking();
    expect(facade.snapshot.status).toBe('loading');
  });

  it("efface l'erreur", () => {
    const facade = createFacade();
    facade.setHistoryError('ancienne erreur');
    facade.setAsking();
    expect(facade.snapshot.error).toBeNull();
  });

  it('vide inputValue', () => {
    const facade = createFacade();
    facade.setInputValue('ma saisie');
    facade.setAsking();
    expect(facade.snapshot.inputValue).toBe('');
  });

  it('isLoading$ émet true', async () => {
    const facade = createFacade();
    facade.setAsking();
    expect(await firstValueFrom(facade.isLoading$)).toBe(true);
  });
});

describe('addUserMessage', () => {
  it('ajoute un message user en fin de liste', () => {
    const facade = createFacade();
    facade.addUserMessage('Bonjour');
    expect(facade.snapshot.messages).toHaveLength(1);
    expect(facade.snapshot.messages[0].role).toBe('user');
    expect(facade.snapshot.messages[0].content).toBe('Bonjour');
  });

  it('empile les messages sans écraser les précédents', () => {
    const facade = createFacade();
    facade.addUserMessage('Question 1');
    facade.addUserMessage('Question 2');
    expect(facade.snapshot.messages).toHaveLength(2);
    expect(facade.snapshot.messages[1].content).toBe('Question 2');
  });

  it('le message ajouté a isLoading à false', () => {
    const facade = createFacade();
    facade.addUserMessage('Test');
    expect(facade.snapshot.messages[0].isLoading).toBe(false);
  });
});

describe('addLoadingMessage', () => {
  it('ajoute un message assistant avec isLoading à true', () => {
    const facade = createFacade();
    facade.addLoadingMessage();
    const msg = facade.snapshot.messages[0];
    expect(msg.role).toBe('assistant');
    expect(msg.isLoading).toBe(true);
    expect(msg.content).toBe('');
  });

  it("s'ajoute après les messages existants", () => {
    const facade = createFacade();
    facade.addUserMessage('Question');
    facade.addLoadingMessage();
    expect(facade.snapshot.messages).toHaveLength(2);
    expect(facade.snapshot.messages[1].isLoading).toBe(true);
  });
});

describe('replaceLoadingWithResponse', () => {
  it('remplace le message isLoading par la réponse', () => {
    const facade = createFacade();
    facade.addUserMessage('Question');
    facade.addLoadingMessage();
    const response = makeMessage({ role: 'assistant', content: 'Réponse IA', isLoading: false });
    facade.replaceLoadingWithResponse(response);
    const msgs = facade.snapshot.messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[1].content).toBe('Réponse IA');
    expect(msgs[1].isLoading).toBe(false);
  });

  it('passe status à "success"', () => {
    const facade = createFacade();
    facade.addLoadingMessage();
    facade.replaceLoadingWithResponse(makeMessage({ role: 'assistant' }));
    expect(facade.snapshot.status).toBe('success');
  });

  it('remplace le dernier message isLoading si plusieurs existent', () => {
    const facade = createFacade();
    facade.addLoadingMessage();
    facade.addLoadingMessage();
    const response = makeMessage({ role: 'assistant', content: 'Dernière réponse' });
    facade.replaceLoadingWithResponse(response);
    const msgs = facade.snapshot.messages;
    expect(msgs[0].isLoading).toBe(true);
    expect(msgs[1].content).toBe('Dernière réponse');
  });

  it('ne modifie pas la liste si aucun message isLoading', () => {
    const facade = createFacade();
    facade.addUserMessage('Question');
    const before = [...facade.snapshot.messages];
    facade.replaceLoadingWithResponse(makeMessage({ role: 'assistant' }));
    expect(facade.snapshot.messages).toHaveLength(before.length);
  });
});

describe('replaceLoadingWithError', () => {
  it("remplace le message isLoading par un message d'erreur", () => {
    const facade = createFacade();
    facade.addLoadingMessage();
    facade.replaceLoadingWithError();
    const msg = facade.snapshot.messages[0];
    expect(msg.isLoading).toBe(false);
    expect(msg.content).toBe('Une erreur est survenue. Veuillez réessayer.');
  });

  it('passe status à "error"', () => {
    const facade = createFacade();
    facade.addLoadingMessage();
    facade.replaceLoadingWithError();
    expect(facade.snapshot.status).toBe('error');
  });

  it("stocke le message d'erreur générique", () => {
    const facade = createFacade();
    facade.addLoadingMessage();
    facade.replaceLoadingWithError();
    expect(facade.snapshot.error).toBe('Erreur de communication.');
  });

  it('ne modifie pas la liste si aucun message isLoading', () => {
    const facade = createFacade();
    facade.addUserMessage('Question');
    facade.replaceLoadingWithError();
    expect(facade.snapshot.messages[0].role).toBe('user');
  });
});

describe('setStats', () => {
  it('stocke les stats et passe statsStatus à "success"', () => {
    const facade = createFacade();
    const stats = makeStats();
    facade.setStats(stats);
    expect(facade.snapshot.stats).toEqual(stats);
    expect(facade.snapshot.statsStatus).toBe('success');
  });

  it('stats$ émet les stats mises à jour', async () => {
    const facade = createFacade();
    const stats = makeStats();
    facade.setStats(stats);
    expect(await firstValueFrom(facade.stats$)).toEqual(stats);
  });

  it('écrase les stats précédentes', () => {
    const facade = createFacade();
    facade.setStats(makeStats());
    const newStats: Stats = { totalConversations: 10, totalMessages: 40, userId: 1 };
    facade.setStats(newStats);
    expect(facade.snapshot.stats!.totalConversations).toBe(10);
  });
});

describe('setInputValue', () => {
  it('met à jour inputValue', () => {
    const facade = createFacade();
    facade.setInputValue('nouvelle valeur');
    expect(facade.snapshot.inputValue).toBe('nouvelle valeur');
  });

  it('inputValue$ émet la nouvelle valeur', async () => {
    const facade = createFacade();
    facade.setInputValue('test');
    expect(await firstValueFrom(facade.inputValue$)).toBe('test');
  });

  it('accepte une chaîne vide', () => {
    const facade = createFacade();
    facade.setInputValue('valeur');
    facade.setInputValue('');
    expect(facade.snapshot.inputValue).toBe('');
  });
});

describe('setConversationId', () => {
  it('met à jour conversationId', () => {
    const facade = createFacade();
    facade.setConversationId(99);
    expect(facade.snapshot.conversationId).toBe(99);
  });

  it('conversationId$ émet le nouvel id', async () => {
    const facade = createFacade();
    facade.setConversationId(12);
    expect(await firstValueFrom(facade.conversationId$)).toBe(12);
  });

  it("écrase l'id précédent", () => {
    const facade = createFacade();
    facade.setConversationId(1);
    facade.setConversationId(2);
    expect(facade.snapshot.conversationId).toBe(2);
  });
});

describe('resetConversation', () => {
  it('vide les messages', () => {
    const facade = createFacade();
    facade.addUserMessage('Question');
    facade.resetConversation();
    expect(facade.snapshot.messages).toEqual([]);
  });

  it('remet conversationId à null', () => {
    const facade = createFacade();
    facade.setConversationId(5);
    facade.resetConversation();
    expect(facade.snapshot.conversationId).toBeNull();
  });

  it('remet createdAt à null', () => {
    const facade = createFacade();
    facade.setHistorySuccess([makeMessage()], 1, new Date());
    facade.resetConversation();
    expect(facade.snapshot.createdAt).toBeNull();
  });

  it('remet status à "idle"', () => {
    const facade = createFacade();
    facade.setAsking();
    facade.resetConversation();
    expect(facade.snapshot.status).toBe('idle');
  });

  it("efface l'erreur", () => {
    const facade = createFacade();
    facade.setHistoryError('une erreur');
    facade.resetConversation();
    expect(facade.snapshot.error).toBeNull();
  });

  it('ne touche pas à showSidebar ni aux stats', () => {
    const facade = createFacade();
    facade.toggleSidebar();
    facade.setStats(makeStats());
    facade.resetConversation();
    expect(facade.snapshot.showSidebar).toBe(false);
    expect(facade.snapshot.stats).not.toBeNull();
  });

  it('hasMessages$ émet false après reset', async () => {
    const facade = createFacade();
    facade.addUserMessage('Question');
    facade.resetConversation();
    expect(await firstValueFrom(facade.hasMessages$)).toBe(false);
  });
});

describe('toggleSidebar', () => {
  it('passe showSidebar de true à false', () => {
    const facade = createFacade();
    facade.toggleSidebar();
    expect(facade.snapshot.showSidebar).toBe(false);
  });

  it('passe showSidebar de false à true', () => {
    const facade = createFacade();
    facade.toggleSidebar();
    facade.toggleSidebar();
    expect(facade.snapshot.showSidebar).toBe(true);
  });

  it('showSidebar$ émet la nouvelle valeur', async () => {
    const facade = createFacade();
    facade.toggleSidebar();
    expect(await firstValueFrom(facade.showSidebar$)).toBe(false);
  });

  it('trois toggles retourne false (impair)', () => {
    const facade = createFacade();
    facade.toggleSidebar();
    facade.toggleSidebar();
    facade.toggleSidebar();
    expect(facade.snapshot.showSidebar).toBe(false);
  });
});

describe('isolation des instances', () => {
  it('deux instances ne partagent pas leur état', () => {
    const a = createFacade();
    const b = createFacade();
    a.addUserMessage('Message de A');
    expect(a.snapshot.messages).toHaveLength(1);
    expect(b.snapshot.messages).toHaveLength(0);
  });

  it("modifier l'une n'affecte pas l'autre", () => {
    const a = createFacade();
    const b = createFacade();
    a.toggleSidebar();
    expect(a.snapshot.showSidebar).toBe(false);
    expect(b.snapshot.showSidebar).toBe(true);
  });
});
