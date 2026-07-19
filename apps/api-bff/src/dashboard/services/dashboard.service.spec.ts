// src/dashboard/services/dashboard.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from '../repositories/dashboard.repository';
import {
  UserStats,
  JobPostStats,
  CvStats,
  EvaluationStats,
  ReferentEvaluationStats,
  ReferentInvitationStats,
  ActivityPoint,
  PendingEvaluation,
  ConsultantStats,
  ConsultantActivityPoint,
  ConsultantHourlyPoint,
  RecentConversation,
  ConsultantDomainStats,
} from '../interfaces/dashboard.interface';


type MockedDashboardRepository = jest.Mocked<
  Pick<
    DashboardRepository,
    | 'countUsersTotal'
    | 'countUsersByStatus'
    | 'countUsersByRole'
    | 'countJobPostsTotal'
    | 'countJobPostsBrutsAndUnifies'
    | 'countJobPostsByStatus'
    | 'countJobPostsByJobStatus'
    | 'topCompaniesByJobPosts'
    | 'topTitlesByJobPosts'
    | 'countCvs'
    | 'countEvaluationsByStatus'
    | 'getReferentEvaluationStats'
    | 'getReferentInvitationStats'
    | 'getReferentActivity'
    | 'getPendingEvaluations'
    | 'getConsultantStats'
    | 'getConsultantActivity'
    | 'getConsultantHourlyActivity'
    | 'getRecentConversations'
    | 'getConsultantDomainStats'
  >
>;

