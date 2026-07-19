import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';
import { QuizAiFeedback } from '../../models/technical-evaluation/technical-evaluation.model';

@Component({
  selector: 'app-quiz-result-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-result-modal.component.html',
})
export class QuizResultModalComponent {
  readonly quizResult = input.required<CandidateQuizResult>();
  readonly close = output<void>();

  parseAiFeedback(json: string | null): QuizAiFeedback | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as QuizAiFeedback;
    } catch {
      return null;
    }
  }
}
