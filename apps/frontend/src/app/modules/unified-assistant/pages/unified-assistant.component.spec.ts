import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';

import { UnifiedAssistantComponent } from './unified-assistant.component';
import { UnifiedAssistantService } from '../services/unified-assistant.service';
import { UnifiedAssistantFacade } from '../states/unified-assistant.facade';
import { AuthService } from '../../auth/services/auth.service';
import {
  ApiItConversation,
  ApiItMessage,
  ApiRhMessage,
  ApiStreamEvent,
  RhSidebarConversation,
  UnifiedConversation,
} from '../models/unified-assistant.model';
import { JwtPayload } from '../../auth/models/auth.model';
import { of, Observable } from 'rxjs';

type UnifiedAssistantServiceMock = Pick<
  UnifiedAssistantService,
  | 'chatStream'
  | 'getItConversations'
  | 'getRhSidebarHistory'
  | 'getItMessages'
  | 'getRhConversationById'
  | 'createItConversation'
  | 'updateItConversation'
  | 'deleteItConversation'
  | 'pinRhConversation'
  | 'renameRhConversation'
  | 'deleteRhConversation'
>;
type AuthServiceMock = Pick<AuthService, 'getUser'>;

type ChatStreamArgs = Parameters<UnifiedAssistantService['chatStream']>;
type OnModeFn = ChatStreamArgs[2];
type OnChunkFn = ChatStreamArgs[3];
type OnDoneFn = ChatStreamArgs[4];

const buildJwtPayload = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  sub: 1,
  email: 'jean.dupont@example.com',
  roles: [],
  firstName: 'Jean',
  lastName: 'Dupont',
  picture: 'https://example.com/avatar.png',
  exp: 9999999999,
  ...overrides,
});

