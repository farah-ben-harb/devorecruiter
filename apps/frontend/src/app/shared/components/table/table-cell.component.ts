import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: '[app-table-cell]', // eslint-disable-line @angular-eslint/component-selector
  template: `<ng-content></ng-content>`,
  host: { '[class]': 'className()' },
})
export class TableCellComponent {
  readonly isHeader = input(false);
  readonly className = input('');
}
