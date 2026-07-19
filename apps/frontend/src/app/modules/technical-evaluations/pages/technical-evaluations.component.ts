import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DeleteConfirmModalComponent } from '../components/delete-confirm-modal/delete-confirm-modal.component';
import { AppIconComponent } from '../../../core/icons/components/icon.component';
import {
  RegeneratePayload,
  TechnicalEvaluation,
  ToggleMenuEvent,
} from '../models/technical-evaluation/technical-evaluation.model';
import { RegenerateModalComponent } from '../components/regenerate-modal/regenerate-modal.component';
import { CandidatesFacade } from '../../candidates/state/candidates/candidates.facade';
import { EditContentModalComponent } from '../components/edit-content-modal/edit-content-modal.component';
import { TechnicalEvaluationsFacade } from '../state/technical-evaluations.facade';
import { EvaluationInvitationComponent } from '../components/evaluation-invitations/evaluation-invitations.component';
import { CandidateCodeEvaluation } from '../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateCodeEvaluationService } from '../services/candidates-code-evaluation/candidate-code-evaluation.service';
import { UiFacade } from '@app/modules/candidates/state/uis/ui.facade';
import { ResumeEvaluationFacade } from '@app/modules/candidates/state/resume-evaluations/resume-evaluations.facade';
import {
  CandidateQuizResult,
  EditContentPayload,
} from '../models/candidate-quiz-result/candidate-quiz-result.model';
import { CandidateQuizService } from '../services/candidate-quiz/candidate-quiz.service';
import { CodeEvalResultModalComponent } from '../components/code-evaluation-result-modal/code-evaluation-result-modal.component';
import { EvaluationActionsMenuComponent } from '../components/evaluation-actions-menu/evaluation-actions-menu.component';
import { EvaluationsTableComponent } from '../components/evaluations-table/evaluations-table.component';
import { QuizResultModalComponent } from '../components/quiz-result-modal/quiz-result-modal.component';
import { CandidateRepositoriesModalComponent } from '../components/candidate-repositories-modal/candidate-repositories-modal.component';

