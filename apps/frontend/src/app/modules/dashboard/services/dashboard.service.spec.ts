import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';

import { DashboardService } from './dashboard.service';
import { DashboardMapper } from '../mappers/dashboard.mapper';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    httpMock = { get: vi.fn() };
    service = new DashboardService(httpMock as never);
  });

  it('getUserStats() requests the users endpoint', () => {
    const response = {
      total: undefined,
      actifs: undefined,
      inactifs: undefined,
      parRole: undefined,
    };
    httpMock.get.mockReturnValue(of(response));

    service.getUserStats().subscribe((result) => {
      expect(result).toEqual(DashboardMapper.toUserStats(response as never));
    });

    expect(httpMock.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/users'));
  });

  it('getJobPostStats() requests the job posts endpoint', () => {
    const response = {
      total: 2,
      bruts: undefined,
      unifies: undefined,
      parStatut: undefined,
      topClients: [{ company: 'Acme', count: undefined }],
      topProfils: [{ title: 'Frontend', count: undefined }],
    };
    httpMock.get.mockReturnValue(of(response));

    service.getJobPostStats().subscribe((result) => {
      expect(result.total).toBe(2);
      expect(result.topClients).toHaveLength(1);
    });

    expect(httpMock.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/job-posts'));
  });

  it('getResumeStats() requests the candidates endpoint', () => {
    const response = { total: undefined, bruts: undefined, unifies: undefined };
    httpMock.get.mockReturnValue(of(response));

    service.getResumeStats().subscribe((result) => {
      expect(result.bruts).toBe(0);
    });

    expect(httpMock.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/candidates'));
  });

  it('getEvaluationStats() requests the evaluations endpoint', () => {
    const response = {
      total: undefined,
      enCours: undefined,
      validees: undefined,
      rejetees: undefined,
    };
    httpMock.get.mockReturnValue(of(response));

    service.getEvaluationStats().subscribe((result) => {
      expect(result.enCours).toBe(0);
    });

    expect(httpMock.get).toHaveBeenCalledWith(expect.stringContaining('/dashboard/evaluations'));
  });
});
