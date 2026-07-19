import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  TechnicalEvaluation,
  ToggleMenuEvent,
} from '../../models/technical-evaluation/technical-evaluation.model';
import { AppIconComponent } from '../../../../core/icons/components/icon.component';

@Component({
  selector: 'app-evaluations-table',
  standalone: true,
  imports: [CommonModule, DatePipe, AppIconComponent],
  templateUrl: './evaluations-table.component.html',
})
export class EvaluationsTableComponent {
  readonly evaluations = input.required<TechnicalEvaluation[]>();
  readonly loadingEvaluations = input<boolean>(false);
  readonly approving = input<number | null>(null);
  readonly openMenuId = input<number | null>(null);

  readonly toggleMenu = output<ToggleMenuEvent>();
}