@Component({
  selector: 'app-technical-evaluations',
  standalone: true,
  imports: [
    CommonModule,
    AppIconComponent,
    RegenerateModalComponent,
    EditContentModalComponent,
    EvaluationInvitationComponent,
    DeleteConfirmModalComponent,
    EvaluationsTableComponent,
    EvaluationActionsMenuComponent,
    CandidateRepositoriesModalComponent,
    CodeEvalResultModalComponent,
    QuizResultModalComponent,
  ],
  templateUrl: './technical-evaluations.component.html',
  providers: [TechnicalEvaluationsFacade, CandidatesFacade, UiFacade, ResumeEvaluationFacade],
})
export class TechnicalEvaluationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(TechnicalEvaluationsFacade);
  private readonly candidatesFacade = inject(CandidatesFacade);
  private readonly codeEvalService = inject(CandidateCodeEvaluationService);
  private readonly quizService = inject(CandidateQuizService);

  // ── Local state ────────────────────────────────────────────────────────────
  readonly resumes = this.candidatesFacade.resumes;
  readonly codeEvaluations = signal<Map<number, CandidateCodeEvaluation>>(new Map());
  readonly quizResults = signal<Map<number, CandidateQuizResult>>(new Map());
  readonly evaluatingInvitationId = signal<number | null>(null);
  readonly showCodeEvalModal = signal(false);
  readonly activeCodeEval = signal<CandidateCodeEvaluation | null>(null);
  readonly activeQuizResult = signal<CandidateQuizResult | null>(null);
  readonly showQuizResultModal = signal(false);
  readonly showDeleteModal = signal(false);
  readonly evaluationToDelete = signal<TechnicalEvaluation | null>(null);
  readonly deleting = signal(false);
  readonly selectedEvaluationIdForScoring = signal<number | null>(null);
  readonly showScoringModal = signal(false);
  readonly selectedMenuEvaluation = signal<TechnicalEvaluation | null>(null);

  menuPosition = { top: 0, left: 0 };

  // ── Facade re-exports ──────────────────────────────────────────────────────
  readonly jobPostId = this.facade.jobPostId;
  readonly company = this.facade.company;
  readonly title = this.facade.title;
  readonly evaluations = this.facade.evaluations;
  readonly loading = this.facade.loading;
  readonly generating = this.facade.generating;
  readonly regenerating = this.facade.regenerating;
  readonly approving = this.facade.approving;
  readonly openMenuId = this.facade.openMenuId;
  readonly showRegenerateModal = this.facade.showRegenerateModal;
  readonly selectedEvaluation = this.facade.selectedEvaluation;
  readonly showEditContentModal = this.facade.showEditContentModal;
  readonly savingContent = this.facade.savingContent;
  readonly jobPostGoogleDriveFileId = this.facade.jobPostGoogleDriveFileId;
  readonly creatingGitRepo = this.facade.creatingGitRepo;
  readonly showInviteesModal = this.facade.showInviteesModal;
  readonly selectedEvaluationForInvitees = this.facade.selectedEvaluationForInvitees;
  readonly inviteesForEvaluation = this.facade.inviteesForEvaluation;
  readonly loadingInvitees = this.facade.loadingInvitees;
  readonly jobPostUnifiedDocId = this.facade.jobPostUnifiedDocId;
  readonly canGenerate = this.facade.canGenerate;
  readonly canEdit = this.facade.canEdit;
  readonly canApprove = this.facade.canApprove;
  readonly canDelete = this.facade.canDelete;
  readonly canSendEvaluationInvitation = this.facade.canSendEvaluationInvitation;
  readonly canViewGitRepo = this.facade.canViewGitRepo;
  readonly canViewInvitees = this.facade.canViewInvitees;
  readonly loadingEvaluations = this.facade.loadingEvaluations;
  readonly evaluationMode = signal<'coding' | 'quiz'>('coding');

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('jobPostId');
    const mode = (this.route.snapshot.queryParamMap.get('mode') ?? 'coding') as 'coding' | 'quiz';
    this.evaluationMode.set(mode);
    this.candidatesFacade.init();
    if (id) this.facade.init(+id, mode);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  goBack(): void {
    this.router.navigate(['/posts']);
  }

  // ── Generate ───────────────────────────────────────────────────────────────
  generateEvaluation(): void {
    this.facade.generateEvaluation(this.evaluationMode());
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  onToggleMenu(event: ToggleMenuEvent): void {
    if (this.openMenuId() === event.id) {
      this.closeMenu();
      return;
    }
    const btn = event.event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 280;
    const menuWidth = 208;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight + 8;

    this.menuPosition = {
      top: openUpward ? rect.top - menuHeight : rect.bottom + 4,
      left: rect.right - menuWidth,
    };
    const evaluation = this.evaluations().find((e) => e.id === event.id) ?? null;
    this.selectedMenuEvaluation.set(evaluation);
    this.openMenuId.set(event.id);
  }

  closeMenu(): void {
    this.facade.closeMenu();
    this.selectedMenuEvaluation.set(null);
  }

  // ── Regenerate ─────────────────────────────────────────────────────────────
  openRegenerateModal(evaluation: TechnicalEvaluation): void {
    this.facade.openRegenerateModal(evaluation);
  }

  closeRegenerateModal(): void {
    this.facade.closeRegenerateModal();
  }

  onRegenerateConfirm(payload: RegeneratePayload): void {
    this.facade.onRegenerateConfirm(payload);
  }

  // ── Edit content ───────────────────────────────────────────────────────────
  openEditContentModal(evaluation: TechnicalEvaluation): void {
    this.facade.openEditContentModal(evaluation);
  }

  closeEditContentModal(): void {
    this.facade.closeEditContentModal();
  }

  // ← SEUL CHANGEMENT ICI : payload typé EditContentPayload, délégation directe
  onEditContentConfirm(payload: EditContentPayload): void {
    this.facade.onEditContentConfirm(payload);
  }

  // ── Approve / Reject ───────────────────────────────────────────────────────
  approveEvaluation(evaluation: TechnicalEvaluation, status: 'approved' | 'rejected'): void {
    this.facade.approveEvaluation(evaluation, status);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  openDeleteModal(evaluation: TechnicalEvaluation): void {
    this.evaluationToDelete.set(evaluation);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.evaluationToDelete.set(null);
  }

  confirmDelete(): void {
    const ev = this.evaluationToDelete();
    if (!ev) return;
    this.deleting.set(true);
    this.facade.deleteEvaluation(ev);
    this.closeDeleteModal();
    this.deleting.set(false);
  }

  // ── Download ───────────────────────────────────────────────────────────────
  downloadEvaluation(evaluation: TechnicalEvaluation): void {
    this.facade.downloadEvaluation(evaluation);
  }

  // ── Scoring modal ──────────────────────────────────────────────────────────
  openScoringModal(evaluation: TechnicalEvaluation): void {
    this.selectedEvaluationIdForScoring.set(evaluation.id);
    this.showScoringModal.set(true);
  }

  closeScoringModal(): void {
    this.showScoringModal.set(false);
    this.facade.selectedEvaluationForInvitees.set(null);
    this.selectedEvaluationIdForScoring.set(null);
  }

  // ── Repositories modal ─────────────────────────────────────────────────────
  openInviteesModal(evaluation: TechnicalEvaluation): void {
    this.facade.openInviteesModal(evaluation);
    this.codeEvaluations.set(new Map());
    this.quizResults.set(new Map());

    this.codeEvalService.getByEvaluation(evaluation.id).subscribe({
      next: (results) => {
        const map = new Map<number, CandidateCodeEvaluation>();
        results.forEach((r) => map.set(r.invitationId, r));
        this.codeEvaluations.set(map);
      },
    });

    this.quizService.getResultsByEvaluation(evaluation.id).subscribe({
      next: (results) => {
        const map = new Map<number, CandidateQuizResult>();
        results.forEach((r) => map.set(r.invitationId, r));
        this.quizResults.set(map);
      },
    });
  }

  closeInviteesModal(): void {
    this.facade.closeInviteesModal();
    this.codeEvaluations.set(new Map());
    this.quizResults.set(new Map());
  }

  // ── Code evaluation ────────────────────────────────────────────────────────
  evaluateCandidateCode(invitationId: number): void {
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

  openCodeEvalDetail(invitationId: number): void {
    const result = this.codeEvaluations().get(invitationId);
    if (result) {
      this.activeCodeEval.set(result);
      this.showCodeEvalModal.set(true);
    }
  }

  closeCodeEvalModal(): void {
    this.showCodeEvalModal.set(false);
    this.activeCodeEval.set(null);
  }

  // ── Quiz result ────────────────────────────────────────────────────────────
  openQuizResultDetail(invitationId: number): void {
    const result = this.quizResults().get(invitationId);
    if (result) {
      this.activeQuizResult.set(result);
      this.showQuizResultModal.set(true);
    }
  }

  closeQuizResultModal(): void {
    this.showQuizResultModal.set(false);
    this.activeQuizResult.set(null);
  }
}
