import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: '[app-table-row]', // eslint-disable-line @angular-eslint/component-selector
  template: `<ng-content></ng-content>`,
  host: { '[class]': 'className()' },
})
export class TableRowComponent {
  readonly className = input('');
}
