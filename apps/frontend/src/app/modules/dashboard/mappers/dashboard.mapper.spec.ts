import { describe, it, expect } from 'vitest';
import { DashboardMapper } from './dashboard.mapper';
import { UserStats, JobPostStats, ResumeStats, EvaluationStats } from '../models/dashboard.model';

describe('DashboardMapper', () => {
  describe('toUserStats', () => {
    it('mappe correctement des données complètes', () => {
      const raw: UserStats = {
        total: 10,
        actifs: 7,
        inactifs: 3,
        parRole: { admin: 2, recruiter: 5 },
      };

      const result = DashboardMapper.toUserStats(raw);

      expect(result).toEqual(raw);
    });

    it('applique les valeurs par défaut quand les champs sont absents', () => {
      const raw = {} as Partial<UserStats> as UserStats;

      const result = DashboardMapper.toUserStats(raw);

      expect(result).toEqual({
        total: 0,
        actifs: 0,
        inactifs: 0,
        parRole: {},
      });
    });

    it('conserve un parRole vide fourni explicitement', () => {
      const raw = {
        total: 5,
        actifs: 5,
        inactifs: 0,
        parRole: {},
      } as Partial<UserStats> as UserStats;

      const result = DashboardMapper.toUserStats(raw);

      expect(result.parRole).toEqual({});
    });
  });

  describe('toJobPostStats', () => {
    it('mappe correctement des données complètes', () => {
      const raw: JobPostStats = {
        total: 20,
        bruts: 12,
        unifies: 8,
        parStatut: { open: 15, closed: 5 },
        parJobStatus: { active: 18, archived: 2 },
        topClients: [
          { company: 'Devoteam', count: 6 },
          { company: 'Capgemini', count: 4 },
        ],
        topProfils: [{ title: 'DevOps Engineer', count: 3 }],
      };

      const result = DashboardMapper.toJobPostStats(raw);

      expect(result).toEqual(raw);
    });

    it('applique les valeurs par défaut quand les champs sont absents', () => {
      const raw = {} as Partial<JobPostStats> as JobPostStats;

      const result = DashboardMapper.toJobPostStats(raw);

      expect(result).toEqual({
        total: 0,
        bruts: 0,
        unifies: 0,
        parStatut: {},
        parJobStatus: {},
        topClients: [],
        topProfils: [],
      });
    });

    it('applique count = 0 par défaut pour les éléments de topClients et topProfils', () => {
      const raw = {
        topClients: [
          { company: 'Sopra Steria' } as Partial<{ company: string; count: number }> as {
            company: string;
            count: number;
          },
        ],
        topProfils: [
          { title: 'Data Engineer' } as Partial<{ title: string; count: number }> as {
            title: string;
            count: number;
          },
        ],
      } as Partial<JobPostStats> as JobPostStats;

      const result = DashboardMapper.toJobPostStats(raw);

      expect(result.topClients).toEqual([{ company: 'Sopra Steria', count: 0 }]);
      expect(result.topProfils).toEqual([{ title: 'Data Engineer', count: 0 }]);
    });

    it('retourne des tableaux vides si topClients et topProfils sont absents', () => {
      const raw = {
        total: 1,
        bruts: 1,
        unifies: 0,
        parStatut: {},
        parJobStatus: {},
      } as Partial<JobPostStats> as JobPostStats;

      const result = DashboardMapper.toJobPostStats(raw);

      expect(result.topClients).toEqual([]);
      expect(result.topProfils).toEqual([]);
    });
  });

  describe('toResumeStats', () => {
    it('mappe correctement des données complètes', () => {
      const raw: ResumeStats = {
        total: 30,
        bruts: 20,
        unifies: 10,
      };

      const result = DashboardMapper.toResumeStats(raw);

      expect(result).toEqual(raw);
    });

    it('applique les valeurs par défaut quand les champs sont absents', () => {
      const raw = {} as Partial<ResumeStats> as ResumeStats;

      const result = DashboardMapper.toResumeStats(raw);

      expect(result).toEqual({
        total: 0,
        bruts: 0,
        unifies: 0,
      });
    });
  });

  describe('toEvaluationStats', () => {
    it('mappe correctement des données complètes', () => {
      const raw: EvaluationStats = {
        total: 15,
        enCours: 5,
        validees: 8,
        rejetees: 2,
      };

      const result = DashboardMapper.toEvaluationStats(raw);

      expect(result).toEqual(raw);
    });

    it('applique les valeurs par défaut quand les champs sont absents', () => {
      const raw = {} as Partial<EvaluationStats> as EvaluationStats;

      const result = DashboardMapper.toEvaluationStats(raw);

      expect(result).toEqual({
        total: 0,
        enCours: 0,
        validees: 0,
        rejetees: 0,
      });
    });
  });
});
