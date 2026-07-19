import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  OnChanges,
  SimpleChanges,
  inject,
  input,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../../../../core/icons/components/icon.component';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';
import { EvaluationInvitation } from '../../models/evaluation-invitation/evaluation-invitation.model';
import { EvaluationInvitationsService } from '../../services/evaluation-invitations/evaluation-invitations.service';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

@Component({
  selector: 'app-invitation-history-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './invitation-history-modal.component.html',
})
export class InvitationHistoryModalComponent implements OnChanges {
  @Input() resumeFileId!: string;
  @Input() candidateName = '';
  @Input() evaluations: TechnicalEvaluation[] = [];
  @Input() filterByEvaluationId: number | null = null;
  @Input() canDelete = false;
  @Input() canViewGitRepo = false;
  @Input() codeEvaluations = new Map<number, CandidateCodeEvaluation>();
  @Input() quizResults = new Map<number, CandidateQuizResult>();
  @Input() evaluatingInvitationId: number | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() invitationDeleted = new EventEmitter<number>();
  @Output() evaluate = new EventEmitter<number>();
  @Output() openCodeEval = new EventEmitter<number>();
  @Output() openQuizResult = new EventEmitter<number>();

  private readonly invitationsService = inject(EvaluationInvitationsService);
  readonly evaluation = input.required<TechnicalEvaluation | null>();
  readonly invitations = signal<EvaluationInvitation[]>([]);
  readonly loading = signal(false);
  readonly openActionMenuId = signal<number | null>(null);
  readonly isQuizEvaluation = computed(() => !!this.evaluation()?.quizContent);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resumeFileId'] && this.resumeFileId) {
      this.loadHistory();
    }
  }

  private loadHistory(): void {
    this.loading.set(true);
    this.invitations.set([]);

    this.invitationsService.getByResume(this.resumeFileId).subscribe({
      next: (data) => {
        const filtered = this.filterByEvaluationId
          ? data.filter((inv) => inv.evaluationId === this.filterByEvaluationId)
          : data;
        this.invitations.set(filtered);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleActionMenu(invitationId: number, event: Event): void {
    event.stopPropagation();
    const current = this.openActionMenuId();
    this.openActionMenuId.set(current === invitationId ? null : invitationId);
  }

  deleteInvitation(invitationId: number): void {
    if (!confirm('Voulez-vous vraiment supprimer cette invitation ?')) return;

    this.invitationsService.delete(invitationId).subscribe({
      next: () => {
        this.invitations.set(this.invitations().filter((inv) => inv.id !== invitationId));
        this.openActionMenuId.set(null);
        this.invitationDeleted.emit(invitationId);
      },
      error: () => console.error('Erreur suppression'),
    });
  }

  getEvaluationTitle(evaluationId: number): string {
    return this.evaluations.find((e) => e.id === evaluationId)?.title ?? '—';
  }

  isExpired(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  }

  close(): void {
    this.openActionMenuId.set(null);
    this.closeModal.emit();
  }
}
