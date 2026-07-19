import { UserStats, JobPostStats, ResumeStats, EvaluationStats } from '../models/dashboard.model';

export class DashboardMapper {
  static toUserStats(raw: UserStats): UserStats {
    return {
      total: raw.total ?? 0,
      actifs: raw.actifs ?? 0,
      inactifs: raw.inactifs ?? 0,
      parRole: raw.parRole ?? {},
    };
  }

  static toJobPostStats(raw: JobPostStats): JobPostStats {
    return {
      total: raw.total ?? 0,
      bruts: raw.bruts ?? 0,
      unifies: raw.unifies ?? 0,
      parStatut: raw.parStatut ?? {},
      parJobStatus: raw.parJobStatus ?? {},
      topClients: (raw.topClients ?? []).map((c) => ({
        company: c.company,
        count: c.count ?? 0,
      })),
      topProfils: (raw.topProfils ?? []).map((p) => ({
        title: p.title,
        count: p.count ?? 0,
      })),
    };
  }

  static toResumeStats(raw: ResumeStats): ResumeStats {
    return {
      total: raw.total ?? 0,
      bruts: raw.bruts ?? 0,
      unifies: raw.unifies ?? 0,
    };
  }

  static toEvaluationStats(raw: EvaluationStats): EvaluationStats {
    return {
      total: raw.total ?? 0,
      enCours: raw.enCours ?? 0,
      validees: raw.validees ?? 0,
      rejetees: raw.rejetees ?? 0,
    };
  }
}
