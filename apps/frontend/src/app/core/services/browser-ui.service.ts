import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserUiService {
  private readonly document = inject(DOCUMENT);

  setBodyOverflow(value: string): void {
    this.document.body.style.overflow = value;
  }

  addBodyClass(className: string): void {
    this.document.body.classList.add(className);
  }

  removeBodyClass(className: string): void {
    this.document.body.classList.remove(className);
  }

  confirm(message: string): boolean {
    return globalThis.confirm(message);
  }
}
