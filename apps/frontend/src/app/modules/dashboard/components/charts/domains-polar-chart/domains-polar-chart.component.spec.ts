import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { DomainsPolarChartComponent } from './domains-polar-chart.component';

describe('DomainsPolarChartComponent', () => {
  it('maps domain counts and labels from the provided stats', () => {
    const component = TestBed.runInInjectionContext(() => new DomainsPolarChartComponent());
    (component as unknown as { domainStats: () => unknown }).domainStats = () => ({
      domains: [
        { domain: 'Angular', count: 5 },
        { domain: 'TypeScript', count: 3 },
      ],
    });

    expect(component.series()).toEqual([5, 3]);
    expect(component.labels()).toEqual(['Angular', 'TypeScript']);
    expect(component.legend.formatter('VeryLongLabelName')).toBe('VeryLongLa…');
    expect(component.tooltip.y.formatter(7)).toBe('Score : 7');
  });
});
