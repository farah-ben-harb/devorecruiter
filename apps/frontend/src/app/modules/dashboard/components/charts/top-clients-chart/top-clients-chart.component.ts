import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobPostStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-top-clients-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-clients-chart.component.html',
})
export class TopClientsChartComponent {
  readonly stats = input.required<JobPostStats | null>();

  readonly bars = computed(() => {
    const clients = this.stats()?.topClients ?? [];
    const top5 = clients.slice(0, 5);
    const max = Math.max(1, ...top5.map((c) => c.count));
    const colors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];
    return top5.map((c, i) => ({
      label: c.company || 'Inconnu',
      count: c.count,
      pct: Math.round((c.count / max) * 100),
      color: colors[i],
    }));
  });
}
