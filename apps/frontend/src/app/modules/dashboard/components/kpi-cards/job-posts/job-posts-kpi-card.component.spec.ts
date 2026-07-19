import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Router } from '@angular/router';

import { JobPostsKpiCardComponent } from './job-posts-kpi-card.component';

describe('JobPostsKpiCardComponent', () => {
  it('navigates to posts when requested', () => {
    const routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }],
    });

    const component = TestBed.runInInjectionContext(() => new JobPostsKpiCardComponent());

    component.navigate();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/posts']);
  });
});
