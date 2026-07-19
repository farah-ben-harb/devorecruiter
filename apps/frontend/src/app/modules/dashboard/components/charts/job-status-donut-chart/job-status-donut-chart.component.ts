import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { JobPostStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-job-status-donut-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './job-status-donut-chart.component.html',
})
export class JobStatusDonutChartComponent {
  readonly stats = input.required<JobPostStats | null>();

  readonly series = computed<number[]>(() => {
    const s = this.stats()?.parStatut ?? {};
    return [s['raw'] ?? 0, s['unified'] ?? 0];
  });

  readonly labels = ['Brut', 'Unifié'];
  readonly chart = { type: 'donut' as const, height: 220, parentHeightOffset: 0 };
  readonly colors = ['#2563eb', '#60a5fa'];
  readonly legend = { position: 'bottom' as const, fontSize: '11px' };
  readonly plotOptions = {
    pie: {
      donut: {
        size: '70%',
        labels: { show: true, total: { show: true, label: 'Total', fontWeight: 'bold' } },
      },
    },
  };
}
