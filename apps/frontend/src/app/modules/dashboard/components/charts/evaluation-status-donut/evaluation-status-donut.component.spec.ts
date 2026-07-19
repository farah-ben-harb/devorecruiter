import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EvaluationStatusDonutComponent } from './evaluation-status-donut.component';

describe('EvaluationStatusDonutComponent', () => {
  it('maps the evaluation status series and formats percentages', () => {
    const component = TestBed.runInInjectionContext(() => new EvaluationStatusDonutComponent());
    (component as unknown as { stats: () => unknown }).stats = () => ({
      pending: 1,
      completed: 2,
      approved: 3,
      rejected: 4,
    });

    expect(component.series()).toEqual([1, 2, 3, 4]);
    expect(component.labels).toEqual(['En attente', 'Terminées', 'Approuvées', 'Rejetées']);
    expect(component.dataLabels.formatter(42.7)).toBe('43%');
  });
});
