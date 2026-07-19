import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { RolesDonutChartComponent } from './roles-donut-chart.component';

describe('RolesDonutChartComponent', () => {
  it('maps role counts and labels from the provided stats', () => {
    const component = TestBed.runInInjectionContext(() => new RolesDonutChartComponent());
    (component as unknown as { stats: () => unknown }).stats = () => ({
      parRole: {
        TALENT_ACQUISITION: 4,
        CONSULTANT: 2,
        OTHER: 1,
      },
    });

    expect(component.series()).toEqual([4, 2, 1]);
    expect(component.labels()).toEqual(['Recruteur', 'Consultant', 'OTHER']);
  });
});
