import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private _isExpanded = signal<boolean>(true);
  private _isMobileOpen = signal<boolean>(false);
  private _isHovered = signal<boolean>(false);

  readonly isExpanded = computed(() => this._isExpanded());
  readonly isMobileOpen = computed(() => this._isMobileOpen());
  readonly isHovered = computed(() => this._isHovered());

  setExpanded(val: boolean): void {
    this._isExpanded.set(val);
  }

  toggleExpanded(): void {
    this._isExpanded.update((v) => !v);
  }

  setMobileOpen(val: boolean): void {
    this._isMobileOpen.set(val);
  }

  toggleMobileOpen(): void {
    this._isMobileOpen.update((v) => !v);
  }

  setHovered(val: boolean): void {
    this._isHovered.set(val);
  }
}
