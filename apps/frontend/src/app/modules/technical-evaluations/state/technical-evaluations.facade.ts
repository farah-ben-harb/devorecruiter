import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  RegeneratePayload,
  TechnicalEvaluation,
} from '../models/technical-evaluation/technical-evaluation.model';
import { TechnicalEvaluationService } from '../services/technical-evaluations/technical-evaluation.service';
import { JobPostService } from '../../job-posts/services/job-posts.service';
import { mapTechnicalEvaluations } from '../mappers/technical-evaluations.mapper';
import { RoleService } from '../../../shared/services/roles/role.service';
import { EvaluationInvitationsService } from '../services/evaluation-invitations/evaluation-invitations.service';
import { EvaluationInvitation } from '../models/evaluation-invitation/evaluation-invitation.model';
import { EditContentPayload } from '../models/candidate-quiz-result/candidate-quiz-result.model';

@Injectable()
export class TechnicalEvaluationsFacade implements OnDestroy {
  private readonly roleService = inject(RoleService);
  private readonly evaluationService = inject(TechnicalEvaluationService);
  private readonly jobPostService = inject(JobPostService);
  private readonly destroy$ = new Subject<void>();
  private readonly invitationsService = inject(EvaluationInvitationsService);

  private readonly MENU_HEIGHT = 320;
  private readonly MENU_WIDTH = 208;
  readonly showInviteesModal = signal(false);
  readonly inviteesForEvaluation = signal<EvaluationInvitation[]>([]);
  readonly loadingInvitees = signal(false);
  readonly selectedEvaluationForInvitees = signal<TechnicalEvaluation | null>(null);
  readonly showScoringModal = signal(false);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly jobPostId = signal<number | null>(null);
  readonly company = signal<string>('');
  readonly evaluations = signal<TechnicalEvaluation[]>([]);
  readonly loading = signal(false);
  readonly generating = signal(false);
  readonly regenerating = signal(false);
  readonly showEditContentModal = signal(false);
  readonly savingContent = signal(false);
  readonly approving = signal<number | null>(null);
  readonly title = signal<string>('');
  readonly jobPostUnifiedDocId = signal<string>('');

  readonly creatingGitRepo = signal<number | null>(null);

  readonly canGenerate = this.roleService.canGenerate();
  readonly canEdit = this.roleService.canEdit();
  readonly canApprove = this.roleService.canApprove();
  readonly canDelete = this.roleService.canDelete();
  readonly canSendEvaluationInvitation = this.roleService.canSendEvaluationInvitation();
  readonly canViewGitRepo = this.roleService.canViewGitRepo();
  readonly canViewInvitees = this.roleService.canViewInvitees();
  readonly loadingEvaluations = signal(false);
  readonly evaluationMode = signal<'coding' | 'quiz'>('coding');

  // ── Menu ───────────────────────────────────────────────────────────────────
  readonly openMenuId = signal<number | null>(null);
  menuPosition = { top: 0, left: 0 };

  // ── Modal régénération ─────────────────────────────────────────────────────
  readonly showRegenerateModal = signal(false);
  readonly selectedEvaluation = signal<TechnicalEvaluation | null>(null);
  readonly jobPostGoogleDriveFileId = signal<string>('');

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  init(jobPostId: number, mode: 'coding' | 'quiz' = 'coding'): void {
    this.jobPostId.set(jobPostId);
    this.evaluationMode.set(mode);
    this.loadJobPost(jobPostId);
    this.loadEvaluations(jobPostId, mode);
  }

