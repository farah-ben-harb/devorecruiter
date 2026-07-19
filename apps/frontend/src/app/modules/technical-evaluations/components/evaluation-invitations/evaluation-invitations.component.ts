import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  inject,
  signal,
  HostListener,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../../../../core/icons/components/icon.component';
import { JobPostFacade } from '../../../job-posts/state/job-posts.facade';
import { ScoringResume, DriveFile } from '../../../job-posts/models/job-post.model';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';
import {
  EvaluationInvitation,
  SendEvaluationInvitationsPayload,
} from '../../models/evaluation-invitation/evaluation-invitation.model';
import { EvaluationInvitationsService } from '../../services/evaluation-invitations/evaluation-invitations.service';
import { TechnicalEvaluationService } from '../../services/technical-evaluations/technical-evaluation.service';
import { ResumeListItem } from '../../../candidates/models/candidate.model';

import { InvitationHistoryModalComponent } from '../invitation-history-modal/invitation-history-modal.component';
import { MissingFieldsModalComponent } from '../missing-fields-modal/missing-fields-modal.component';
import { CodeEvalResultModalComponent } from '../code-evaluation-result-modal/code-evaluation-result-modal.component';
import { QuizResultModalComponent } from '../quiz-result-modal/quiz-result-modal.component';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';
import { CandidateCodeEvaluationService } from '../../services/candidates-code-evaluation/candidate-code-evaluation.service';
import { CandidateQuizService } from '../../services/candidate-quiz/candidate-quiz.service';

@Component({
  selector: 'app-evaluation-invitations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppIconComponent,
    InvitationHistoryModalComponent,
    MissingFieldsModalComponent,
    CodeEvalResultModalComponent,
    QuizResultModalComponent,
  ],
  templateUrl: './evaluation-invitations.component.html',
  providers: [JobPostFacade],
})
export class EvaluationInvitationComponent implements OnInit, OnChanges {
  @Input() jobPostId!: number;
  @Input() jobPostGoogleDriveFileId!: string;
  @Input() jobPostName!: string;
  @Input() canSendEvaluationInvitation!: boolean;
  @Input() canDelete!: boolean;
  @Input() canViewGitRepo!: boolean;
  @Input() canViewInvitees = false;
  @Input() selectedEvaluationId: number | null = null;
  @Input() candidateResumeItems: ResumeListItem[] = [];

  @Input() preselectedEvaluationForInvitees: TechnicalEvaluation | null = null;
  @Output() closePanelEvent = new EventEmitter<void>();

  private readonly facade = inject(JobPostFacade);
  private readonly invitationsService = inject(EvaluationInvitationsService);
  private readonly technicalEvaluationService = inject(TechnicalEvaluationService);
  private readonly codeEvalService = inject(CandidateCodeEvaluationService);
  private readonly quizResultService = inject(CandidateQuizService);

  readonly scorings = this.facade.scorings;
  readonly loading = this.facade.loadingScoring;
  readonly loadingAll = this.facade.loadingAll;
  readonly errorMessage = this.facade.scoringError;
  readonly showListModal = this.facade.showScoringListModal;
  readonly toastMessage = this.facade.scoringToastMessage;
  readonly toastType = this.facade.scoringToastType;

  codeEvaluations = signal<Map<number, CandidateCodeEvaluation>>(new Map());
  quizResults = signal<Map<number, CandidateQuizResult>>(new Map());
  evaluatingInvitationId = signal<number | null>(null);

  showCodeEvalModal = signal(false);
  selectedCodeEval = signal<CandidateCodeEvaluation | null>(null);
  showQuizResultModal = signal(false);
  selectedQuizResult = signal<CandidateQuizResult | null>(null);

  showEvaluationInvitationModal = signal(false);
  dueDate = signal<string>('');
  evaluations = signal<TechnicalEvaluation[]>([]);
  selectedEvaluationId_signal = signal<number | null>(null);
  loadingEvaluations = signal(false);
  sendingEvaluationInvitation = signal(false);
  invitationError = signal<string | null>(null);
  invitationSuccess = signal(false);
  selectedIds = signal<Set<number>>(new Set());
  selectedUnscoredIds = signal<Set<string>>(new Set());

