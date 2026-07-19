import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MenuPosition,
  TechnicalEvaluation,
} from '../../models/technical-evaluation/technical-evaluation.model';
import { AppIconComponent } from '../../../../core/icons/components/icon.component';

@Component({
  selector: 'app-evaluation-actions-menu',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './evaluation-actions-menu.component.html',
})
export class EvaluationActionsMenuComponent {
  readonly evaluation = input.required<TechnicalEvaluation>();
  readonly menuPosition = input.required<MenuPosition>();
  readonly approving = input<number | null>(null);

  // Permissions
  readonly canEdit = input<boolean>(false);
  readonly canApprove = input<boolean>(false);
  readonly canDelete = input<boolean>(false);
  readonly canSendEvaluationInvitation = input<boolean>(false);
  readonly canViewInvitees = input<boolean>(false);

  // Computed
  readonly isQuiz = computed(() => {
    const ev = this.evaluation();
    return !!(ev.quizContent || ev.quizAnswerKey);
  });

  // Events
  readonly close = output<void>();
  readonly regenerate = output<TechnicalEvaluation>();
  readonly editContent = output<TechnicalEvaluation>();
  readonly download = output<TechnicalEvaluation>();
  readonly viewInvitees = output<TechnicalEvaluation>();
  readonly sendEvaluation = output<TechnicalEvaluation>();
  readonly approve = output<TechnicalEvaluation>();
  readonly reject = output<TechnicalEvaluation>();
  readonly delete = output<TechnicalEvaluation>();
}
