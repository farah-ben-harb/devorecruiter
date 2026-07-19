import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuizResultModalComponent } from './quiz-result-modal.component';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';
import { QuizAiFeedback } from '../../models/technical-evaluation/technical-evaluation.model';

describe('QuizResultModalComponent', () => {
  let fixture: ComponentFixture<QuizResultModalComponent>;
  let component: QuizResultModalComponent;

  const mockAiFeedback: QuizAiFeedback = {
    globalScore: 87,
    recommendation: 'hire',
    globalFeedback: 'Très bon niveau technique global.',
    strengths: ['Algorithmes', 'Angular', 'TypeScript'],
    weaknesses: ['Optimisation base de données'],
    domainAnalysis: [{ domain: 'Frontend', mastery: 'strong', comment: 'Excellent' }],
    interviewRecommendations: ['Poser des questions sur les performances'],
  };

  const mockQuizResult: CandidateQuizResult = {
    id: 42,
    invitationId: 55,
    candidateId: 'cand-123',
    evaluationId: 10,
    totalQuestions: 20,
    correctAnswers: 17,
    scorePercent: 87,
    detailJson: JSON.stringify([]),
    aiFeedbackJson: JSON.stringify(mockAiFeedback),
    durationSeconds: 2340,
    submittedAt: '2025-05-10T14:30:00Z',
  };

  interface CreateComponentOptions {
    quizResult?: CandidateQuizResult;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizResultModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizResultModalComponent);
    component = fixture.componentInstance;
  });

  const createComponent = (overrides: CreateComponentOptions = {}) => {
    const value = overrides.quizResult ?? mockQuizResult;
    // InputSignal expose sa valeur via une fonction callable,
    // on remplace cette fonction callable directement
    Object.defineProperty(component, 'quizResult', {
      value: () => value,
      writable: true,
    });
    fixture.detectChanges();
    return component;
  };

  it('devrait créer le composant', () => {
    expect(createComponent()).toBeTruthy();
  });

  describe('Input quizResult', () => {
    it('reçoit les données', () => {
      const comp = createComponent();
      expect(comp.quizResult().id).toBe(42);
      expect(comp.quizResult().scorePercent).toBe(87);
      expect(comp.quizResult().submittedAt).toBe('2025-05-10T14:30:00Z');
    });

    it('met à jour via nouvel input', () => {
      const updated: CandidateQuizResult = { ...mockQuizResult, scorePercent: 95 };
      const comp = createComponent({ quizResult: updated });
      expect(comp.quizResult().scorePercent).toBe(95);
    });
  });

  describe('parseAiFeedback', () => {
    it('retourne null quand json est null', () => {
      createComponent();
      expect(component.parseAiFeedback(null)).toBeNull();
    });

    it('retourne null quand json est vide', () => {
      createComponent();
      expect(component.parseAiFeedback('')).toBeNull();
    });

    it('parse JSON valide correctement', () => {
      createComponent();
      const result = component.parseAiFeedback(mockQuizResult.aiFeedbackJson);
      expect(result).toBeDefined();
      expect(result?.globalScore).toBe(87);
      expect(result?.recommendation).toBe('hire');
      expect(result?.strengths).toHaveLength(3);
    });

    it('retourne null quand JSON invalide', () => {
      createComponent();
      expect(component.parseAiFeedback('{"invalid json}')).toBeNull();
    });
  });

  describe('Output close', () => {
    it('émet close', () => {
      const comp = createComponent();
      const spy = vi.fn();
      comp.close.subscribe(spy);
      comp.close.emit();
      expect(spy).toHaveBeenCalledOnce();
    });
  });
});
