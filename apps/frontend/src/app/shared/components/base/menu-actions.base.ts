import { signal } from '@angular/core';

export abstract class MenuActionsBase {
  openMenuId = signal<string | null>(null);
  menuPosition = { top: 0, left: 0 };

  protected MENU_HEIGHT = 120;
  protected MENU_WIDTH = 208;
  private readonly OFFSET = 6;
  private readonly MARGIN = 8;

  private _scrollHandler = () => this.closeMenu();

  toggleMenu(id: string | undefined, event: MouseEvent): void {
    if (!id) return;

    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();

    // Espace réellement visible en bas/haut de l'écran (viewport coords, pas page coords)
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Calcul top en coordonnées viewport puis conversion en coordonnées page
    let topViewport: number;
    if (spaceBelow < this.MENU_HEIGHT && spaceAbove >= this.MENU_HEIGHT) {
      // Assez de place en haut → ouvrir vers le haut
      topViewport = rect.top - this.MENU_HEIGHT;
    } else if (spaceBelow < this.MENU_HEIGHT && spaceAbove < this.MENU_HEIGHT) {
      // Pas assez de place ni en haut ni en bas → coller en bas du viewport
      topViewport = window.innerHeight - this.MENU_HEIGHT - this.MARGIN;
    } else {
      // Assez de place en bas → ouvrir vers le bas (cas normal)
      topViewport = rect.bottom + this.OFFSET;
    }

    // Conversion viewport → coordonnées page (pour position: fixed, pas besoin de scrollY)
    // Le menu est en `fixed` donc on garde les coordonnées viewport directement
    let top = topViewport;

    // Clamp vertical dans le viewport
    if (top < this.MARGIN) top = this.MARGIN;
    if (top + this.MENU_HEIGHT > window.innerHeight - this.MARGIN) {
      top = window.innerHeight - this.MENU_HEIGHT - this.MARGIN;
    }

    // Aligner à droite du bouton
    let left = rect.right - this.MENU_WIDTH - 25;

    // Clamp horizontal dans le viewport
    if (left < this.MARGIN) left = this.MARGIN;
    if (left + this.MENU_WIDTH > window.innerWidth - this.MARGIN) {
      left = window.innerWidth - this.MENU_WIDTH - this.MARGIN;
    }

    this.menuPosition = { top, left };
    this.openMenuId.set(id);

    window.addEventListener('scroll', this._scrollHandler, { once: true, capture: true });
  }

  closeMenu(): void {
    this.openMenuId.set(null);
    window.removeEventListener('scroll', this._scrollHandler, true);
  }
}
