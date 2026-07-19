import { Injectable } from '@nestjs/common';
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

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getUserStats(): Promise<UserStats> {
    const [total, parStatus, parRole] = await Promise.all([
      this.dashboardRepository.countUsersTotal(),
      this.dashboardRepository.countUsersByStatus(),
      this.dashboardRepository.countUsersByRole(),
    ]);

    return {
      total,
      actifs: parStatus.actifs,
      inactifs: parStatus.inactifs,
      parRole,
    };
  }

  async getJobPostStats(): Promise<JobPostStats> {
  const [total, brutsUnifies, parStatut, parJobStatus, topClients, topProfils] =
    await Promise.all([
      this.dashboardRepository.countJobPostsTotal(),
      this.dashboardRepository.countJobPostsBrutsAndUnifies(),
      this.dashboardRepository.countJobPostsByStatus(),
      this.dashboardRepository.countJobPostsByJobStatus(),
      this.dashboardRepository.topCompaniesByJobPosts(5),
      this.dashboardRepository.topTitlesByJobPosts(5),
    ]);

  return {
    total,
    bruts: brutsUnifies.bruts,
    unifies: brutsUnifies.unifies,
    parStatut,
    parJobStatus,
    topClients,
    topProfils,
  };
}

  async getCvStats(): Promise<CvStats> {
    return this.dashboardRepository.countCvs();
  }

  async getEvaluationStats(): Promise<EvaluationStats> {
    const parStatut = await this.dashboardRepository.countEvaluationsByStatus();
    const total = Object.values(parStatut).reduce((a, b) => a + b, 0);

    return {
      total,
      enCours: (parStatut['pending'] ?? 0) + (parStatut['in_progress'] ?? 0),
      validees: (parStatut['completed'] ?? 0) + (parStatut['approved'] ?? 0),
      rejetees: parStatut['rejected'] ?? 0,
    };
  }

  async getReferentEvaluationStats(): Promise<ReferentEvaluationStats> {
    return this.dashboardRepository.getReferentEvaluationStats();
  }

  async getReferentInvitationStats(): Promise<ReferentInvitationStats> {
    return this.dashboardRepository.getReferentInvitationStats();
  }

  async getReferentActivity(): Promise<ActivityPoint[]> {
    return this.dashboardRepository.getReferentActivity();
  }

  async getPendingEvaluations(): Promise<PendingEvaluation[]> {
    return this.dashboardRepository.getPendingEvaluations();
  }

  async getConsultantStats(userId: number): Promise<ConsultantStats> {
    const result = await this.dashboardRepository.getConsultantStats(userId);
    return result;
  }

  async getConsultantActivity(
    userId: number,
  ): Promise<ConsultantActivityPoint[]> {
    const result = await this.dashboardRepository.getConsultantActivity(userId);
    return result;
  }

  async getConsultantHourlyActivity(
    userId: number,
  ): Promise<ConsultantHourlyPoint[]> {
    const result =
      await this.dashboardRepository.getConsultantHourlyActivity(userId);
    return result;
  }

  async getRecentConversations(userId: number): Promise<RecentConversation[]> {
    const result =
      await this.dashboardRepository.getRecentConversations(userId);
    return result;
  }

  async getConsultantDomainStats(
    userId: number,
  ): Promise<ConsultantDomainStats> {
    const result =
      await this.dashboardRepository.getConsultantDomainStats(userId);
    return result;
  }

}
