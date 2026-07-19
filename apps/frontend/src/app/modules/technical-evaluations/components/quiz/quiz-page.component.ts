import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CandidateQuizService } from '../../services/candidate-quiz/candidate-quiz.service';
import {
  QuizPublicView,
  QuizSubmitResult,
  QuizQuestionPublic,
  QuizAnswerItem,
  QuizAiFeedback,
} from '../../models/technical-evaluation/technical-evaluation.model';
type QuizStep = 'loading' | 'error' | 'intro' | 'questions' | 'submitting' | 'result';

@Component({
  selector: 'app-quiz-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quiz-page.component.html',
})
export class QuizPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly quizService = inject(CandidateQuizService);

  readonly step = signal<QuizStep>('loading');
  readonly errorMessage = signal<string>('');
  readonly quiz = signal<QuizPublicView | null>(null);
  readonly currentIndex = signal(0);
  readonly answers = signal<Map<number, string>>(new Map());
  readonly result = signal<QuizSubmitResult | null>(null);
  readonly startTime = signal<number>(0);

  readonly currentQuestion = computed<QuizQuestionPublic | null>(() => {
    const q = this.quiz();
    const i = this.currentIndex();
    return q ? (q.questions[i] ?? null) : null;
  });

  readonly progress = computed(() => {
    const q = this.quiz();
    if (!q) return 0;
    return Math.round(((this.currentIndex() + 1) / q.questions.length) * 100);
  });

  readonly isAnswered = computed(() => {
    const q = this.currentQuestion();
    return q ? this.answers().has(q.id) : false;
  });

  readonly isLast = computed(() => {
    const q = this.quiz();
    return q ? this.currentIndex() === q.questions.length - 1 : false;
  });

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.step.set('error');
      this.errorMessage.set('Lien invalide.');
      return;
    }

    this.quizService.getQuizByToken(token).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        this.step.set('intro');
      },
      error: (err) => {
        this.step.set('error');
        this.errorMessage.set(err.error?.message ?? 'Lien invalide ou expiré.');
      },
    });
  }

  startQuiz(): void {
    this.step.set('questions');
    this.startTime.set(Date.now());
  }

  selectAnswer(questionId: number, option: string): void {
    const next = new Map(this.answers());
    next.set(questionId, option);
    this.answers.set(next);
  }

  isSelected(questionId: number, option: string): boolean {
    return this.answers().get(questionId) === option;
  }

  next(): void {
    if (!this.isAnswered()) return;
    if (this.isLast()) {
      this.submit();
    } else {
      this.currentIndex.update((i) => i + 1);
    }
  }

  prev(): void {
    this.currentIndex.update((i) => Math.max(0, i - 1));
  }

  private submit(): void {
    const token = this.route.snapshot.paramMap.get('token')!;
    const quiz = this.quiz()!;
    const durationSeconds = Math.round((Date.now() - this.startTime()) / 1000);

    const answers: QuizAnswerItem[] = quiz.questions.map((q) => ({
      questionId: q.id,
      answer: this.answers().get(q.id) ?? '',
    }));

    this.step.set('submitting');
    this.quizService.submitQuiz(token, { answers, durationSeconds }).subscribe({
      next: (result) => {
        this.result.set(result);
        this.step.set('result');
      },
      error: (err) => {
        this.step.set('error');
        this.errorMessage.set(err.error?.message ?? 'Erreur lors de la soumission.');
      },
    });
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getDifficultyLabel(d: string): string {
    return d === 'easy' ? 'Facile' : d === 'medium' ? 'Moyen' : 'Difficile';
  }

  getDifficultyClass(d: string): string {
    return d === 'easy'
      ? 'bg-green-100 text-green-700'
      : d === 'medium'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700';
  }

  parseAiFeedback(result: QuizSubmitResult): QuizAiFeedback {
    return result.aiFeedback;
  }
}
