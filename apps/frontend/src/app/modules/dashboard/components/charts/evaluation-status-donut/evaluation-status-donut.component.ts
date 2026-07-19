import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ReferentEvaluationStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-evaluation-status-donut',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './evaluation-status-donut.component.html',
})
export class EvaluationStatusDonutComponent {
  readonly stats = input.required<ReferentEvaluationStats | null>();

  readonly series = computed<number[]>(() => [
    this.stats()?.pending ?? 0,
    this.stats()?.completed ?? 0,
    this.stats()?.approved ?? 0,
    this.stats()?.rejected ?? 0,
  ]);

  readonly labels = ['En attente', 'Terminées', 'Approuvées', 'Rejetées'];
  readonly colors = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444'];

  readonly chart = { type: 'pie' as const, height: 240, parentHeightOffset: 0 };
  readonly legend = { position: 'bottom' as const, fontSize: '11px' };
  readonly plotOptions = {
    pie: {
      expandOnClick: true,
      dataLabels: { offset: -10 },
    },
  };
  readonly dataLabels = {
    enabled: true,
    formatter: (val: number) => `${Math.round(val)}%`,
    style: { fontSize: '11px', fontWeight: '600' },
  };
}
