import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Router } from '@angular/router';

import { EvaluationsKpiCardComponent } from './evaluations-kpi-card.component';

describe('EvaluationsKpiCardComponent', () => {
  it('navigates to posts filtered by evaluations when requested', () => {
    const routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }],
    });

    const component = TestBed.runInInjectionContext(() => new EvaluationsKpiCardComponent());

    component.navigate();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/posts'], {
      queryParams: { hasEvaluation: 'true' },
    });
  });
});
