import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Router } from '@angular/router';

import { UsersKpiCardComponent } from './users-kpi-card.component';

describe('UsersKpiCardComponent', () => {
  it('navigates to users when requested', () => {
    const routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }],
    });

    const component = TestBed.runInInjectionContext(() => new UsersKpiCardComponent());

    component.navigate();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/users']);
  });
});
