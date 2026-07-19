import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AppIconComponent } from '@app/core/icons/components/icon.component';
import { JobPostService } from '../../../job-posts/services/job-posts.service';
import { ResumeListItem } from '../../../candidates/models/candidate.model';
import { PostApiResponse, UploadedFile } from '../../../job-posts/models/job-post.model';
import { TechnicalEvaluation } from '@app/modules/technical-evaluations/models/technical-evaluation/technical-evaluation.model';
import { EvaluationInvitationsService } from '@app/modules/technical-evaluations/services/evaluation-invitations/evaluation-invitations.service';
import { TechnicalEvaluationService } from '@app/modules/technical-evaluations/services/technical-evaluations/technical-evaluation.service';
import { EvaluationInvitation } from '@app/modules/technical-evaluations/models/evaluation-invitation/evaluation-invitation.model';
import { Router } from '@angular/router';
import { InvitationHistoryModalComponent } from '@app/modules/technical-evaluations/components/invitation-history-modal/invitation-history-modal.component';
import { CandidateCodeEvaluation } from '@app/modules/technical-evaluations/models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateQuizResult } from '@app/modules/technical-evaluations/models/candidate-quiz-result/candidate-quiz-result.model';
import { CandidateQuizService } from '@app/modules/technical-evaluations/services/candidate-quiz/candidate-quiz.service';
import { CandidateCodeEvaluationService } from '@app/modules/technical-evaluations/services/candidates-code-evaluation/candidate-code-evaluation.service';
import { HttpErrorResponse } from '@angular/common/http';

export type JobPostFilter = 'all' | 'invited' | 'not-invited';

@Component({
  selector: 'app-send-evaluation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent, InvitationHistoryModalComponent],
  templateUrl: './send-evaluation-modal.component.html',
})
export class SendEvaluationModalComponent implements OnInit {
  @Input() candidate!: ResumeListItem;
  @Output() close = new EventEmitter<void>();
  @Output() sent = new EventEmitter<void>();

  private readonly jobPostService = inject(JobPostService);
  private readonly evalService = inject(TechnicalEvaluationService);
  private readonly invitationsService = inject(EvaluationInvitationsService);
  private readonly codeEvalService = inject(CandidateCodeEvaluationService);
  private readonly quizResultService = inject(CandidateQuizService);
  private readonly router = inject(Router);

  // ── Step 1 ────────────────────────────────────────────────────────────────
  readonly step = signal<1 | 2>(1);
  readonly jobPosts = signal<UploadedFile[]>([]);
  readonly loadingJobPosts = signal(false);
  readonly selectedJobPost = signal<UploadedFile | null>(null);
  readonly jobPostFilter = signal<JobPostFilter>('all');
  readonly existingInvitations = signal<EvaluationInvitation[]>([]);
  readonly loadingInvitations = signal(false);

  // ── Step 2 ────────────────────────────────────────────────────────────────
  readonly evalMode = signal<'coding' | 'quiz'>('coding');
  readonly evalFilter = signal<'all' | 'sent' | 'not-sent'>('all');
  readonly allEvaluations = signal<TechnicalEvaluation[]>([]);
  readonly loadingEvaluations = signal(false);
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly dueDate = signal('');
  readonly sending = signal(false);
  readonly sendResults = signal<{ title: string; success: boolean; error?: string }[]>([]);
  readonly allSent = signal(false);
  readonly error = signal<string | null>(null);

  // ── History modal ─────────────────────────────────────────────────────────
  readonly showHistoryModal = signal(false);
  readonly historyEvaluation = signal<TechnicalEvaluation | null>(null);
  readonly historyEvaluations = signal<TechnicalEvaluation[]>([]);
  readonly historyFilterByEvaluationId = signal<number | null>(null);
  readonly codeEvaluations = signal<Map<number, CandidateCodeEvaluation>>(new Map());
  readonly quizResults = signal<Map<number, CandidateQuizResult>>(new Map());
  readonly evaluatingInvitationId = signal<number | null>(null);

