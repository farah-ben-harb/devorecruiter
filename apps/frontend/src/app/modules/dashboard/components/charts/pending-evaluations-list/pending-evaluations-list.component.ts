import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { PendingEvaluation } from '../../../models/dashboard.model';

@Component({
  selector: 'app-pending-evaluations-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './pending-evaluations-list.component.html',
})
export class PendingEvaluationsListComponent {
  readonly evaluations = input.required<PendingEvaluation[]>();
  readonly navigate = output<number>();

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'En attente',
      completed: 'Terminée',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    return map[status] ?? '';
  }
}
