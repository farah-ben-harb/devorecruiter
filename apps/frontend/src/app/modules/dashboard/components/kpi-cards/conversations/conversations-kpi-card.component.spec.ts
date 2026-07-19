import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Router } from '@angular/router';

import { ConversationsKpiCardComponent } from './conversations-kpi-card.component';

describe('ConversationsKpiCardComponent', () => {
  it('navigates to assistance when requested', () => {
    const routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }],
    });

    const component = TestBed.runInInjectionContext(() => new ConversationsKpiCardComponent());

    component.navigateTo();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/assistance']);
  });
});
