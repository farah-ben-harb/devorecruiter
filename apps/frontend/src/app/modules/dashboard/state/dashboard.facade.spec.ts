import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { DashboardFacade } from './dashboard.facade';
import { UserStats, JobPostStats, ResumeStats, EvaluationStats } from '../models/dashboard.model';
import { DashboardService } from '../services/dashboard.service';
import { RoleService } from '@shared/services/roles/role.service';

describe('DashboardFacade', () => {
  let facade: DashboardFacade;
  let roleServiceMock: { hasRole: ReturnType<typeof vi.fn> };
  let serviceMock: {
    getUserStats: ReturnType<typeof vi.fn>;
    getJobPostStats: ReturnType<typeof vi.fn>;
    getResumeStats: ReturnType<typeof vi.fn>;
    getEvaluationStats: ReturnType<typeof vi.fn>;
    getReferentEvaluationStats: ReturnType<typeof vi.fn>;
    getReferentInvitationStats: ReturnType<typeof vi.fn>;
    getReferentActivity: ReturnType<typeof vi.fn>;
    getPendingEvaluations: ReturnType<typeof vi.fn>;
    getConsultantStats: ReturnType<typeof vi.fn>;
    getConsultantActivity: ReturnType<typeof vi.fn>;
    getConsultantHourlyActivity: ReturnType<typeof vi.fn>;
    getRecentConversations: ReturnType<typeof vi.fn>;
    getConsultantDomainStats: ReturnType<typeof vi.fn>;
  };

  const userStats: UserStats = {
    total: 10,
    actifs: 7,
    inactifs: 3,
    parRole: { ADMIN_RH: 2, CONSULTANT: 3 },
  };

  const jobPostStats: JobPostStats = {
    total: 6,
    bruts: 4,
    unifies: 2,
    parStatut: { draft: 1 },
    parJobStatus: {},
    topClients: [{ company: 'Acme', count: 4 }],
    topProfils: [{ title: 'Frontend', count: 2 }],
  };

  const resumeStats: ResumeStats = {
    total: 8,
    bruts: 5,
    unifies: 3,
  };

  const evaluationStats: EvaluationStats = {
    total: 4,
    enCours: 2,
    validees: 1,
    rejetees: 1,
  };

  beforeEach(() => {
    roleServiceMock = {
      hasRole: vi.fn((role: string) => role === 'ADMIN_RH'),
    };

    serviceMock = {
      getUserStats: vi.fn().mockReturnValue(of(userStats)),
      getJobPostStats: vi.fn().mockReturnValue(of(jobPostStats)),
      getResumeStats: vi.fn().mockReturnValue(of(resumeStats)),
      getEvaluationStats: vi.fn().mockReturnValue(of(evaluationStats)),
      getReferentEvaluationStats: vi.fn().mockReturnValue(of({} as never)),
      getReferentInvitationStats: vi.fn().mockReturnValue(of({} as never)),
      getReferentActivity: vi.fn().mockReturnValue(of([])),
      getPendingEvaluations: vi.fn().mockReturnValue(of([])),
      getConsultantStats: vi.fn().mockReturnValue(of({} as never)),
      getConsultantActivity: vi.fn().mockReturnValue(of([])),
      getConsultantHourlyActivity: vi.fn().mockReturnValue(of([])),
      getRecentConversations: vi.fn().mockReturnValue(of([])),
      getConsultantDomainStats: vi.fn().mockReturnValue(of({} as never)),
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardFacade,
        { provide: DashboardService, useValue: serviceMock },
        { provide: RoleService, useValue: roleServiceMock },
      ],
    });

    facade = TestBed.inject(DashboardFacade);
  });

  it('loadAll() loads every stat collection', () => {
    facade.loadAll();

    expect(serviceMock.getUserStats).toHaveBeenCalledTimes(1);
    expect(serviceMock.getJobPostStats).toHaveBeenCalledTimes(1);
    expect(serviceMock.getResumeStats).toHaveBeenCalledTimes(1);
    expect(serviceMock.getEvaluationStats).toHaveBeenCalledTimes(1);
    expect(facade.userStats()).toEqual(userStats);
    expect(facade.jobPostStats()).toEqual(jobPostStats);
    expect(facade.resumeStats()).toEqual(resumeStats);
    expect(facade.evaluationStats()).toEqual(evaluationStats);
    expect(facade.loading()).toBe(false);
    expect(facade.error()).toBeNull();
  });

  it('loadUserStats() does not reload when already cached', () => {
    facade.loadUserStats();
    facade.loadUserStats();

    expect(serviceMock.getUserStats).toHaveBeenCalledTimes(1);
  });

  it('loadJobPostStats() stores the error message on failure', () => {
    serviceMock.getJobPostStats.mockReturnValue(throwError(() => new Error('boom')));

    facade.loadJobPostStats();

    expect(facade.error()).toBe('boom');
    expect(facade.loading()).toBe(false);
  });
});
