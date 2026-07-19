import { Component, input, output } from '@angular/core';
import { AppIconComponent } from '../../../../core/icons/components/icon.component';

@Component({
  selector: 'app-delete-confirm-modal',
  standalone: true,
  imports: [AppIconComponent],
  templateUrl: './delete-confirm-modal.component.html',
})
export class DeleteConfirmModalComponent {
  readonly evaluationIndex = input<string | number | null>(null);
  readonly deleting = input(false);
  readonly close = output<void>();
  readonly confirm = output<void>();
}
