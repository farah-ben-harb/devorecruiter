import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobPostStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-top-profils-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-profils-chart.component.html',
})
export class TopProfilsChartComponent {
  readonly stats = input.required<JobPostStats | null>();

  readonly bars = computed(() => {
    const profils = this.stats()?.topProfils ?? [];
    const top5 = profils.slice(0, 5);
    const max = Math.max(1, ...top5.map((p) => p.count));
    return top5.map((p) => ({
      label: p.title || 'Non spécifié',
      count: p.count,
      pct: Math.round((p.count / max) * 100),
    }));
  });
}
