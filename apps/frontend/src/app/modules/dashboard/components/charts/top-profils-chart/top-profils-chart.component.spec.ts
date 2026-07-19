import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TopProfilsChartComponent } from './top-profils-chart.component';

describe('TopProfilsChartComponent', () => {
  it('limits the list to five profils and computes percentages', () => {
    const component = TestBed.runInInjectionContext(() => new TopProfilsChartComponent());
    (component as unknown as { stats: () => unknown }).stats = () => ({
      topProfils: [
        { title: 'Frontend', count: 9 },
        { title: '', count: 6 },
        { title: 'Backend', count: 3 },
        { title: 'DevOps', count: 2 },
        { title: 'QA', count: 1 },
        { title: 'Ignored', count: 99 },
      ],
    });

    expect(component.bars()).toEqual([
      { label: 'Frontend', count: 9, pct: 100 },
      { label: 'Non spécifié', count: 6, pct: 67 },
      { label: 'Backend', count: 3, pct: 33 },
      { label: 'DevOps', count: 2, pct: 22 },
      { label: 'QA', count: 1, pct: 11 },
    ]);
  });
});