  // ── Modals résultats ──────────────────────────────────────────────────────
  readonly showCodeEvalModal = signal(false);
  readonly selectedCodeEval = signal<CandidateCodeEvaluation | null>(null);
  readonly showQuizResultModal = signal(false);
  readonly selectedQuizResult = signal<CandidateQuizResult | null>(null);

  ngOnInit(): void {
    this.loadJobPosts();
    this.loadExistingInvitations();
  }

  // ── Invitations helpers ───────────────────────────────────────────────────

  loadExistingInvitations(): void {
    const driveId = this.candidate.driveId;
    if (!driveId) return;
    this.loadingInvitations.set(true);
    this.invitationsService.findByResumeFileId(driveId).subscribe({
      next: (invitations) => {
        this.existingInvitations.set(invitations);
        this.loadingInvitations.set(false);
      },
      error: () => this.loadingInvitations.set(false),
    });
  }

  invitedJobPostIds(): Set<number> {
    return new Set(this.existingInvitations().map((i) => i.jobPostId));
  }

  isJobPostInvited(jobPostId: string | undefined): boolean {
    if (!jobPostId) return false;
    return this.invitedJobPostIds().has(+jobPostId);
  }

  invitationsForSelectedJobPost(): EvaluationInvitation[] {
    const jp = this.selectedJobPost();
    if (!jp?.id) return [];
    return this.existingInvitations().filter((i) => i.jobPostId === +jp.id!);
  }

  alreadySentEvaluationIds(): Set<number> {
    return new Set(this.invitationsForSelectedJobPost().map((i) => i.evaluationId));
  }

  isEvaluationAlreadySent(evalId: number): boolean {
    return this.alreadySentEvaluationIds().has(evalId);
  }

  // ── Filtre fiches de poste ────────────────────────────────────────────────

  setJobPostFilter(f: JobPostFilter): void {
    this.jobPostFilter.set(f);
  }

  filteredJobPosts(): UploadedFile[] {
    const all = this.jobPosts();
    const filter = this.jobPostFilter();
    if (filter === 'invited') return all.filter((jp) => this.isJobPostInvited(jp.id));
    if (filter === 'not-invited') return all.filter((jp) => !this.isJobPostInvited(jp.id));
    return all;
  }

  invitedCount(): number {
    return this.jobPosts().filter((jp) => this.isJobPostInvited(jp.id)).length;
  }
  notInvitedCount(): number {
    return this.jobPosts().filter((jp) => !this.isJobPostInvited(jp.id)).length;
  }

  // ── Filtre évaluations (step 2) ───────────────────────────────────────────

  filteredEvaluations(): TechnicalEvaluation[] {
    const mode = this.evalMode();
    const filter = this.evalFilter();
    let base = this.allEvaluations().filter((e) => e.status === 'approved');
    if (mode === 'quiz') base = base.filter((e) => e.quizContent != null);
    else base = base.filter((e) => e.quizContent == null);
    if (filter === 'sent') return base.filter((e) => this.isEvaluationAlreadySent(e.id));
    if (filter === 'not-sent') return base.filter((e) => !this.isEvaluationAlreadySent(e.id));
    return base;
  }

  codingCount(): number {
    return this.allEvaluations().filter((e) => e.quizContent == null && e.status === 'approved')
      .length;
  }
  quizCount(): number {
    return this.allEvaluations().filter((e) => e.quizContent != null && e.status === 'approved')
      .length;
  }
  alreadySentCodingCount(): number {
    return this.filteredEvaluations().filter(
      (e) => e.quizContent == null && this.isEvaluationAlreadySent(e.id),
    ).length;
  }
  alreadySentQuizCount(): number {
    return this.filteredEvaluations().filter(
      (e) => e.quizContent != null && this.isEvaluationAlreadySent(e.id),
    ).length;
  }

