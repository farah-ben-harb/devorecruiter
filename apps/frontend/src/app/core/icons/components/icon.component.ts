import { Component, Input, inject } from '@angular/core';
import { IconService } from '../services/icon.service';

@Component({
  standalone: true,
  selector: 'app-icon',
  template: `<span [innerHTML]="svg" style="display:inline-flex"></span>`,
})
export class AppIconComponent {
  private svc = inject(IconService);
  svg = '';

  @Input() set name(v: string) {
    const icon = this.svc.get(v);
    this.svg = icon || '';
  }
}
