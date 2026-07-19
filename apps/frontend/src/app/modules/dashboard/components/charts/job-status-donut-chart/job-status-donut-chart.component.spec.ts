import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { JobStatusDonutChartComponent } from './job-status-donut-chart.component';

describe('JobStatusDonutChartComponent', () => {
  it('maps raw and unified counts from the provided stats', () => {
    const component = TestBed.runInInjectionContext(() => new JobStatusDonutChartComponent());
    (component as unknown as { stats: () => unknown }).stats = () => ({
      parStatut: {
        raw: 7,
        unified: 4,
      },
    });

    expect(component.series()).toEqual([7, 4]);
    expect(component.labels).toEqual(['Brut', 'Unifié']);
  });
});
