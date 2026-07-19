import { TestBed } from '@angular/core/testing';
import type { WritableSignal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageInputComponent } from './message-input.component';

type MessageInputTestProxy = {
  message: WritableSignal<string>;
};

describe('MessageInputComponent', () => {
  let component: MessageInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new MessageInputComponent());
  });

  it('should emit a trimmed message and clear input', () => {
    const sendSpy = vi.fn();
    component.send.subscribe(sendSpy);
    const proxy = component as unknown as MessageInputTestProxy;

    proxy.message.set('  Bonjour  ');
    component.onSend();

    expect(sendSpy).toHaveBeenCalledWith('Bonjour');
    expect(proxy.message()).toBe('');
  });

  it('should not emit when loading or message is empty', () => {
    const sendSpy = vi.fn();
    component.send.subscribe(sendSpy);
    const proxy = component as unknown as MessageInputTestProxy;

    proxy.message.set('   ');
    component.onSend();

    component.isLoading = true;
    proxy.message.set('Hello');
    component.onSend();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should send on Enter without Shift', () => {
    const preventDefault = vi.fn();
    const onSendSpy = vi.spyOn(component, 'onSend');
    const event = { key: 'Enter', shiftKey: false, preventDefault } as unknown as KeyboardEvent;

    component.onKeyDown(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onSendSpy).toHaveBeenCalledTimes(1);
  });

  it('should not send on Enter with Shift', () => {
    const preventDefault = vi.fn();
    const onSendSpy = vi.spyOn(component, 'onSend');
    const event = { key: 'Enter', shiftKey: true, preventDefault } as unknown as KeyboardEvent;

    component.onKeyDown(event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onSendSpy).not.toHaveBeenCalled();
  });
});
