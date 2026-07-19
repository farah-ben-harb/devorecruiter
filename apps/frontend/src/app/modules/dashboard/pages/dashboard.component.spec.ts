import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DashboardComponent } from './dashboard.component';
import { RoleService } from '@shared/services/roles/role.service';
import { DashboardFacade } from '../state/dashboard.facade';
import { UserStats, JobPostStats, ResumeStats, EvaluationStats } from '../models/dashboard.model';

describe('DashboardComponent', () => {
  let roleServiceMock: { hasRole: ReturnType<typeof vi.fn> };
  let facadeMock: {
    userStats: ReturnType<typeof signal<UserStats | null>>;
    jobPostStats: ReturnType<typeof signal<JobPostStats | null>>;
    resumeStats: ReturnType<typeof signal<ResumeStats | null>>;
    evaluationStats: ReturnType<typeof signal<EvaluationStats | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    loadAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    roleServiceMock = {
      hasRole: vi.fn((role: string) => role === 'ADMIN_RH'),
    };

    facadeMock = {
      userStats: signal<UserStats | null>(null),
      jobPostStats: signal<JobPostStats | null>(null),
      resumeStats: signal<ResumeStats | null>(null),
      evaluationStats: signal<EvaluationStats | null>(null),
      loading: signal(false),
      error: signal(null),
      loadAll: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: RoleService, useValue: roleServiceMock },
        { provide: DashboardFacade, useValue: facadeMock },
      ],
    });
  });

  it('exposes the injected role service', () => {
    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    expect(component.role.hasRole('ADMIN_RH')).toBe(true);
  });

  it('loads the dashboard facade on init', () => {
    const component = TestBed.runInInjectionContext(() => new DashboardComponent());

    component.ngOnInit();

    expect(facadeMock.loadAll).toHaveBeenCalledTimes(1);
  });
});
