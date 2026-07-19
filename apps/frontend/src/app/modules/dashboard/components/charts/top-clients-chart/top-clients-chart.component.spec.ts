import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TopClientsChartComponent } from './top-clients-chart.component';

describe('TopClientsChartComponent', () => {
  it('limits the list to five clients and computes percentages', () => {
    const component = TestBed.runInInjectionContext(() => new TopClientsChartComponent());
    (component as unknown as { stats: () => unknown }).stats = () => ({
      topClients: [
        { company: 'Acme', count: 10 },
        { company: '', count: 8 },
        { company: 'Gamma', count: 6 },
        { company: 'Delta', count: 4 },
        { company: 'Epsilon', count: 2 },
        { company: 'Ignored', count: 1 },
      ],
    });

    expect(component.bars()).toEqual([
      { label: 'Acme', count: 10, pct: 100, color: '#2563eb' },
      { label: 'Inconnu', count: 8, pct: 80, color: '#3b82f6' },
      { label: 'Gamma', count: 6, pct: 60, color: '#60a5fa' },
      { label: 'Delta', count: 4, pct: 40, color: '#93c5fd' },
      { label: 'Epsilon', count: 2, pct: 20, color: '#bfdbfe' },
    ]);
  });
});
