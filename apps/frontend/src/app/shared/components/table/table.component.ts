import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-table',
  imports: [NgClass],
  template: `<table [ngClass]="'min-w-full ' + className()">
    <ng-content></ng-content>
  </table>`,
})
export class TableComponent {
  readonly className = input('');
}
