import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: '[app-table-body]', // eslint-disable-line @angular-eslint/component-selector
  template: `<ng-content></ng-content>`,
  host: { '[class]': 'className()' },
})
export class TableBodyComponent {
  readonly className = input('');
}