const buildItConversation = (overrides: Partial<ApiItConversation> = {}): ApiItConversation => ({
  id: 'it-1',
  title: 'Conversation IT',
  isPinned: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildRhSidebarConversation = (
  overrides: Partial<RhSidebarConversation> = {},
): RhSidebarConversation => ({
  id: 1,
  title: 'Conversation RH',
  createdAt: '2026-01-01T00:00:00.000Z',
  isActive: false,
  isPinned: false,
  ...overrides,
});

const buildItMessage = (overrides: Partial<ApiItMessage> = {}): ApiItMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Comment fonctionne Docker ?',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildRhMessage = (overrides: Partial<ApiRhMessage> = {}): ApiRhMessage => ({
  id: 1,
  role: 'user',
  content: 'Combien de congés ?',
  sources: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildStreamEvent = (overrides: Partial<ApiStreamEvent> = {}): ApiStreamEvent => ({
  done: true,
  ...overrides,
});

describe('UnifiedAssistantComponent', () => {
  let component: UnifiedAssistantComponent;
  let fixture: ComponentFixture<UnifiedAssistantComponent>;
  let facade: UnifiedAssistantFacade;
  let serviceMock: UnifiedAssistantServiceMock;
  let authServiceMock: AuthServiceMock;

  let capturedOnMode: OnModeFn;
  let capturedOnChunk: OnChunkFn;
  let capturedOnDone: OnDoneFn;

  beforeEach(() => {
    vi.useFakeTimers();

    serviceMock = {
      chatStream: vi.fn(
        (
          _conversationId: string,
          _messages: { role: string; content: string }[],
          onMode: OnModeFn,
          onChunk: OnChunkFn,
          onDone: OnDoneFn,
        ) => {
          capturedOnMode = onMode;
          capturedOnChunk = onChunk;
          capturedOnDone = onDone;
        },
      ),
      getItConversations: vi.fn().mockReturnValue(of([])),
      getRhSidebarHistory: vi.fn().mockReturnValue(of({ conversations: [] })),
      getItMessages: vi.fn().mockReturnValue(of([])),
      getRhConversationById: vi.fn().mockReturnValue(of({ conversationId: 1, messages: [] })),
      createItConversation: vi.fn().mockReturnValue(
        of({
          id: 'new-conv',
          title: 'Nouvelle conversation',
          isPinned: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
      updateItConversation: vi.fn().mockReturnValue(of(buildItConversation())),
      deleteItConversation: vi.fn().mockReturnValue(of(undefined)),
      pinRhConversation: vi.fn().mockReturnValue(of(undefined)),
      renameRhConversation: vi.fn().mockReturnValue(of(undefined)),
      deleteRhConversation: vi.fn().mockReturnValue(of(undefined)),
    };

    authServiceMock = {
      getUser: vi.fn().mockReturnValue(buildJwtPayload()),
    };

    TestBed.configureTestingModule({
      imports: [UnifiedAssistantComponent],
      providers: [
        UnifiedAssistantFacade,
        { provide: UnifiedAssistantService, useValue: serviceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    fixture = TestBed.createComponent(UnifiedAssistantComponent);
    component = fixture.componentInstance;
    facade = TestBed.inject(UnifiedAssistantFacade);

    // Consomme le tout premier cycle de détection de changements ici,
    // avant que les beforeEach imbriqués ne configurent leurs propres
    // conversations. Cela évite qu'un cdr.detectChanges() interne
    // (ex: dans onDone) déclenche ngOnInit() de façon implicite et
    // imprévisible en plein milieu d'un test, ce qui écraserait l'état
    // préparé par les beforeEach imbriqués via facade.setConversations(...).
    fixture.detectChanges();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ngOnInit', () => {
    it('initialise currentUser depuis authService.getUser()', () => {
      component.ngOnInit();

      expect(component.currentUser).toEqual({
        name: 'Jean Dupont',
        picture: 'https://example.com/avatar.png',
      });
    });

    it('currentUser est null si aucun utilisateur connecté', () => {
      authServiceMock.getUser = vi.fn().mockReturnValue(null);

      component.ngOnInit();

      expect(component.currentUser).toBeNull();
    });

    it('fusionne les conversations IT et RH triées via la facade', () => {
      serviceMock.getItConversations = vi
        .fn()
        .mockReturnValue(of([buildItConversation({ id: 'it-1', isPinned: true })]));
      serviceMock.getRhSidebarHistory = vi
        .fn()
        .mockReturnValue(of({ conversations: [buildRhSidebarConversation({ id: 1 })] }));

      component.ngOnInit();

      const conversations = facade.snapshot.conversations;
      expect(conversations).toHaveLength(2);
      expect(conversations.find((c) => c.mode === 'it')?.id).toBe('it-1');
      expect(conversations.find((c) => c.mode === 'rh')?.id).toBe(1);
    });

    it('fusionne même si un des deux appels échoue', () => {
      serviceMock.getItConversations = vi
        .fn()
        .mockReturnValue(of([buildItConversation({ id: 'it-1' })]));
      serviceMock.getRhSidebarHistory = vi
        .fn()
        .mockReturnValue(
          new Observable((subscriber) => subscriber.error(new Error('network error'))),
        );

      component.ngOnInit();

      expect(facade.snapshot.conversations).toHaveLength(1);
      expect(facade.snapshot.conversations[0].mode).toBe('it');
    });
  });

  describe('ngOnDestroy', () => {
    it('complète destroy$ sans erreur', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('ignore un contenu vide', () => {
      component.userInput = '   ';

      component.sendMessage();

      expect(facade.snapshot.currentMessages).toEqual([]);
      expect(serviceMock.chatStream).not.toHaveBeenCalled();
    });

    it('ignore un nouvel envoi si déjà en chargement', () => {
      facade.setLoading();

      component.sendMessage('Bonjour');

      expect(serviceMock.chatStream).not.toHaveBeenCalled();
    });

    it('ajoute le message utilisateur et un message de chargement', () => {
      component.sendMessage('Comment fonctionne Docker ?');
      vi.advanceTimersByTime(80);

      const messages = facade.snapshot.currentMessages;
      expect(messages[0]).toMatchObject({ role: 'user', content: 'Comment fonctionne Docker ?' });
      expect(messages[1]).toMatchObject({ role: 'assistant', isLoading: true });
    });

    it('crée une conversation IT si aucune conversation active, puis stream', () => {
      component.sendMessage('Bonjour');

      expect(serviceMock.createItConversation).toHaveBeenCalledWith('Nouvelle conversation');
      expect(facade.snapshot.activeConversationId).toBe('new-conv');
      expect(serviceMock.chatStream).toHaveBeenCalled();
    });

    it('utilise la conversation active existante sans en créer une nouvelle', () => {
      const conv: UnifiedConversation = {
        id: 'existing',
        title: 'Existante',
        mode: 'it',
        createdAt: new Date('2026-01-01'),
        isPinned: false,
      };
      facade.setConversations([conv]);
      facade.setActiveConversation('existing');

      component.sendMessage('Suite');

      expect(serviceMock.createItConversation).not.toHaveBeenCalled();
      expect(serviceMock.chatStream).toHaveBeenCalledWith(
        'existing',
        expect.any(Array),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('vide userInput après envoi', () => {
      component.userInput = 'Bonjour';

      component.sendMessage();

      expect(component.userInput).toBe('');
    });
  });

  describe('doStream — callbacks (via sendMessage)', () => {
    beforeEach(() => {
      const conv: UnifiedConversation = {
        id: 'conv-1',
        title: 'Conv',
        mode: 'it',
        createdAt: new Date('2026-01-01'),
        isPinned: false,
      };
      facade.setConversations([conv]);
      facade.setActiveConversation('conv-1');
    });

    it('onMode met à jour detectedMode et le mode du dernier message utilisateur', () => {
      component.sendMessage('Bonjour');

      capturedOnMode('rh');

      expect(facade.snapshot.detectedMode).toBe('rh');
      const userMsg = facade.snapshot.currentMessages.find((m) => m.role === 'user');
      expect(userMsg?.mode).toBe('rh');
    });

    it('onChunk ajoute le texte au dernier message', () => {
      component.sendMessage('Bonjour');

      capturedOnChunk('Bon');
      capturedOnChunk('jour !');
      vi.advanceTimersByTime(80);

      const last = facade.snapshot.currentMessages[facade.snapshot.currentMessages.length - 1];
      expect(last.content).toBe('Bonjour !');
      expect(last.isLoading).toBe(false);
    });

    it('onDone finalise le message et met à jour le titre pour IT', () => {
      component.sendMessage('Bonjour');

      capturedOnDone(buildStreamEvent({ mode: 'it', title: 'Nouveau titre' }));

      const conv = facade.snapshot.conversations.find((c) => c.id === 'conv-1');
      expect(conv?.title).toBe('Nouveau titre');
      expect(facade.snapshot.status).toBe('success');
    });

    it('onDone déclenche le rechargement RH après un délai pour mode rh', () => {
      component.sendMessage('Quel est mon solde de congés ?');

      capturedOnDone(buildStreamEvent({ mode: 'rh', conversationId: 42 }));

      expect(serviceMock.getRhSidebarHistory).not.toHaveBeenCalled();

      vi.advanceTimersByTime(800);

      expect(serviceMock.getRhSidebarHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectConversation', () => {
    it('charge les messages IT et les mappe', () => {
      serviceMock.getItMessages = vi.fn().mockReturnValue(of([buildItMessage()]));
      const conv: UnifiedConversation = {
        id: 'it-1',
        title: 'IT',
        mode: 'it',
        createdAt: new Date(),
        isPinned: false,
      };

      component.selectConversation(conv);
      vi.advanceTimersByTime(80);

      expect(facade.snapshot.activeConversationId).toBe('it-1');
      expect(facade.snapshot.detectedMode).toBe('it');
      expect(facade.snapshot.currentMessages).toHaveLength(1);
      expect(facade.snapshot.currentMessages[0].role).toBe('user');
    });

    it('charge les messages RH et les mappe', () => {
      serviceMock.getRhConversationById = vi
        .fn()
        .mockReturnValue(of({ conversationId: 1, messages: [buildRhMessage()] }));
      const conv: UnifiedConversation = {
        id: 1,
        title: 'RH',
        mode: 'rh',
        createdAt: new Date(),
        isPinned: false,
      };

      component.selectConversation(conv);
      vi.advanceTimersByTime(80);

      expect(serviceMock.getRhConversationById).toHaveBeenCalledWith(1);
      expect(facade.snapshot.currentMessages).toHaveLength(1);
      expect(facade.snapshot.currentMessages[0].mode).toBe('rh');
    });
  });

  describe('newConversation', () => {
    it('vide les messages courants et ferme le menu', () => {
      component.openMenuId = 'it-1';
      facade.addUserMessage('Test');

      component.newConversation();

      expect(facade.snapshot.currentMessages).toEqual([]);
      expect(component.openMenuId).toBeNull();
    });
  });

  describe('toggleMenu', () => {
    it('ouvre le menu si fermé', () => {
      const event = new Event('click');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      component.toggleMenu(event, 'it-1');

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(component.openMenuId).toBe('it-1');
    });

    it('ferme le menu si déjà ouvert pour le même id', () => {
      component.openMenuId = 'it-1';

      component.toggleMenu(new Event('click'), 'it-1');

      expect(component.openMenuId).toBeNull();
    });
  });

  describe('onPin', () => {
    const conv: UnifiedConversation = {
      id: 'it-1',
      title: 'IT',
      mode: 'it',
      createdAt: new Date(),
      isPinned: false,
    };

    beforeEach(() => {
      facade.setConversations([conv]);
    });

    it('épingle une conversation IT et appelle updateItConversation', () => {
      const event = new Event('click');

      component.onPin(event, conv);

      expect(facade.snapshot.conversations[0].isPinned).toBe(true);
      expect(serviceMock.updateItConversation).toHaveBeenCalledWith('it-1', { isPinned: true });
      expect(component.openMenuId).toBeNull();
    });

    it('annule le pin en cas d’échec pour IT', () => {
      serviceMock.updateItConversation = vi
        .fn()
        .mockReturnValue(
          new Observable((subscriber) => subscriber.error(new Error('network error'))),
        );

      component.onPin(new Event('click'), conv);

      expect(facade.snapshot.conversations[0].isPinned).toBe(false);
    });

    it('épingle une conversation RH via pinRhConversation', () => {
      const rhConv: UnifiedConversation = {
        id: 1,
        title: 'RH',
        mode: 'rh',
        createdAt: new Date(),
        isPinned: false,
      };
      facade.setConversations([rhConv]);

      component.onPin(new Event('click'), rhConv);

      expect(serviceMock.pinRhConversation).toHaveBeenCalledWith(1, true);
    });
  });

  describe('renommage', () => {
    const conv: UnifiedConversation = {
      id: 'it-1',
      title: 'Ancien titre',
      mode: 'it',
      createdAt: new Date(),
      isPinned: false,
    };

    beforeEach(() => {
      facade.setConversations([conv]);
    });

    it('onRenameOpen prépare le formulaire', () => {
      const event = new Event('click');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      component.onRenameOpen(event, conv);

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(component.renameValue).toBe('Ancien titre');
      expect(component.pendingRenameId).toBe('it-1');
      expect(component.showRenameModal).toBe(true);
    });

    it('confirmRename met à jour le titre via la facade et le service IT', () => {
      component.onRenameOpen(new Event('click'), conv);
      component.renameValue = 'Nouveau titre';

      component.confirmRename();

      expect(facade.snapshot.conversations[0].title).toBe('Nouveau titre');
      expect(serviceMock.updateItConversation).toHaveBeenCalledWith('it-1', {
        title: 'Nouveau titre',
      });
      expect(component.showRenameModal).toBe(false);
    });

    it('ne fait rien si le titre est vide', () => {
      component.onRenameOpen(new Event('click'), conv);
      component.renameValue = '   ';

      component.confirmRename();

      expect(facade.snapshot.conversations[0].title).toBe('Ancien titre');
      expect(serviceMock.updateItConversation).not.toHaveBeenCalled();
    });

    it('cancelRename réinitialise le formulaire', () => {
      component.onRenameOpen(new Event('click'), conv);

      component.cancelRename();

      expect(component.showRenameModal).toBe(false);
      expect(component.pendingRenameId).toBeNull();
      expect(component.renameValue).toBe('');
    });
  });

  describe('suppression', () => {
    const conv: UnifiedConversation = {
      id: 'it-1',
      title: 'IT',
      mode: 'it',
      createdAt: new Date(),
      isPinned: false,
    };

    beforeEach(() => {
      facade.setConversations([conv]);
    });

    it('onDeleteOpen prépare la modale de confirmation', () => {
      const event = new Event('click');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      component.onDeleteOpen(event, 'it-1');

      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(component.pendingDeleteId).toBe('it-1');
      expect(component.showDeleteModal).toBe(true);
    });

    it('confirmDelete retire la conversation IT via le service', () => {
      component.onDeleteOpen(new Event('click'), 'it-1');

      component.confirmDelete();

      expect(serviceMock.deleteItConversation).toHaveBeenCalledWith('it-1');
      expect(facade.snapshot.conversations).toEqual([]);
      expect(component.showDeleteModal).toBe(false);
    });

    it('confirmDelete retire la conversation RH via le service', () => {
      const rhConv: UnifiedConversation = {
        id: 1,
        title: 'RH',
        mode: 'rh',
        createdAt: new Date(),
        isPinned: false,
      };
      facade.setConversations([rhConv]);
      component.onDeleteOpen(new Event('click'), 1);

      component.confirmDelete();

      expect(serviceMock.deleteRhConversation).toHaveBeenCalledWith(1);
      expect(facade.snapshot.conversations).toEqual([]);
    });

    it('cancelDelete réinitialise sans supprimer', () => {
      component.onDeleteOpen(new Event('click'), 'it-1');

      component.cancelDelete();

      expect(component.showDeleteModal).toBe(false);
      expect(component.pendingDeleteId).toBeNull();
      expect(facade.snapshot.conversations).toHaveLength(1);
    });

    it('getPendingDeleteTitle retourne le titre de la conversation ciblée', () => {
      component.onDeleteOpen(new Event('click'), 'it-1');

      expect(component.getPendingDeleteTitle()).toBe('IT');
    });

    it('getPendingDeleteTitle retourne une valeur par défaut si non trouvée', () => {
      component.pendingDeleteId = 'inconnu';

      expect(component.getPendingDeleteTitle()).toBe('cette conversation');
    });
  });

  describe('UI helpers', () => {
    it('toggleSidebar inverse showSidebar via la facade', () => {
      const initial = facade.snapshot.showSidebar;

      component.toggleSidebar();

      expect(facade.snapshot.showSidebar).toBe(!initial);
    });

    it('onKeyDown envoie le message sur Enter sans Shift', () => {
      const sendSpy = vi.spyOn(component, 'sendMessage');
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      component.onKeyDown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalled();
    });

    it('onKeyDown ignore Shift+Enter', () => {
      const sendSpy = vi.spyOn(component, 'sendMessage');
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

      component.onKeyDown(event);

      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('trackByConv retourne l’id de la conversation', () => {
      const conv: UnifiedConversation = {
        id: 'it-1',
        title: 'IT',
        mode: 'it',
        createdAt: new Date(),
        isPinned: false,
      };

      expect(component.trackByConv(0, conv)).toBe('it-1');
    });

    it('trackByMsg combine role, timestamp et id', () => {
      const timestamp = new Date('2026-01-01T10:00:00.000Z');
      const msg = { id: 'msg-1', role: 'user' as const, content: 'test', timestamp };

      expect(component.trackByMsg(0, msg)).toBe(`user-${timestamp.getTime()}-msg-1`);
    });

    it('getModeColor retourne les bonnes classes selon le mode', () => {
      expect(component.getModeColor('rh')).toContain('blue');
      expect(component.getModeColor('it')).toContain('emerald');
      expect(component.getModeColor(null)).toBe('');
    });

    it('getModeIcon retourne le bon emoji selon le mode', () => {
      expect(component.getModeIcon('rh')).toBe('🏢');
      expect(component.getModeIcon('it')).toBe('💻');
      expect(component.getModeIcon(undefined)).toBe('🤖');
    });
  });
});