describe('DashboardService', () => {
  let service: DashboardService;
  let repository: MockedDashboardRepository;

  beforeEach(async () => {
    const mockRepository: MockedDashboardRepository = {
      countUsersTotal: jest.fn(),
      countUsersByStatus: jest.fn(),
      countUsersByRole: jest.fn(),
      countJobPostsTotal: jest.fn(),
      countJobPostsBrutsAndUnifies: jest.fn(),
      countJobPostsByStatus: jest.fn(),
      countJobPostsByJobStatus: jest.fn(),
      topCompaniesByJobPosts: jest.fn(),
      topTitlesByJobPosts: jest.fn(),
      countCvs: jest.fn(),
      countEvaluationsByStatus: jest.fn(),
      getReferentEvaluationStats: jest.fn(),
      getReferentInvitationStats: jest.fn(),
      getReferentActivity: jest.fn(),
      getPendingEvaluations: jest.fn(),
      getConsultantStats: jest.fn(),
      getConsultantActivity: jest.fn(),
      getConsultantHourlyActivity: jest.fn(),
      getRecentConversations: jest.fn(),
      getConsultantDomainStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DashboardRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    repository = mockRepository;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── getUserStats ──────────────────────────────────────────

  describe('getUserStats', () => {
    it('combine total, statut et role en un seul objet', async () => {
      repository.countUsersTotal.mockResolvedValue(50);
      repository.countUsersByStatus.mockResolvedValue({ actifs: 30, inactifs: 20 });
      repository.countUsersByRole.mockResolvedValue({
        TALENT_ACQUISITION: 10,
        CONSULTANT: 25,
        TECHNICAL_REFERENT: 15,
      });

      const result = await service.getUserStats();

      const expected: UserStats = {
        total: 50,
        actifs: 30,
        inactifs: 20,
        parRole: { TALENT_ACQUISITION: 10, CONSULTANT: 25, TECHNICAL_REFERENT: 15 },
      };
      expect(result).toEqual(expected);
    });
  });

  // ── getJobPostStats ───────────────────────────────────────

  describe('getJobPostStats', () => {
    it('combine tous les compteurs job posts en un seul objet', async () => {
      repository.countJobPostsTotal.mockResolvedValue(100);
      repository.countJobPostsBrutsAndUnifies.mockResolvedValue({ bruts: 40, unifies: 60 });
      repository.countJobPostsByStatus.mockResolvedValue({
        raw: 40,
        processing: 5,
        unified: 60,
        error: 0,
      });
      repository.countJobPostsByJobStatus.mockResolvedValue({
        open: 70,
        closed_with_hire: 20,
        closed_without_hire: 10,
        none: 0,
      });
      repository.topCompaniesByJobPosts.mockResolvedValue([
        { company: 'ACME', count: 12 },
      ]);
      repository.topTitlesByJobPosts.mockResolvedValue([
        { title: 'Dev Backend', count: 8 },
      ]);

      const result = await service.getJobPostStats();

      expect(repository.topCompaniesByJobPosts).toHaveBeenCalledWith(5);
      expect(repository.topTitlesByJobPosts).toHaveBeenCalledWith(5);

      const expected: JobPostStats = {
        total: 100,
        bruts: 40,
        unifies: 60,
        parStatut: { raw: 40, processing: 5, unified: 60, error: 0 },
        parJobStatus: { open: 70, closed_with_hire: 20, closed_without_hire: 10, none: 0 },
        topClients: [{ company: 'ACME', count: 12 }],
        topProfils: [{ title: 'Dev Backend', count: 8 }],
      };
      expect(result).toEqual(expected);
    });
  });

  // ── getCvStats ────────────────────────────────────────────

  describe('getCvStats', () => {
    it('délègue au repository', async () => {
      const stats: CvStats = { total: 200, bruts: 50, unifies: 150 };
      repository.countCvs.mockResolvedValue(stats);

      const result = await service.getCvStats();

      expect(result).toBe(stats);
    });
  });

  // ── getEvaluationStats ────────────────────────────────────

  describe('getEvaluationStats', () => {
    it('calcule enCours, validees et rejetees depuis parStatut', async () => {
      repository.countEvaluationsByStatus.mockResolvedValue({
        pending: 5,
        in_progress: 3,
        completed: 10,
        approved: 7,
        rejected: 2,
      });

      const result = await service.getEvaluationStats();

      const expected: EvaluationStats = {
        total: 27,
        enCours: 8, // pending + in_progress
        validees: 17, // completed + approved
        rejetees: 2,
      };
      expect(result).toEqual(expected);
    });

    it('gère les statuts manquants comme 0', async () => {
      repository.countEvaluationsByStatus.mockResolvedValue({
        completed: 5,
      });

      const result = await service.getEvaluationStats();

      expect(result).toEqual({
        total: 5,
        enCours: 0,
        validees: 5,
        rejetees: 0,
      });
    });
  });

  // ── getReferentEvaluationStats ────────────────────────────

  describe('getReferentEvaluationStats', () => {
    it('délègue au repository', async () => {
      const stats: ReferentEvaluationStats = {
        pending: 5,
        inProgress: 3,
        completed: 10,
        approved: 7,
        rejected: 2,
        total: 27,
      };
      repository.getReferentEvaluationStats.mockResolvedValue(stats);

      const result = await service.getReferentEvaluationStats();

      expect(result).toBe(stats);
    });
  });

  // ── getReferentInvitationStats ────────────────────────────

  describe('getReferentInvitationStats', () => {
    it('délègue au repository', async () => {
      const stats: ReferentInvitationStats = {
        sent: 20,
        submitted: 15,
        expired: 3,
        total: 38,
      };
      repository.getReferentInvitationStats.mockResolvedValue(stats);

      const result = await service.getReferentInvitationStats();

      expect(result).toBe(stats);
    });
  });

  // ── getReferentActivity ───────────────────────────────────

  describe('getReferentActivity', () => {
    it('délègue au repository', async () => {
      const activity: ActivityPoint[] = [
        { date: '2024-01-01', generated: 2, approved: 1, invitations: 3 },
      ];
      repository.getReferentActivity.mockResolvedValue(activity);

      const result = await service.getReferentActivity();

      expect(result).toBe(activity);
    });
  });

  // ── getPendingEvaluations ─────────────────────────────────

  describe('getPendingEvaluations', () => {
    it('délègue au repository', async () => {
      const pending: PendingEvaluation[] = [
        {
          id: 1,
          title: 'Test Java',
          jobPostId: 10,
          jobPostTitle: 'Dev Backend',
          company: 'ACME',
          status: 'pending',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      repository.getPendingEvaluations.mockResolvedValue(pending);

      const result = await service.getPendingEvaluations();

      expect(result).toBe(pending);
    });
  });

  // ── getConsultantStats ────────────────────────────────────

  describe('getConsultantStats', () => {
    it('délègue au repository avec userId', async () => {
      const stats: ConsultantStats = {
        totalConversations: 5,
        totalMessages: 40,
        hasMemory: true,
      };
      repository.getConsultantStats.mockResolvedValue(stats);

      const result = await service.getConsultantStats(7);

      expect(repository.getConsultantStats).toHaveBeenCalledWith(7);
      expect(result).toBe(stats);
    });
  });

  // ── getConsultantActivity ─────────────────────────────────

  describe('getConsultantActivity', () => {
    it('délègue au repository avec userId', async () => {
      const activity: ConsultantActivityPoint[] = [
        { date: '2024-01-01', sessions: 2, messages: 10 },
      ];
      repository.getConsultantActivity.mockResolvedValue(activity);

      const result = await service.getConsultantActivity(7);

      expect(repository.getConsultantActivity).toHaveBeenCalledWith(7);
      expect(result).toBe(activity);
    });
  });

  // ── getConsultantHourlyActivity ───────────────────────────

  describe('getConsultantHourlyActivity', () => {
    it('délègue au repository avec userId', async () => {
      const hourly: ConsultantHourlyPoint[] = [{ hour: 9, count: 5 }];
      repository.getConsultantHourlyActivity.mockResolvedValue(hourly);

      const result = await service.getConsultantHourlyActivity(7);

      expect(repository.getConsultantHourlyActivity).toHaveBeenCalledWith(7);
      expect(result).toBe(hourly);
    });
  });

  // ── getRecentConversations ────────────────────────────────

  describe('getRecentConversations', () => {
    it('délègue au repository avec userId', async () => {
      const conversations: RecentConversation[] = [
        {
          id: 'conv-1',
          title: 'Question NestJS',
          updatedAt: '2024-01-01T00:00:00.000Z',
          messageCount: 4,
        },
      ];
      repository.getRecentConversations.mockResolvedValue(conversations);

      const result = await service.getRecentConversations(7);

      expect(repository.getRecentConversations).toHaveBeenCalledWith(7);
      expect(result).toBe(conversations);
    });
  });

  // ── getConsultantDomainStats ──────────────────────────────

  describe('getConsultantDomainStats', () => {
    it('délègue au repository avec userId', async () => {
      const domainStats: ConsultantDomainStats = {
        domains: [
          { domain: 'Docker', count: 80, countLastWeek: 0, countPreviousWeek: 0 },
        ],
        total: 80,
      };
      repository.getConsultantDomainStats.mockResolvedValue(domainStats);

      const result = await service.getConsultantDomainStats(7);

      expect(repository.getConsultantDomainStats).toHaveBeenCalledWith(7);
      expect(result).toBe(domainStats);
    });
  });
});