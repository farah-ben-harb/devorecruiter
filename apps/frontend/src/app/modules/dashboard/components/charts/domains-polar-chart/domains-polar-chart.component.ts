import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ConsultantDomainStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-domains-polar-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './domains-polar-chart.component.html',
})
export class DomainsPolarChartComponent {
  readonly domainStats = input.required<ConsultantDomainStats | null>();

  readonly series = computed<number[]>(() => this.domainStats()?.domains.map((d) => d.count) ?? []);

  readonly labels = computed<string[]>(
    () => this.domainStats()?.domains.map((d) => d.domain) ?? [],
  );

  readonly chart = {
    type: 'polarArea' as const,
    height: 320,
    parentHeightOffset: 0,
    toolbar: { show: false },
    responsive: [
      { breakpoint: 1024, options: { chart: { height: 280 } } },
      { breakpoint: 768, options: { chart: { height: 260 } } },
      { breakpoint: 480, options: { chart: { height: 220 }, legend: { fontSize: '8px' } } },
    ],
  };

  readonly colors = [
    '#7c3aed',
    '#6d28d9',
    '#4f46e5',
    '#8b5cf6',
    '#a78bfa',
    '#6366f1',
    '#818cf8',
    '#c4b5fd',
    '#4338ca',
    '#e0e7ff',
  ];

  readonly stroke = { width: 1, colors: ['#fff'] };

  readonly fill = { opacity: 0.85 };

  readonly legend = {
    position: 'bottom' as const,
    fontSize: '9px',
    formatter: (val: string) => (val.length > 10 ? val.substring(0, 10) + '…' : val),
  };

  readonly yaxis = { show: false };

  readonly plotOptions = {
    polarArea: {
      rings: { strokeWidth: 1, strokeColor: '#e5e7eb' },
      spokes: { strokeWidth: 1, strokeColor: '#e5e7eb' },
    },
  };

  readonly dataLabels = {
    enabled: true,
    style: {
      fontSize: '11px',
      fontWeight: '600',
      colors: ['#fff'],
    },
    dropShadow: { enabled: true, blur: 2, opacity: 0.5 },
  };

  readonly tooltip = {
    theme: 'dark',
    y: { formatter: (val: number) => `Score : ${val}` },
  };
}
