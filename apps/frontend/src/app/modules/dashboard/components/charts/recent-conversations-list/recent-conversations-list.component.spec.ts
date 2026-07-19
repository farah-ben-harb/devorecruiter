import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { RecentConversationsListComponent } from './recent-conversations-list.component';

describe('RecentConversationsListComponent', () => {
  it('exposes the navigate output channel', () => {
    const fixture = TestBed.runInInjectionContext(() => new RecentConversationsListComponent());
    const ids: string[] = [];

    fixture.navigate.subscribe((conversationId) => {
      ids.push(conversationId);
    });

    fixture.navigate.emit('conv-42');

    expect(ids).toEqual(['conv-42']);
  });
});