  showHistoryModal = signal(false);
  historyModalResumeFileId = signal<string>('');
  historyModalCandidateName = signal<string>('');

  showMissingFieldsModal = signal(false);
  missingFieldsTarget = signal<ResumeListItem | null>(null);

  filterMode = signal<'all' | 'invited' | 'not_invited'>('all');
  invitedResumeFileIds = signal<Set<string>>(new Set());
  loadingInvited = signal(false);
  openActionMenuId = signal<number | null>(null);

  showInviteesModal = signal(false);
  inviteesForEvaluation = signal<EvaluationInvitation[]>([]);
  loadingInvitees = signal(false);
  selectedEvaluationForInvitees = signal<TechnicalEvaluation | null>(null);

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void {
    this.openActionMenuId.set(null);
  }

  ngOnInit(): void {
    this.facade.loadScoringData(this.jobPostId);
    this.facade.openScoringListModal();
    this.loadEvaluations();
    this.loadInvitedCandidates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.jobPostId) {
      this.facade.loadScoringData(this.jobPostId);
      this.loadEvaluations();
      this.loadInvitedCandidates();
    }

    const preselected = this.preselectedEvaluationForInvitees;
    if (changes['preselectedEvaluationForInvitees'] && preselected && this.canViewInvitees) {
      setTimeout(() => this.openInviteesModal(preselected), 50);
      return;
    }

