import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssistanceComponent } from './assistance.component';
import { AssistanceFacade } from '../state/assistance.facade';
import { AssistanceService } from '../service/assistance.service';
import type { Message } from '../models/assistance.model';

type AssistanceComponentTestProxy = {
  isLargeScreen: () => boolean;
  sendFlow: (convId: string, content: string) => void;
};

describe('AssistanceComponent', () => {
  let component: AssistanceComponent;

  const facadeMock = {
    loadConversations: vi.fn(),
    createConversation: vi.fn(),
    setActiveConversation: vi.fn(),
    deleteConversation: vi.fn(),
    pinConversation: vi.fn(),
    renameConversation: vi.fn(),
    addPersistedConversation: vi.fn(),
    addMessage: vi.fn(),
    setLoading: vi.fn(),
    updateConversationTitle: vi.fn(),
    activeConversationId: vi.fn<() => string | null>(() => null),
    activeMessages: vi.fn(() => [] as Message[]),
    conversations: vi.fn(() => []),
    isLoading: vi.fn(() => false),
    activeConversation: vi.fn(() => null),
  };

  const serviceMock = {
    createConversation: vi.fn(),
    sendMessage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AssistanceFacade, useValue: facadeMock },
        { provide: AssistanceService, useValue: serviceMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new AssistanceComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load conversations on init and register resize listener', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener');

    component.ngOnInit();

    expect(facadeMock.loadConversations).toHaveBeenCalledTimes(1);
    expect(addEventSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should remove resize listener on destroy', () => {
    const removeEventSpy = vi.spyOn(window, 'removeEventListener');

    component.ngOnDestroy();

    expect(removeEventSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should toggle and close sidebar', () => {
    const initial = component.sidebarOpen();

    component.toggleSidebar();
    expect(component.sidebarOpen()).toBe(!initial);

    component.closeSidebar();
    expect(component.sidebarOpen()).toBe(false);
  });

  it('should create a new conversation and close sidebar on small screens', () => {
    const proxy = component as unknown as AssistanceComponentTestProxy;
    vi.spyOn(proxy, 'isLargeScreen').mockReturnValue(false);
    component.sidebarOpen.set(true);

    component.onNewConversation();

    expect(facadeMock.createConversation).toHaveBeenCalledTimes(1);
    expect(component.sidebarOpen()).toBe(false);
  });

  it('should select conversation and close sidebar on small screens', () => {
    const proxy = component as unknown as AssistanceComponentTestProxy;
    vi.spyOn(proxy, 'isLargeScreen').mockReturnValue(false);
    component.sidebarOpen.set(true);

    component.onConversationSelected('conv-1');

    expect(facadeMock.setActiveConversation).toHaveBeenCalledWith('conv-1');
    expect(component.sidebarOpen()).toBe(false);
  });

  it('should delegate delete, pin and rename handlers to facade', () => {
    component.onConversationDeleted('conv-2');
    component.onConversationPinned({ id: 'conv-3', isPinned: true });
    component.onConversationRenamed({ id: 'conv-4', title: 'Nouveau titre' });

    expect(facadeMock.deleteConversation).toHaveBeenCalledWith('conv-2');
    expect(facadeMock.pinConversation).toHaveBeenCalledWith('conv-3', true);
    expect(facadeMock.renameConversation).toHaveBeenCalledWith('conv-4', 'Nouveau titre');
  });

  it('should create a conversation first when none is active before sending', () => {
    facadeMock.activeConversationId.mockReturnValue(null);
    serviceMock.createConversation.mockReturnValue(
      of({
        id: 'new-conv',
        title: 'Nouvelle conversation',
        isPinned: false,
        createdAt: '2026-04-17T08:00:00.000Z',
        updatedAt: '2026-04-17T08:00:00.000Z',
      }),
    );

    const proxy = component as unknown as AssistanceComponentTestProxy;
    const sendFlowSpy = vi.spyOn(proxy, 'sendFlow').mockImplementation(() => undefined);

    component.onSendMessage('Hello');

    expect(serviceMock.createConversation).toHaveBeenCalledWith('Nouvelle conversation');
    expect(facadeMock.addPersistedConversation).toHaveBeenCalledTimes(1);
    expect(sendFlowSpy).toHaveBeenCalledWith('new-conv', 'Hello');
  });

  it('should use active conversation directly when sending', () => {
    facadeMock.activeConversationId.mockReturnValue('active-conv');

    const proxy = component as unknown as AssistanceComponentTestProxy;
    const sendFlowSpy = vi.spyOn(proxy, 'sendFlow').mockImplementation(() => undefined);

    component.onSendMessage('Question');

    expect(serviceMock.createConversation).not.toHaveBeenCalled();
    expect(sendFlowSpy).toHaveBeenCalledWith('active-conv', 'Question');
  });

  it('should run send flow success path and update title on first message', () => {
    facadeMock.activeMessages.mockReturnValue([]);
    serviceMock.sendMessage.mockReturnValue(of({ content: 'Réponse', title: 'Titre IA' }));

    const proxy = component as unknown as AssistanceComponentTestProxy;
    proxy.sendFlow('conv-10', 'Hello');

    expect(facadeMock.addMessage).toHaveBeenNthCalledWith(1, 'conv-10', 'user', 'Hello');
    expect(facadeMock.setLoading).toHaveBeenNthCalledWith(1, true);
    expect(serviceMock.sendMessage).toHaveBeenCalledWith('conv-10', []);
    expect(facadeMock.addMessage).toHaveBeenNthCalledWith(2, 'conv-10', 'assistant', 'Réponse');
    expect(facadeMock.updateConversationTitle).toHaveBeenCalledWith('conv-10', 'Titre IA');
    expect(facadeMock.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('should run send flow error path and append fallback assistant message', () => {
    facadeMock.activeMessages.mockReturnValue([{ id: 'm1' } as Message]);
    serviceMock.sendMessage.mockReturnValue(throwError(() => new Error('boom')));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const proxy = component as unknown as AssistanceComponentTestProxy;
    proxy.sendFlow('conv-11', 'Hi');

    expect(serviceMock.sendMessage).toHaveBeenCalledWith('conv-11', [{ id: 'm1' }]);
    expect(facadeMock.addMessage).toHaveBeenCalledWith(
      'conv-11',
      'assistant',
      "Une erreur s'est produite. Veuillez réessayer.",
    );
    expect(facadeMock.setLoading).toHaveBeenLastCalledWith(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