  // ── Sélection ─────────────────────────────────────────────────────────────

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelection(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  toggleSelectAll(): void {
    const selectable = this.filteredEvaluations().filter(
      (ev) => !this.isEvaluationAlreadySent(ev.id),
    );
    const allSelected = selectable.length > 0 && selectable.every((e) => this.isSelected(e.id));
    const next = new Set(this.selectedIds());
    if (allSelected) selectable.forEach((e) => next.delete(e.id));
    else selectable.forEach((e) => next.add(e.id));
    this.selectedIds.set(next);
  }

  isAllSelected(): boolean {
    const filtered = this.filteredEvaluations();
    return filtered.length > 0 && filtered.every((e) => this.isSelected(e.id));
  }

  isIndeterminate(): boolean {
    const filtered = this.filteredEvaluations();
    const selectedInFilter = filtered.filter((e) => this.isSelected(e.id)).length;
    return selectedInFilter > 0 && selectedInFilter < filtered.length;
  }

  selectedCount(): number {
    return this.selectedIds().size;
  }

  // ── Step 1 ────────────────────────────────────────────────────────────────

  private loadJobPosts(): void {
    this.loadingJobPosts.set(true);
    this.jobPostService.getAll(1, 999, undefined, 'unified').subscribe({
      next: (res) => {
        this.jobPosts.set(res.data.map((d) => this.mapToUploadedFile(d)));
        this.loadingJobPosts.set(false);
      },
      error: () => this.loadingJobPosts.set(false),
    });
  }

  selectJobPost(jobPost: UploadedFile): void {
    this.selectedJobPost.set(jobPost);
    this.step.set(2);
    this.loadAllEvaluations(+jobPost.id!);
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  setEvalMode(mode: 'coding' | 'quiz'): void {
    this.evalMode.set(mode);
    this.evalFilter.set('all');
    this.selectedIds.set(new Set());
  }

  private loadAllEvaluations(jobPostId: number): void {
    this.loadingEvaluations.set(true);
    this.allEvaluations.set([]);
    this.selectedIds.set(new Set());
    forkJoin({
      coding: this.evalService.findAll(jobPostId, 'coding'),
      quiz: this.evalService.findAll(jobPostId, 'quiz'),
    }).subscribe({
      next: ({ coding, quiz }) => {
        const taggedCoding = coding.map((e) => ({ ...e, quizContent: null as null }));
        const taggedQuiz = quiz.map((e) => ({
          ...e,
          quizContent: (e.quizContent ?? 'quiz') as string,
        }));
        this.allEvaluations.set([...taggedCoding, ...taggedQuiz]);
        this.loadingEvaluations.set(false);
      },
      error: () => this.loadingEvaluations.set(false),
    });
  }

  goBack(): void {
    this.step.set(1);
    this.selectedJobPost.set(null);
    this.allEvaluations.set([]);
    this.selectedIds.set(new Set());
    this.evalFilter.set('all');
    this.error.set(null);
    this.allSent.set(false);
    this.sendResults.set([]);
    this.dueDate.set('');
  }

  minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ── Envoi ─────────────────────────────────────────────────────────────────

  async send(): Promise<void> {
    const jp = this.selectedJobPost();
    const ids = Array.from(this.selectedIds());
    if (!jp || ids.length === 0 || !this.dueDate()) {
      this.error.set("Veuillez sélectionner au moins une évaluation et une date d'échéance.");
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.sendResults.set([]);
    const evaluations = this.allEvaluations().filter((e) => ids.includes(e.id));
    const results: { title: string; success: boolean; error?: string }[] = [];
    for (const ev of evaluations) {
      try {
        await this.invitationsService
          .send({
            evaluationId: ev.id,
            jobPostId: +jp.id!,
            dueDate: this.dueDate(),
            scoringResumeIds: [],
            unscoredResumeIds: [this.candidate.driveId],
          })
          .toPromise();
        results.push({ title: ev.title, success: true });
      } catch (err) {
        const error = err as HttpErrorResponse;
        results.push({
          title: ev.title,
          success: false,
          error: error?.error?.message ?? 'Erreur inconnue',
        });
      }
    }
    this.sendResults.set(results);
    this.sending.set(false);
    this.allSent.set(true);
    this.loadExistingInvitations();
    if (results.every((r) => r.success)) setTimeout(() => this.sent.emit(), 2000);
  }

  // ── History modal ─────────────────────────────────────────────────────────

  openHistoryForEvaluation(ev: TechnicalEvaluation): void {
    // Reset maps
    this.codeEvaluations.set(new Map());
    this.quizResults.set(new Map());
    this.evaluatingInvitationId.set(null);

    this.historyEvaluation.set(ev);
    this.historyEvaluations.set(this.allEvaluations());
    this.historyFilterByEvaluationId.set(ev.id);
    this.showHistoryModal.set(true);

    // Charger les résultats existants pour les invitations de cette éval
    const isQuiz = !!ev.quizContent;
    const invForEval = this.existingInvitations().filter((i) => i.evaluationId === ev.id);

    invForEval.forEach((inv) => {
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
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.historyEvaluation.set(null);
    this.historyFilterByEvaluationId.set(null);
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private mapToUploadedFile(data: PostApiResponse): UploadedFile {
    return {
      id: data.id?.toString(),
      name: data.name ?? 'Sans nom',
      type: data.type ?? 'application/vnd.google-apps.document',
      isDriveFile: true,
      isLoading: false,
      url: data.url ?? '',
      googleDocId: data.googleDocId ?? data.generatedDocId ?? data.document_id,
      driveFileId: data.googleDriveFileId,
      status: data.status ?? 'raw',
      unifiedUrl: data.unifiedUrl,
      company: data.company,
      startDate: data.startDate,
      title: data.title,
      hasEvaluation: data.hasEvaluation ?? false,
      requiresCoding: data.requiresCoding ?? null,
      hasQcm: data.hasQcm ?? null,
      jobStatus: data.jobStatus ?? null,
      linkedCandidateIds: data.linkedCandidateIds ?? [],
    };
  }

  goToCreateEvaluation(): void {
    const jp = this.selectedJobPost();
    if (!jp) return;
    this.close.emit();
    this.router.navigate(['/technical-evaluations'], {
      queryParams: { jobPostId: jp.id, company: jp.company ?? '', mode: 'coding' },
    });
  }

  goToCreateQuiz(): void {
    const jp = this.selectedJobPost();
    if (!jp) return;
    this.close.emit();
    this.router.navigate(['/technical-evaluations'], {
      queryParams: { jobPostId: jp.id, company: jp.company ?? '', mode: 'quiz' },
    });
  }

  setEvalFilter(f: 'all' | 'sent' | 'not-sent'): void {
    this.evalFilter.set(f);
    this.selectedIds.set(new Set());
  }

  evalSentCount(): number {
    const mode = this.evalMode();
    const base = this.allEvaluations().filter(
      (e) =>
        e.status === 'approved' &&
        (mode === 'quiz' ? e.quizContent != null : e.quizContent == null),
    );
    return base.filter((e) => this.isEvaluationAlreadySent(e.id)).length;
  }

  evalNotSentCount(): number {
    const mode = this.evalMode();
    const base = this.allEvaluations().filter(
      (e) =>
        e.status === 'approved' &&
        (mode === 'quiz' ? e.quizContent != null : e.quizContent == null),
    );
    return base.filter((e) => !this.isEvaluationAlreadySent(e.id)).length;
  }

  evalTotalCount(): number {
    const mode = this.evalMode();
    return this.allEvaluations().filter(
      (e) =>
        e.status === 'approved' &&
        (mode === 'quiz' ? e.quizContent != null : e.quizContent == null),
    ).length;
  }
}