    if (changes['selectedEvaluationId'] && this.selectedEvaluationId) {
      this.selectedEvaluationId_signal.set(this.selectedEvaluationId);
      this.loadInvitedCandidates();
    }
  }

  private loadEvaluations(): void {
    if (!this.jobPostId) return;
    this.loadingEvaluations.set(true);

    this.technicalEvaluationService.findByJobPost(this.jobPostId).subscribe({
      next: (data) => {
        this.evaluations.set(data);
        if (data.length === 1) this.selectedEvaluationId_signal.set(data[0].id);
        this.loadingEvaluations.set(false);
      },
      error: () => this.loadingEvaluations.set(false),
    });
  }

  loadInvitedCandidates(): void {
    if (!this.jobPostId) return;
    this.loadingInvited.set(true);

    this.invitationsService.getByJobPost(this.jobPostId).subscribe({
      next: (invitations) => {
        const selectedEvalId = this.selectedEvaluationId_signal();

        const ids = new Set<string>(
          invitations
            .filter((inv) => inv.evaluationId === selectedEvalId)
            .map((inv) => inv.candidateResumeFileId)
            .filter((id): id is string => !!id),
        );
        this.invitedResumeFileIds.set(ids);
        this.loadingInvited.set(false);
      },
      error: () => this.loadingInvited.set(false),
    });
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelection(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  isAllSelected(): boolean {
    const scored = this.scorings();
    return scored.length > 0 && scored.every((s) => this.selectedIds().has(s.id));
  }

  isIndeterminate(): boolean {
    const n = this.selectedIds().size;
    return n > 0 && n < this.scorings().length;
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.scorings().map((s) => s.id)));
    }
  }

  isUnscoredSelected(id: string): boolean {
    return this.selectedUnscoredIds().has(id);
  }

  toggleUnscoredSelection(id: string): void {
    const next = new Set(this.selectedUnscoredIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedUnscoredIds.set(next);
  }

  selectedCount(): number {
    return this.selectedIds().size + this.selectedUnscoredIds().size;
  }

  openEvaluationInvitationModal(): void {
    this.invitationError.set(null);
    this.invitationSuccess.set(false);
    this.dueDate.set('');
    this.selectedEvaluationId_signal.set(
      this.selectedEvaluationId ??
        (this.evaluations().length > 0 ? this.evaluations()[0].id : null),
    );
    this.showEvaluationInvitationModal.set(true);
  }

  closeEvaluationInvitationModal(): void {
    this.showEvaluationInvitationModal.set(false);
  }

  onDueDateChange(value: string): void {
    this.dueDate.set(value);
  }

  sendEvaluationInvitations(): void {
    const evaluationId = this.selectedEvaluationId_signal();
    const scoringResumeIds = Array.from(this.selectedIds());
    const unscoredResumeIds = Array.from(this.selectedUnscoredIds());

    if (!this.dueDate()) {
      this.invitationError.set("Veuillez sélectionner une date d'échéance.");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(this.dueDate()) < today) {
      this.invitationError.set("La date d'échéance ne peut pas être dans le passé.");
      return;
    }
    if (!evaluationId) {
      this.invitationError.set('Veuillez sélectionner une évaluation.');
      return;
    }
    if (scoringResumeIds.length === 0 && unscoredResumeIds.length === 0) {
      this.invitationError.set('Sélectionnez au moins un candidat.');
      return;
    }

    this.sendingEvaluationInvitation.set(true);

    const payload: SendEvaluationInvitationsPayload = {
      scoringResumeIds,
      unscoredResumeIds,
      evaluationId: Number(evaluationId),
      dueDate: this.dueDate(),
      jobPostId: this.jobPostId,
    };

    this.invitationsService.send(payload).subscribe({
      next: () => {
        this.sendingEvaluationInvitation.set(false);
        this.invitationSuccess.set(true);
        this.selectedIds.set(new Set());
        this.selectedUnscoredIds.set(new Set());
        this.loadInvitedCandidates();
      },
      error: (err: { error?: { message?: string } }) => {
        this.sendingEvaluationInvitation.set(false);
        this.invitationError.set(err?.error?.message ?? 'Erreur serveur');
      },
    });
  }

  // ── History modal ─────────────────────────────────────────────────────────

  // ── History modal ─────────────────────────────────────────────────────────

  openHistoryModal(resumeFileId: string, candidateName: string): void {
    // Reset
    this.codeEvaluations.set(new Map());
    this.quizResults.set(new Map());
    this.evaluatingInvitationId.set(null);

    this.historyModalResumeFileId.set(resumeFileId);
    this.historyModalCandidateName.set(candidateName);
    this.showHistoryModal.set(true);

    // Charger les invitations de ce candidat pour cette évaluation
    this.invitationsService.getByResume(resumeFileId).subscribe({
      next: (invitations) => {
        const filtered = invitations.filter(
          (inv) => inv.evaluationId === this.selectedEvaluationId_signal(),
        );
        const currentEval = this.evaluations().find(
          (e) => e.id === this.selectedEvaluationId_signal(),
        );
        const isQuiz = !!currentEval?.quizContent;

        filtered.forEach((inv) => {
          if (isQuiz) {
            this.quizResultService.getResultByInvitation(inv.id).subscribe({
              next: (result) => {
                if (result) {
                  const map = new Map(this.quizResults());
                  map.set(inv.id, result);
                  this.quizResults.set(map);
                }
              },
            });
          } else {
            this.codeEvalService.getByInvitation(inv.id).subscribe({
              next: (result) => {
                if (result) {
                  const map = new Map(this.codeEvaluations());
                  map.set(inv.id, result);
                  this.codeEvaluations.set(map);
                }
              },
            });
          }
        });
      },
    });
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.openActionMenuId.set(null);
  }

  /** Appelé par l'Output (invitationDeleted) du sous-composant history */
  onInvitationDeleted(): void {
    this.loadInvitedCandidates();
  }

  // ── Missing fields modal ──────────────────────────────────────────────────

  openMissingFieldsModal(resumeFileId: string): void {
    const resumeItem = this.getResumeListItem(resumeFileId);
    if (!resumeItem) return;
    this.missingFieldsTarget.set(resumeItem);
    this.showMissingFieldsModal.set(true);
  }

  closeMissingFieldsModal(): void {
    this.showMissingFieldsModal.set(false);
    this.missingFieldsTarget.set(null);
  }

  onFieldsSaved(updated: ResumeListItem): void {
    this.candidateResumeItems = this.candidateResumeItems.map((resume) =>
      resume.id === updated.id ? updated : resume,
    );
    this.closeMissingFieldsModal();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isInvited(resumeFileId: string): boolean {
    return this.invitedResumeFileIds().has(resumeFileId);
  }

  filteredScoredResumes(): ScoringResume[] {
    const mode = this.filterMode();
    const all = this.scorings();
    if (mode === 'all') return all;
    if (mode === 'invited') return all.filter((s) => this.isInvited(s.resumeFileId));
    return all.filter((s) => !this.isInvited(s.resumeFileId));
  }

  filteredUnscoredResumes(): DriveFile[] {
    const mode = this.filterMode();
    const all = this.unscoredResumes();
    if (mode === 'all') return all;
    if (mode === 'invited') return all.filter((resume) => this.isInvited(resume.id));
    return all.filter((resume) => !this.isInvited(resume.id));
  }

  isExpired(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  }

  unscoredResumes(): DriveFile[] {
    return this.facade.unscoredResumes(this.jobPostId);
  }

  minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  closeListModal(): void {
    this.facade.closeScoringListModal();
    this.closePanelEvent.emit();
  }

  scoreAllCVs(): void {
    this.facade.scoreAllCVs(this.jobPostId, {
      jobPostGoogleDriveFileId: this.jobPostGoogleDriveFileId,
      jobPostId: this.jobPostId,
    });
  }

  deleteScoringResume(event: Event, id: number): void {
    event.stopPropagation();
    const next = new Set(this.selectedIds());
    next.delete(id);
    this.selectedIds.set(next);
    this.facade.deleteScoringResume(id);
  }

  getBarColor(score: number): string {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }

  getBadgeClass(status: string): string {
    return status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getScoreCircleClass(score: number): string {
    if (score >= 70) return 'border-green-400 text-green-700 bg-green-50';
    if (score >= 40) return 'border-amber-400 text-amber-700 bg-amber-50';
    return 'border-red-400 text-red-700 bg-red-50';
  }

  openInviteesModal(evaluation: TechnicalEvaluation): void {
    this.selectedEvaluationForInvitees.set(evaluation);
    this.inviteesForEvaluation.set([]);
    this.loadingInvitees.set(true);
    this.showInviteesModal.set(true);

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

  getResumeListItem(resumeFileId: string): ResumeListItem | undefined {
    return this.candidateResumeItems.find(
      (resume) => resume.driveId === resumeFileId || resume.id === resumeFileId,
    );
  }

  hasMissingFields(resumeFileId: string): boolean {
    return this.getResumeListItem(resumeFileId)?.hasMissingFields ?? false;
  }

  onEvaluate(invitationId: number): void {
    this.evaluatingInvitationId.set(invitationId);
    this.codeEvalService.evaluate(invitationId).subscribe({
      next: (result) => {
        const map = new Map(this.codeEvaluations());
        map.set(invitationId, result);
        this.codeEvaluations.set(map);
        this.evaluatingInvitationId.set(null);
      },
      error: () => this.evaluatingInvitationId.set(null),
    });
  }

  openCodeEvalModal(invitationId: number): void {
    const result = this.codeEvaluations().get(invitationId);
    if (!result) return;
    this.selectedCodeEval.set(result);
    this.showCodeEvalModal.set(true);
  }

  closeCodeEvalModal(): void {
    this.showCodeEvalModal.set(false);
    this.selectedCodeEval.set(null);
  }

  openQuizResultModal(invitationId: number): void {
    const result = this.quizResults().get(invitationId);
    if (!result) return;
    this.selectedQuizResult.set(result);
    this.showQuizResultModal.set(true);
  }

  closeQuizResultModal(): void {
    this.showQuizResultModal.set(false);
    this.selectedQuizResult.set(null);
  }
}
