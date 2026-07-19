import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { QuizResultModalComponent } from '../quiz-result-modal/quiz-result-modal.component';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

const mockCandidateQuizResult = (
  overrides: Partial<CandidateQuizResult> = {},
): CandidateQuizResult => ({
  id: 1,
  invitationId: 1,
  candidateId: 'candidate-1',
  evaluationId: 1,
  totalQuestions: 10,
  correctAnswers: 8,
  scorePercent: 80,
  detailJson: null,
  aiFeedbackJson: JSON.stringify({ globalScore: 80, recommendation: 'Good' }),
  durationSeconds: 120,
  submittedAt: new Date().toISOString(),
  ...overrides,
});

// Type intermédiaire pour accéder aux membres privés/readonly du composant en test
type QuizResultModalTestable = Omit<QuizResultModalComponent, 'quizResult'> & {
  quizResult: ReturnType<typeof signal<CandidateQuizResult>>;
};

describe('QuizResultModalComponent', () => {
  let fixture: ComponentFixture<QuizResultModalComponent>;
  let component: QuizResultModalTestable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizResultModalComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizResultModalComponent);
    component = fixture.componentInstance as unknown as QuizResultModalTestable;
  });

  const setupSignal = (data: CandidateQuizResult) => {
    component.quizResult = signal(data);
    fixture.detectChanges();
  };

  it('devrait créer', () => {
    setupSignal(mockCandidateQuizResult());
    expect(component).toBeTruthy();
  });

  describe('Input quizResult', () => {
    it('reçoit les données', () => {
      setupSignal(mockCandidateQuizResult({ id: 99 }));
      expect(component.quizResult().id).toBe(99);
    });

    it('met à jour', () => {
      setupSignal(mockCandidateQuizResult({ scorePercent: 80 }));
      component.quizResult.set(mockCandidateQuizResult({ scorePercent: 95 }));
      fixture.detectChanges();
      expect(component.quizResult().scorePercent).toBe(95);
    });
  });

  describe('Output close', () => {
    it('émet close', () => {
      setupSignal(mockCandidateQuizResult());
      const spy = vi.fn();
      component.close.subscribe(spy);
      component.close.emit();
      expect(spy).toHaveBeenCalledOnce();
    });
  });

  describe('parseAiFeedback', () => {
    it('null quand json null', () => {
      setupSignal(mockCandidateQuizResult());
      expect(component.parseAiFeedback(null)).toBeNull();
    });

    it('parse JSON valide', () => {
      setupSignal(mockCandidateQuizResult());
      const feedback = { globalScore: 90, recommendation: 'hire' };
      const result = component.parseAiFeedback(JSON.stringify(feedback));
      expect(result?.globalScore).toBe(90);
    });

    it('null quand JSON invalide', () => {
      setupSignal(mockCandidateQuizResult());
      expect(component.parseAiFeedback('not-json')).toBeNull();
    });
  });
});
