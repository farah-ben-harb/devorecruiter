import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';

@Component({
  selector: 'app-code-eval-result-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './code-evaluation-result-modal.component.html',
})
export class CodeEvalResultModalComponent {
  readonly codeEval = input.required<CandidateCodeEvaluation>();
  readonly close = output<void>();
}
