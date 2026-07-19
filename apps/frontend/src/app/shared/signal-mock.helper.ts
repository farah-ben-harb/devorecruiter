import { signal, WritableSignal } from '@angular/core';

export function mockSignal<T>(initialValue: T): WritableSignal<T> {
  return signal<T>(initialValue);
}
