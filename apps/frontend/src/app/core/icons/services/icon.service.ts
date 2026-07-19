import { Injectable } from '@angular/core';
import { ICONS } from '../constants/icon.registry';

@Injectable({ providedIn: 'root' })
export class IconService {
  get(name: string): string {
    const icon = ICONS[name as keyof typeof ICONS];
    if (!icon) {
      console.warn(`Icon "${name}" not found in registry.`);
      return '';
    }
    return icon;
  }
}
