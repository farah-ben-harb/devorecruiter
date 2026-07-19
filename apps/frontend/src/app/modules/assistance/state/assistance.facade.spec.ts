import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssistanceFacade } from './assistance.facade';
import { AssistanceService } from '../service/assistance.service';

describe('AssistanceFacade', () => {
  let facade: AssistanceFacade;

  const assistanceServiceMock = {
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    deleteConversation: vi.fn(),
    updateConversation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        AssistanceFacade,
        { provide: AssistanceService, useValue: assistanceServiceMock },
      ],
    });

    facade = TestBed.inject(AssistanceFacade);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load conversations, select the requested one and load its messages', () => {
    const loadedConversationIds: string[] = [];
    const messages = [
      {
        id: 'm-1',
        role: 'assistant' as const,
        content: 'Bonjour',
        createdAt: '2026-04-30T10:00:00.000Z',
      },
    ];

    assistanceServiceMock.getConversations.mockReturnValue(
      of([
        {
          id: 'conv-1',
          title: 'Conversation 1',
          isPinned: false,
          createdAt: '2026-04-30T08:00:00.000Z',
          updatedAt: '2026-04-30T09:00:00.000Z',
        },
        {
          id: 'conv-2',
          title: 'Conversation 2',
          isPinned: true,
          createdAt: '2026-04-30T08:30:00.000Z',
          updatedAt: '2026-04-30T09:30:00.000Z',
        },
      ]),
    );
    assistanceServiceMock.getMessages.mockReturnValue(of(messages));

    facade.messagesLoaded$.subscribe((conversationId) => {
      loadedConversationIds.push(conversationId);
    });

    facade.loadConversations('conv-2');

    expect(assistanceServiceMock.getConversations).toHaveBeenCalledTimes(1);
    expect(assistanceServiceMock.getMessages).toHaveBeenCalledWith('conv-2');
    expect(facade.conversations()).toHaveLength(2);
    expect(facade.activeConversationId()).toBe('conv-2');
    expect(facade.activeConversation()?.title).toBe('Conversation 2');
    expect(facade.activeMessages()).toEqual([
      {
        id: 'm-1',
        role: 'assistant',
        content: 'Bonjour',
        timestamp: new Date('2026-04-30T10:00:00.000Z'),
      },
    ]);
    expect(loadedConversationIds).toEqual(['conv-2']);
  });

  it('should optimistically rename a conversation and rollback on failure', () => {
    assistanceServiceMock.updateConversation.mockReturnValue(
      throwError(() => new Error('update failed')),
    );

    facade.addPersistedConversation({
      id: 'conv-3',
      title: 'Titre initial',
      isPinned: false,
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T09:00:00.000Z',
    });

    facade.renameConversation('conv-3', 'Nouveau titre');

    expect(assistanceServiceMock.updateConversation).toHaveBeenCalledWith('conv-3', {
      title: 'Nouveau titre',
    });
    expect(facade.conversations()[0]?.title).toBe('Titre initial');
  });

  it('should delete the active conversation and select the next remaining one', () => {
    assistanceServiceMock.deleteConversation.mockReturnValue(of(void 0));
    assistanceServiceMock.getConversations.mockReturnValue(of([]));

    facade.addPersistedConversation({
      id: 'conv-a',
      title: 'Conversation A',
      isPinned: false,
      createdAt: '2026-04-30T08:00:00.000Z',
      updatedAt: '2026-04-30T09:00:00.000Z',
    });
    facade.addPersistedConversation({
      id: 'conv-b',
      title: 'Conversation B',
      isPinned: false,
      createdAt: '2026-04-30T08:10:00.000Z',
      updatedAt: '2026-04-30T09:10:00.000Z',
    });

    facade.deleteConversation('conv-b');

    expect(assistanceServiceMock.deleteConversation).toHaveBeenCalledWith('conv-b');
    expect(facade.conversations()).toHaveLength(1);
    expect(facade.conversations()[0]?.id).toBe('conv-a');
    expect(facade.activeConversationId()).toBe('conv-a');
  });
});
