import { TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import { ConversationSidebarComponent } from './conversation-sidebar.component';
import type { Conversation } from '../../models/assistance.model';

describe('ConversationSidebarComponent', () => {
  let component: ConversationSidebarComponent;

  const baseConversation: Omit<Conversation, 'id' | 'title' | 'updatedAt' | 'isPinned'> = {
    messages: [],
    createdAt: new Date('2026-04-10T10:00:00.000Z'),
    userId: 'u1',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({});

    // ✅ vrai élément DOM typé
    const hostElement = document.createElement('div');

    // Instantiate component class inside injection context to avoid template compilation
    component = TestBed.runInInjectionContext(
      () => new ConversationSidebarComponent(new ElementRef(hostElement)),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should group conversations by pinned and date ranges', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));

    component.conversations = [
      {
        ...baseConversation,
        id: 'p1',
        title: 'Pinned',
        updatedAt: new Date('2026-04-17T11:00:00.000Z'),
        isPinned: true,
      },
      {
        ...baseConversation,
        id: 't1',
        title: 'Today',
        updatedAt: new Date('2026-04-17T08:00:00.000Z'),
        isPinned: false,
      },
      {
        ...baseConversation,
        id: 'y1',
        title: 'Yesterday',
        updatedAt: new Date('2026-04-16T08:00:00.000Z'),
        isPinned: false,
      },
      {
        ...baseConversation,
        id: 'w1',
        title: 'Last week',
        updatedAt: new Date('2026-04-13T08:00:00.000Z'),
        isPinned: false,
      },
      {
        ...baseConversation,
        id: 'm1',
        title: 'Last month',
        updatedAt: new Date('2026-03-25T08:00:00.000Z'),
        isPinned: false,
      },
      {
        ...baseConversation,
        id: 'o1',
        title: 'Old',
        updatedAt: new Date('2026-02-01T08:00:00.000Z'),
        isPinned: false,
      },
    ];

    const groups = component.groupedConversations;

    expect(groups[0].label).toBe('Épinglées');
    expect(groups[0].conversations.map((c) => c.id)).toEqual(['p1']);
    expect(groups.map((g) => g.label)).toContain("Aujourd'hui");
    expect(groups.map((g) => g.label)).toContain('Hier');
    expect(groups.map((g) => g.label)).toContain('7 derniers jours');
    expect(groups.map((g) => g.label)).toContain('30 derniers jours');
    expect(groups.map((g) => g.label)).toContain('Plus ancien');
  });

  it('should toggle menu open and close', () => {
    const event = { stopPropagation: vi.fn() } as unknown as Event;

    component.toggleMenu(event, 'c1');
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(component.openMenuId()).toBe('c1');

    component.toggleMenu(event, 'c1');
    expect(component.openMenuId()).toBeNull();
  });

  it('should emit pin payload with inverted value and close menu', () => {
    const event = { stopPropagation: vi.fn() } as unknown as Event;
    const pinSpy = vi.fn();
    component.conversationPinned.subscribe(pinSpy);
    component.openMenuId.set('c1');

    component.onPin(event, 'c1', true);

    expect(pinSpy).toHaveBeenCalledWith({ id: 'c1', isPinned: false });
    expect(component.openMenuId()).toBeNull();
  });

  it('should open rename modal with current title and confirm rename', () => {
    const event = { stopPropagation: vi.fn() } as unknown as Event;
    const renameSpy = vi.fn();
    component.conversationRenamed.subscribe(renameSpy);

    component.conversations = [
      {
        ...baseConversation,
        id: 'c1',
        title: 'Old title',
        updatedAt: new Date('2026-04-17T08:00:00.000Z'),
        isPinned: false,
      },
    ];

    component.onRename(event, 'c1');
    expect(component.showRenameModal()).toBe(true);
    expect(component.pendingRenameId()).toBe('c1');
    expect(component.renameValue).toBe('Old title');

    component.renameValue = '  New title  ';
    component.confirmRename();

    expect(renameSpy).toHaveBeenCalledWith({ id: 'c1', title: 'New title' });
    expect(component.showRenameModal()).toBe(false);
    expect(component.pendingRenameId()).toBeNull();
    expect(component.renameValue).toBe('');
  });

  it('should open delete modal and confirm delete', () => {
    const event = { stopPropagation: vi.fn() } as unknown as Event;
    const deleteSpy = vi.fn();
    component.conversationDeleted.subscribe(deleteSpy);

    component.onDelete(event, 'c2');
    expect(component.showDeleteModal()).toBe(true);
    expect(component.pendingDeleteId()).toBe('c2');

    component.confirmDelete();

    expect(deleteSpy).toHaveBeenCalledWith('c2');
    expect(component.showDeleteModal()).toBe(false);
    expect(component.pendingDeleteId()).toBeNull();
  });

  it('should handle rename keyboard shortcuts', () => {
    const confirmSpy = vi.spyOn(component, 'confirmRename');
    const cancelSpy = vi.spyOn(component, 'cancelRename');

    component.onRenameKeydown({ key: 'Enter' } as KeyboardEvent);
    component.onRenameKeydown({ key: 'Escape' } as KeyboardEvent);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it('should close menu on outside document click', () => {
    component.openMenuId.set('c3');
    component.onDocumentClick({ target: document.createElement('div') } as unknown as Event);
    expect(component.openMenuId()).toBeNull();
  });

  it('should return pending delete title or fallback text', () => {
    component.conversations = [
      {
        ...baseConversation,
        id: 'c9',
        title: 'Title to delete',
        updatedAt: new Date('2026-04-17T08:00:00.000Z'),
        isPinned: false,
      },
    ];

    component.pendingDeleteId.set('c9');
    expect(component.getPendingDeleteTitle()).toBe('Title to delete');

    component.pendingDeleteId.set('unknown');
    expect(component.getPendingDeleteTitle()).toBe('cette conversation');
  });
});