  // ── Load ───────────────────────────────────────────────────────────────────
  private loadJobPost(id: number): void {
    this.loading.set(true);
    this.jobPostService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobPost) => {
          this.company.set(jobPost.company ?? 'N/A');
          this.title.set(jobPost.title ?? '');
          this.jobPostGoogleDriveFileId.set(jobPost.googleDriveFileId ?? '');
          this.jobPostUnifiedDocId.set(jobPost.googleDocId ?? jobPost.googleDriveFileId ?? '');
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
        },
      });
  }

  loadEvaluations(jobPostId: number, mode?: 'coding' | 'quiz'): void {
    this.loadingEvaluations.set(true);
    const evalMode = mode ?? this.evaluationMode();
    this.evaluationService
      .findAll(jobPostId, evalMode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.evaluations.set(mapTechnicalEvaluations(list));
          this.loadingEvaluations.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loadingEvaluations.set(false);
        },
      });
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  generateEvaluation(mode?: 'coding' | 'quiz'): void {
    const id = this.jobPostId();
    if (!id) return;
    this.generating.set(true);
    const evalMode = mode ?? this.evaluationMode();
    this.evaluationService
      .generate(id, evalMode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadEvaluations(id);
          this.generating.set(false);
        },
        error: (err) => {
          console.error(err);
          this.generating.set(false);
        },
      });
  }

  // ── Regenerate modal ───────────────────────────────────────────────────────
  openRegenerateModal(evaluation: TechnicalEvaluation): void {
    this.selectedEvaluation.set(evaluation);
    this.showRegenerateModal.set(true);
  }

  closeRegenerateModal(): void {
    this.showRegenerateModal.set(false);
    this.selectedEvaluation.set(null);
  }

  onRegenerateConfirm(payload: RegeneratePayload): void {
    const jobPostId = this.jobPostId();
    const evaluation = this.selectedEvaluation();
    if (!jobPostId || !evaluation) return;

    this.regenerating.set(true);
    this.evaluationService
      .regenerate({
        jobPostId,
        evaluationId: evaluation.id,
        prompt: payload.prompt,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadEvaluations(jobPostId);
          this.regenerating.set(false);
          this.closeRegenerateModal();
        },
        error: (err) => {
          console.error(err);
          this.regenerating.set(false);
        },
      });
  }

  // ── Approve / Reject ───────────────────────────────────────────────────────
  approveEvaluation(evaluation: TechnicalEvaluation, status: 'approved' | 'rejected'): void {
    this.approving.set(evaluation.id);
    this.evaluationService
      .approve(evaluation.id, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.evaluations.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
          this.approving.set(null);
        },
        error: (err) => {
          console.error(err);
          this.approving.set(null);
        },
      });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  deleteEvaluation(evaluation: TechnicalEvaluation): void {
    this.evaluationService
      .delete(evaluation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.evaluations.update((list) => list.filter((e) => e.id !== evaluation.id));
        },
        error: (err) => console.error('Erreur suppression:', err),
      });
  }

  // ── Download ───────────────────────────────────────────────────────────────
  downloadEvaluation(evaluation: TechnicalEvaluation): void {
    if (evaluation.driveFileUrl) window.open(evaluation.driveFileUrl, '_blank');
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  toggleMenu(id: number, event: MouseEvent): void {
    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    this.menuPosition = { top: rect.bottom + 8, left: rect.left - 160 };
    this.openMenuId.set(id);
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── Edit content modal ─────────────────────────────────────────────────────
  openEditContentModal(evaluation: TechnicalEvaluation): void {
    this.selectedEvaluation.set(evaluation);
    this.showEditContentModal.set(true);
  }

  closeEditContentModal(): void {
    this.showEditContentModal.set(false);
    this.selectedEvaluation.set(null);
  }

  onEditContentConfirm(payload: EditContentPayload): void {
    const evaluation = this.selectedEvaluation();
    const jobPostId = this.jobPostId();
    if (!evaluation || !jobPostId) return;

    this.savingContent.set(true);
    this.evaluationService
      .updateContent(evaluation.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadEvaluations(jobPostId);
          this.savingContent.set(false);
          this.closeEditContentModal();
        },
        error: (err) => {
          console.error(err);
          this.savingContent.set(false);
        },
      });
  }

  // ── Git repo ───────────────────────────────────────────────────────────────
  createGitRepo(evaluation: TechnicalEvaluation): void {
    this.creatingGitRepo.set(evaluation.id);
    this.evaluationService
      .createGitRepo(evaluation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.evaluations.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
          this.creatingGitRepo.set(null);
          alert('Repo Git créé avec succès ✅');
        },
        error: (err) => {
          console.error(err);
          this.creatingGitRepo.set(null);
        },
      });
  }

  // ── Invitees modal ─────────────────────────────────────────────────────────
  openInviteesModal(evaluation: TechnicalEvaluation): void {
    this.selectedEvaluationForInvitees.set(evaluation);
    this.inviteesForEvaluation.set([]);
    this.loadingInvitees.set(true);
    this.showInviteesModal.set(true);
    this.showScoringModal.set(true);

    this.invitationsService.getByEvaluation(evaluation.id).subscribe({
      next: (data) => {
        this.inviteesForEvaluation.set(data);
        this.loadingInvitees.set(false);
      },
      error: () => this.loadingInvitees.set(false),
    });
  }

  closeInviteesModal(): void {
    this.showInviteesModal.set(false);
    this.selectedEvaluationForInvitees.set(null);
  }
}
