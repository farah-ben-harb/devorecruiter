import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';
import { EvaluationInvitation } from '../../models/evaluation-invitation/evaluation-invitation.model';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';
import { AppIconComponent } from '../../../../core/icons/components/icon.component';

@Component({
  selector: 'app-candidate-repositories-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, AppIconComponent],
  templateUrl: './candidate-repositories-modal.component.html',
})
export class CandidateRepositoriesModalComponent {
  // ✅ PAS de required: true avec null - utilise valeur par défaut null
  @Input() evaluation: TechnicalEvaluation | null = null;
  @Input() invitees: EvaluationInvitation[] = [];
  @Input() loadingInvitees = false;
  @Input() codeEvaluations = new Map<number, CandidateCodeEvaluation>();
  @Input() quizResults = new Map<number, CandidateQuizResult>();
  @Input() evaluatingInvitationId: number | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() evaluate = new EventEmitter<number>();
  @Output() openCodeEval = new EventEmitter<number>();
  @Output() openQuizResult = new EventEmitter<number>();

  // ✅ Méthode simple - pas de computed()
  isQuizEvaluation(): boolean {
    return !!this.evaluation?.quizContent;
  }

  isExpired(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toDateString());
  }
}
