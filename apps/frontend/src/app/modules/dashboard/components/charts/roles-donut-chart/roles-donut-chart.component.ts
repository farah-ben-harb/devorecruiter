import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { UserStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-roles-donut-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './roles-donut-chart.component.html',
})
export class RolesDonutChartComponent {
  readonly stats = input.required<UserStats | null>();

  readonly series = computed<number[]>(() => Object.values(this.stats()?.parRole ?? {}));

  readonly labels = computed<string[]>(() => {
    const map: Record<string, string> = {
      TALENT_ACQUISITION: 'Recruteur',
      CONSULTANT: 'Consultant',
      TECHNICAL_REFERENT: 'Référent',
    };
    return Object.keys(this.stats()?.parRole ?? {}).map((r) => map[r] ?? r);
  });

  readonly chart = { type: 'donut' as const, height: 240, parentHeightOffset: 0 };
  readonly colors = ['#2563eb', '#3b82f6', '#60a5fa'];
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
