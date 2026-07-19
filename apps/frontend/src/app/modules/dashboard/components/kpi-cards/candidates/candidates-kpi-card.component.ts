import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ResumeStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-candidates-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './candidates-kpi-card.component.html',
})
export class CandidatesKpiCardComponent {
  readonly stats = input.required<ResumeStats | null>();
  private readonly router = inject(Router);
  navigate(): void {
    this.router.navigate(['/candidates']);
  }
}
