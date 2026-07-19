import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  selector: '[app-table-header]', // eslint-disable-line @angular-eslint/component-selector
  template: `<ng-content></ng-content>`,
})
export class TableHeaderComponent {
  readonly className = input('');
}
