import { SimpleChange, ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import hljs from 'highlight.js';
import { AuthService } from '@modules/auth/services/auth.service';
import { ChatWindowComponent } from './chat-window.component';
import type { Message } from '../../models/assistance.model';

describe('ChatWindowComponent', () => {
  let component: ChatWindowComponent;
  let hostElement: HTMLElement;

  beforeEach(async () => {
    // Avoid resolving external templateUrl during tests by overriding template first
    TestBed.overrideComponent(ChatWindowComponent, { set: { template: '' } });

    await TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            getUser: () => ({ picture: 'avatar.png' }),
          },
        },
      ],
    });

    // ✅ vrai élément DOM typé
    hostElement = document.createElement('div');

    // Instantiate the component class inside an Angular injection context and provide ElementRef
    component = TestBed.runInInjectionContext(
      () => new ChatWindowComponent(new ElementRef<HTMLElement>(hostElement)),
    );

    // No fixture; we instantiate the class directly. Call lifecycle hooks manually in tests when needed.
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should read user picture from auth service', () => {
    expect(component.userPicture).toBe('avatar.png');
  });

  it('should expose a reversed copy of messages', () => {
    component.messages = [
      { id: 'm1', role: 'user', content: 'first', timestamp: new Date() },
      { id: 'm2', role: 'assistant', content: 'second', timestamp: new Date() },
    ];

    const reversed = component.messagesReversed;

    expect(reversed.map((m) => m.id)).toEqual(['m2', 'm1']);
    expect(component.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('should call scrollToBottom on ngAfterViewInit', () => {
    const scrollSpy = vi.spyOn(component, 'scrollToBottom').mockImplementation(() => undefined);

    component.ngAfterViewInit();

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('should call scrollToBottom on conversation change and new message', () => {
    const oldMessages: Message[] = [
      { id: 'a1', role: 'assistant', content: 'hello', timestamp: new Date() },
    ];
    const newMessages: Message[] = [
      { id: 'b1', role: 'assistant', content: 'new', timestamp: new Date() },
      { id: 'b2', role: 'user', content: 'next', timestamp: new Date() },
    ];

    const scrollSpy = vi.spyOn(component, 'scrollToBottom').mockImplementation(() => undefined);

    component.ngOnChanges({
      messages: new SimpleChange(oldMessages, newMessages, false),
    });

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('should call scrollToBottom when assistant streaming content changes', () => {
    const scrollSpy = vi.spyOn(component, 'scrollToBottom').mockImplementation(() => undefined);

    const previous: Message[] = [
      { id: 'a1', role: 'assistant', content: 'Hel', timestamp: new Date() },
    ];
    const current: Message[] = [
      { id: 'a1', role: 'assistant', content: 'Hello', timestamp: new Date() },
    ];

    component.ngOnChanges({
      messages: new SimpleChange(previous, current, false),
    });

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('should highlight unprocessed code blocks only once', () => {
    vi.useFakeTimers();

    const highlightSpy = vi.spyOn(hljs, 'highlightElement').mockImplementation(() => undefined);

    // ✅ vrais éléments DOM
    const blockA = document.createElement('code');
    const blockB = document.createElement('code');
    blockB.dataset['highlighted'] = 'true';

    // ✅ NodeList réel (pas de cast bizarre)
    const pre = document.createElement('pre');
    pre.appendChild(blockA);
    pre.appendChild(blockB);
    hostElement.appendChild(pre);

    component.ngOnChanges({
      messages: new SimpleChange(
        [],
        [{ id: 'm1', role: 'assistant', content: 'code', timestamp: new Date() }],
        false,
      ),
    });

    vi.advanceTimersByTime(120);

    expect(highlightSpy).toHaveBeenCalledTimes(1);
    expect(blockA.dataset['highlighted']).toBe('true');
    expect(blockB.dataset['highlighted']).toBe('true');
  });
});
