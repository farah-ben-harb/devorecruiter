import { Injectable, signal, computed, inject } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';
import { RoleService } from '@shared/services/roles/role.service';
import {
  UserStats,
  JobPostStats,
  ResumeStats,
  EvaluationStats,
  DashboardStats,
  ReferentEvaluationStats,
  ReferentInvitationStats,
  ActivityPoint,
  PendingEvaluation,
  ConsultantStats,
  ConsultantActivityPoint,
  ConsultantHourlyPoint,
  RecentConversation,
  ConsultantDomainStats,
} from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private readonly dashboardService = inject(DashboardService);
  private readonly roleService = inject(RoleService);

  private readonly _stats = signal<DashboardStats>({});
  private readonly _loadingUsers = signal(false);
  private readonly _loadingJobs = signal(false);
  private readonly _loadingResumes = signal(false);
  private readonly _loadingEvals = signal(false);
  private readonly _loadingReferentEvals = signal(false);
  private readonly _loadingReferentInvitations = signal(false);
  private readonly _loadingReferentActivity = signal(false);
  private readonly _loadingPending = signal(false);
  private readonly _error = signal<string | null>(null);

  // ── Référent signals ──────────────────────────────────────────────────
  readonly referentEvaluationStats = signal<ReferentEvaluationStats | null>(null);
  readonly referentInvitationStats = signal<ReferentInvitationStats | null>(null);
  readonly referentActivity = signal<ActivityPoint[]>([]);
  readonly pendingEvaluations = signal<PendingEvaluation[]>([]);

  readonly consultantStats = signal<ConsultantStats | null>(null);
  readonly consultantActivity = signal<ConsultantActivityPoint[]>([]);
  readonly consultantHourlyActivity = signal<ConsultantHourlyPoint[]>([]);
  readonly recentConversations = signal<RecentConversation[]>([]);
  readonly consultantDomainStats = signal<ConsultantDomainStats | null>(null);

  private readonly _loadingConsultantStats = signal(false);
  private readonly _loadingConsultantActivity = signal(false);
  private readonly _loadingConsultantHourly = signal(false);
  private readonly _loadingRecentConversations = signal(false);
  private readonly _loadingConsultantDomains = signal(false);
  readonly error = this._error.asReadonly();
  readonly loading = computed(
    () =>
      this._loadingUsers() ||
      this._loadingJobs() ||
      this._loadingResumes() ||
      this._loadingEvals() ||
      this._loadingReferentEvals() ||
      this._loadingReferentInvitations() ||
      this._loadingReferentActivity() ||
      this._loadingPending() ||
      this._loadingConsultantStats() ||
      this._loadingConsultantActivity() ||
      this._loadingConsultantHourly() ||
      this._loadingRecentConversations() ||
      this._loadingConsultantDomains(),
  );

  readonly userStats = computed(() => this._stats().users ?? null);
  readonly jobPostStats = computed(() => this._stats().jobPosts ?? null);
  readonly resumeStats = computed(() => this._stats().resumes ?? null);
  readonly evaluationStats = computed(() => this._stats().evaluations ?? null);

  loadAll(): void {
    const isAdmin = this.roleService.hasRole('ADMIN_RH');
    const isRecruiter = this.roleService.hasRole('TALENT_ACQUISITION');
    const isReferent = this.roleService.hasRole('TECHNICAL_REFERENT');
    const isConsultant = this.roleService.hasRole('CONSULTANT');

    if (isAdmin) {
      this.loadUserStats();
      this.loadEvaluationStats();
      this.loadJobPostStats();
      this.loadResumeStats();
      this.loadReferentEvaluationStats();
      this.loadReferentInvitationStats();
      this.loadReferentActivity();
      this.loadPendingEvaluations();
      this.loadConsultantStats();
      this.loadConsultantActivity();
      this.loadConsultantHourlyActivity();
      this.loadRecentConversations();
      this.loadConsultantDomainStats();
    }

    if (isRecruiter) {
      this.loadJobPostStats();
      this.loadResumeStats();
      this.loadEvaluationStats();
      this.loadPendingEvaluations();
      this.loadReferentInvitationStats();
    }

    if (isReferent) {
      this.loadJobPostStats();
      this.loadEvaluationStats();
      this.loadReferentEvaluationStats();
      this.loadReferentInvitationStats();
      this.loadReferentActivity();
      this.loadPendingEvaluations();
    }

    if (isConsultant) {
      this.loadConsultantStats();
      this.loadConsultantActivity();
      this.loadConsultantHourlyActivity();
      this.loadRecentConversations();
      this.loadConsultantDomainStats();
    }
  }

  loadUserStats(): void {
    if (this._stats().users) return;
    this._loadingUsers.set(true);
    this.dashboardService.getUserStats().subscribe({
      next: (data: UserStats) => {
        this._stats.update((s) => ({ ...s, users: data }));
        this._loadingUsers.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingUsers.set(false);
      },
    });
  }

  loadJobPostStats(): void {
    if (this._stats().jobPosts) return;
    this._loadingJobs.set(true);
    this.dashboardService.getJobPostStats().subscribe({
      next: (data: JobPostStats) => {
        this._stats.update((s) => ({ ...s, jobPosts: data }));
        this._loadingJobs.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingJobs.set(false);
      },
    });
  }

  loadResumeStats(): void {
    if (this._stats().resumes) return;
    this._loadingResumes.set(true);
    this.dashboardService.getResumeStats().subscribe({
      next: (data: ResumeStats) => {
        this._stats.update((s) => ({ ...s, resumes: data }));
        this._loadingResumes.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingResumes.set(false);
      },
    });
  }

  loadEvaluationStats(): void {
    if (this._stats().evaluations) return;
    this._loadingEvals.set(true);
    this.dashboardService.getEvaluationStats().subscribe({
      next: (data: EvaluationStats) => {
        this._stats.update((s) => ({ ...s, evaluations: data }));
        this._loadingEvals.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingEvals.set(false);
      },
    });
  }

  // ── Référent ──────────────────────────────────────────────────────────

  loadReferentEvaluationStats(): void {
    if (this.referentEvaluationStats()) return;
    this._loadingReferentEvals.set(true);
    this.dashboardService.getReferentEvaluationStats().subscribe({
      next: (data: ReferentEvaluationStats) => {
        this.referentEvaluationStats.set(data);
        this._loadingReferentEvals.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingReferentEvals.set(false);
      },
    });
  }
  loadReferentInvitationStats(): void {
    if (this.referentInvitationStats()) return;
    this._loadingReferentInvitations.set(true);
    this.dashboardService.getReferentInvitationStats().subscribe({
      next: (data: ReferentInvitationStats) => {
        this.referentInvitationStats.set(data);
        this._loadingReferentInvitations.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingReferentInvitations.set(false);
      },
    });
  }

  loadReferentActivity(): void {
    if (this.referentActivity().length > 0) return;
    this._loadingReferentActivity.set(true);
    this.dashboardService.getReferentActivity().subscribe({
      next: (data: ActivityPoint[]) => {
        this.referentActivity.set(data);
        this._loadingReferentActivity.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingReferentActivity.set(false);
      },
    });
  }

  loadPendingEvaluations(): void {
    if (this.pendingEvaluations().length > 0) return;
    this._loadingPending.set(true);
    this.dashboardService.getPendingEvaluations().subscribe({
      next: (data: PendingEvaluation[]) => {
        this.pendingEvaluations.set(data);
        this._loadingPending.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingPending.set(false);
      },
    });
  }

  loadConsultantStats(): void {
    if (this.consultantStats()) return;
    this._loadingConsultantStats.set(true);
    this.dashboardService.getConsultantStats().subscribe({
      next: (data: ConsultantStats) => {
        this.consultantStats.set(data);
        this._loadingConsultantStats.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingConsultantStats.set(false);
      },
    });
  }

  loadConsultantActivity(): void {
    if (this.consultantActivity().length > 0) return;
    this._loadingConsultantActivity.set(true);
    this.dashboardService.getConsultantActivity().subscribe({
      next: (data: ConsultantActivityPoint[]) => {
        this.consultantActivity.set(data);
        this._loadingConsultantActivity.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingConsultantActivity.set(false);
      },
    });
  }

  loadConsultantHourlyActivity(): void {
    if (this.consultantHourlyActivity().length > 0) return;
    this._loadingConsultantHourly.set(true);
    this.dashboardService.getConsultantHourlyActivity().subscribe({
      next: (data: ConsultantHourlyPoint[]) => {
        this.consultantHourlyActivity.set(data);
        this._loadingConsultantHourly.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingConsultantHourly.set(false);
      },
    });
  }

  loadRecentConversations(): void {
    if (this.recentConversations().length > 0) return;
    this._loadingRecentConversations.set(true);
    this.dashboardService.getRecentConversations().subscribe({
      next: (data: RecentConversation[]) => {
        this.recentConversations.set(data);
        this._loadingRecentConversations.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingRecentConversations.set(false);
      },
    });
  }

  loadConsultantDomainStats(): void {
    if (this.consultantDomainStats()) return;
    this._loadingConsultantDomains.set(true);
    this.dashboardService.getConsultantDomainStats().subscribe({
      next: (data: ConsultantDomainStats) => {
        this.consultantDomainStats.set(data);
        this._loadingConsultantDomains.set(false);
      },
      error: (err: Error) => {
        this._error.set(err.message);
        this._loadingConsultantDomains.set(false);
      },
    });
  }
}
