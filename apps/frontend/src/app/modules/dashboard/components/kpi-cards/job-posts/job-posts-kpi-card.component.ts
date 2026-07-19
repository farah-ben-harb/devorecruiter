import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { JobPostStats } from '../../../models/dashboard.model';

interface StatusItem {
  label: string;
  value: number;
  color: string;
  pct: number;
}

@Component({
  selector: 'app-job-posts-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-posts-kpi-card.component.html',
})
export class JobPostsKpiCardComponent {
  readonly stats = input.required<JobPostStats | null>();
  private readonly router = inject(Router);

  readonly open = computed(() => this.stats()?.parJobStatus?.['open'] ?? 0);
  readonly closedWithHire = computed(() => this.stats()?.parJobStatus?.['closed_with_hire'] ?? 0);
  readonly closedWithoutHire = computed(
    () => this.stats()?.parJobStatus?.['closed_without_hire'] ?? 0,
  );
  readonly none = computed(() => this.stats()?.parJobStatus?.['none'] ?? 0);

  readonly statusTotal = computed(
    () => this.open() + this.closedWithHire() + this.closedWithoutHire() + this.none(),
  );

  readonly items = computed<StatusItem[]>(() => {
    const total = Math.max(1, this.statusTotal());
    return [
      {
        label: 'Ouvertes',
        value: this.open(),
        color: '#10b981',
        pct: Math.round((this.open() / total) * 100),
      },
      {
        label: 'Poste attribué',
        value: this.closedWithHire(),
        color: '#2563eb',
        pct: Math.round((this.closedWithHire() / total) * 100),
      },
      {
        label: 'Non attribué',
        value: this.closedWithoutHire(),
        color: '#ef4444',
        pct: Math.round((this.closedWithoutHire() / total) * 100),
      },
      {
        label: 'Sans statut',
        value: this.none(),
        color: '#9ca3af',
        pct: Math.round((this.none() / total) * 100),
      },
    ];
  });

  navigate(): void {
    this.router.navigate(['/posts']);
  }
}
