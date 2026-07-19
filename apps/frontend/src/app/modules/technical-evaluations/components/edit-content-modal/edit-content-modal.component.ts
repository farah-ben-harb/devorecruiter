import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { AppIconComponent } from '@core/icons/components/icon.component';
import {
  QuizAnswerKeyItem,
  QuizContentItem,
  TechnicalEvaluation,
} from '../../models/technical-evaluation/technical-evaluation.model';
import {
  EditContentPayload,
  QuizQuestionWithAnswer,
  QuillEditor,
  QuillChangeEvent,
} from '../../models/candidate-quiz-result/candidate-quiz-result.model';

@Component({
  selector: 'app-edit-content-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule, AppIconComponent],
  templateUrl: './edit-content-modal.component.html',
})
export class EditContentModalComponent implements OnInit {
  readonly evaluation = input.required<TechnicalEvaluation>();
  readonly saving = input<boolean>(false);

  readonly close = output<void>();
  readonly confirm = output<EditContentPayload>();

  // ── State ──────────────────────────────────────────────────────────────────
  htmlContent = signal('');
  questions = signal<QuizQuestionWithAnswer[]>([]);
  changeType = signal<'minor' | 'major'>('minor');
  activeQuestionIndex = signal<number>(0);

  private quillInstance: QuillEditor | null = null;

  readonly quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ header: [1, 2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }],
      ['clean'],
    ],
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  readonly isQuiz = computed(() => {
    const ev = this.evaluation();
    return !!(ev.quizContent || ev.quizAnswerKey);
  });

  readonly minorVersion = computed(() => this.bumpVersion(this.evaluation().version, 'minor'));
  readonly majorVersion = computed(() => this.bumpVersion(this.evaluation().version, 'major'));
  readonly nextVersion = computed(() =>
    this.bumpVersion(this.evaluation().version, this.changeType()),
  );

  private bumpVersion(version: string, type: 'minor' | 'major'): string {
    const parts = version.split('.').map(Number);
    const major = parts[0] ?? 1;
    const minor = parts[1] ?? 0;
    const patch = parts[2] ?? 0;
    return type === 'major' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const ev = this.evaluation();
    if (this.isQuiz()) {
      this.initQuizEditor(ev);
    } else {
      this.htmlContent.set(ev.htmlContent ?? '');
    }
  }

  private initQuizEditor(ev: TechnicalEvaluation): void {
    try {
      const publicQuestions: QuizContentItem[] = ev.quizContent ? JSON.parse(ev.quizContent) : [];
      const answerKey: QuizAnswerKeyItem[] = ev.quizAnswerKey ? JSON.parse(ev.quizAnswerKey) : [];

      const merged = publicQuestions.map((q): QuizQuestionWithAnswer => {
        const key = answerKey.find((a) => a.id === q.id) ?? {
          id: q.id,
          correctAnswer: q.type === 'multiple_choice' ? [] : '',
          explanation: '',
        };
        return {
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options,
          domain: q.domain,
          difficulty: q.difficulty,
          correctAnswer:
            key.correctAnswer ?? key.correct_answer ?? (q.type === 'multiple_choice' ? [] : ''),
          explanation: key.explanation,
        };
      });

      this.questions.set(merged);
    } catch {
      this.questions.set([]);
    }
  }

  // ── Quill (HTML mode) ──────────────────────────────────────────────────────

  onEditorCreated(quill: QuillEditor): void {
    this.quillInstance = quill;
    const content = this.htmlContent();
    if (content) {
      setTimeout(() => quill.clipboard.dangerouslyPasteHTML(content), 0);
    }
  }

  onContentChanged(event: QuillChangeEvent): void {
    this.htmlContent.set(event.html ?? '');
  }

  // ── Quiz editing helpers ───────────────────────────────────────────────────

  setActive(index: number): void {
    this.activeQuestionIndex.set(index);
  }

  // CORRECTION: union type strict pour les champs modifiables
  updateQuestion(
    index: number,
    field:
      | 'question'
      | 'type'
      | 'domain'
      | 'difficulty'
      | 'options'
      | 'correctAnswer'
      | 'explanation',
    value:
      | string
      | string[]
      | 'single_choice'
      | 'multiple_choice'
      | 'open'
      | 'easy'
      | 'medium'
      | 'hard',
  ): void {
    const qs = [...this.questions()];
    const question = qs[index];
    if (!question) return;

    const updated: QuizQuestionWithAnswer = { ...question };

    switch (field) {
      case 'question':
        updated.question = value as string;
        break;
      case 'type':
        updated.type = value as 'single_choice' | 'multiple_choice' | 'open';
        break;
      case 'domain':
        updated.domain = value as string;
        break;
      case 'difficulty':
        updated.difficulty = value as 'easy' | 'medium' | 'hard';
        break;
      case 'options':
        updated.options = value as string[];
        break;
      case 'correctAnswer':
        updated.correctAnswer = value as string | string[];
        break;
      case 'explanation':
        updated.explanation = value as string;
        break;
    }

    qs[index] = updated;
    this.questions.set(qs);
  }

  updateOption(qIndex: number, oIndex: number, value: string): void {
    const qs = [...this.questions()];
    const options = [...(qs[qIndex].options ?? [])];
    options[oIndex] = value;
    qs[qIndex] = { ...qs[qIndex], options };
    this.questions.set(qs);
  }

  addOption(qIndex: number): void {
    const qs = [...this.questions()];
    qs[qIndex] = { ...qs[qIndex], options: [...qs[qIndex].options, ''] };
    this.questions.set(qs);
  }

  removeOption(qIndex: number, oIndex: number): void {
    const qs = [...this.questions()];
    const options = qs[qIndex].options.filter((_, i) => i !== oIndex);
    qs[qIndex] = { ...qs[qIndex], options };
    this.questions.set(qs);
  }

  toggleCorrectAnswer(qIndex: number, option: string): void {
    const qs = [...this.questions()];
    const q = qs[qIndex];

    if (q.type === 'multiple_choice') {
      const current: string[] = Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [];
      const idx = current.indexOf(option);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(option);
      qs[qIndex] = { ...q, correctAnswer: current };
    } else {
      qs[qIndex] = { ...q, correctAnswer: option };
    }

    this.questions.set(qs);
  }

  isCorrect(q: QuizQuestionWithAnswer, option: string): boolean {
    if (Array.isArray(q.correctAnswer)) return q.correctAnswer.includes(option);
    return q.correctAnswer === option;
  }

  difficultyLabel(d: string): string {
    return (
      ({ easy: 'Facile', medium: 'Moyen', hard: 'Difficile' } as Record<string, string>)[d] ?? d
    );
  }

  difficultyClass(d: string): string {
    return (
      (
        {
          easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
          medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
          hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
        } as Record<string, string>
      )[d] ?? ''
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  onConfirm(): void {
    if (this.isQuiz()) {
      const qs = this.questions();

      const publicQuestions = qs.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        domain: q.domain,
        difficulty: q.difficulty,
      }));

      const answerKey = qs.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      }));

      this.confirm.emit({
        quizContent: JSON.stringify(publicQuestions),
        quizAnswerKey: JSON.stringify(answerKey),
        changeType: this.changeType(),
        isQuiz: true,
      });
    } else {
      if (!this.htmlContent().trim()) return;
      this.confirm.emit({
        htmlContent: this.htmlContent(),
        changeType: this.changeType(),
        isQuiz: false,
      });
    }
  }
}
