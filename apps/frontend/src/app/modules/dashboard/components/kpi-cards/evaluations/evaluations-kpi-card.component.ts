import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EvaluationStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-evaluations-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluations-kpi-card.component.html',
})
export class EvaluationsKpiCardComponent {
  readonly stats = input.required<EvaluationStats | null>();
  private readonly router = inject(Router);
  navigate(): void {
    this.router.navigate(['/posts'], { queryParams: { hasEvaluation: 'true' } });
  }
}
