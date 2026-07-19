import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Router } from '@angular/router';

import { CandidatesKpiCardComponent } from './candidates-kpi-card.component';

describe('CandidatesKpiCardComponent', () => {
  it('navigates to candidates when requested', () => {
    const routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }],
    });

    const component = TestBed.runInInjectionContext(() => new CandidatesKpiCardComponent());

    component.navigate();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/candidates']);
  });
});
