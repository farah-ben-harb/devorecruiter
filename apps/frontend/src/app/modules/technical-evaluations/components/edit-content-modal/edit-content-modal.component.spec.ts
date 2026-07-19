import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditContentModalComponent } from './edit-content-modal.component';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';
import { signal, WritableSignal } from '@angular/core';
import { EditContentPayload } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

describe('EditContentModalComponent', () => {
  let fixture: ComponentFixture<EditContentModalComponent>;
  let component: EditContentModalComponent;

  const mockHtmlEvaluation: TechnicalEvaluation = {
    id: 1,
    jobPostId: 100,
    name: null,
    title: 'HTML Evaluation',
    status: 'pending',
    version: '1.0',
    index: 0,
    htmlContent: '<h1>Hello World</h1>',
    quizContent: null,
    quizAnswerKey: null,
  };

  const mockQuizEvaluation: TechnicalEvaluation = {
    id: 2,
    jobPostId: 100,
    title: 'Quiz Evaluation',
    status: 'pending',
    name: null,
    version: '1.0',
    index: 0,
    htmlContent: undefined,
    quizContent: JSON.stringify([
      {
        id: 101,
        question: 'Quelle est la capitale de la France ?',
        type: 'single_choice',
        options: ['Paris', 'Berlin', 'Madrid'],
        domain: 'Géographie',
        difficulty: 'easy',
      },
    ]),
    quizAnswerKey: JSON.stringify([
      {
        id: 101,
        correctAnswer: 'Paris',
        explanation: 'Paris est la capitale.',
      },
    ]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditContentModalComponent],
    }).compileComponents();
  });

  interface ComponentOverrides {
    evaluation?: TechnicalEvaluation;
    saving?: boolean;
  }

  const createComponent = (overrides: ComponentOverrides = {}) => {
    fixture = TestBed.createComponent(EditContentModalComponent);
    component = fixture.componentInstance;

    (component.evaluation as unknown as WritableSignal<TechnicalEvaluation>) = signal(
      overrides.evaluation ?? mockHtmlEvaluation,
    );
    (component.saving as unknown as WritableSignal<boolean>) = signal(overrides.saving ?? false);

    fixture.detectChanges();
    return component;
  };

  it('devrait créer le composant', () => {
    expect(createComponent()).toBeTruthy();
  });

  describe('isQuiz (computed)', () => {
    it('retourne false quand ni quizContent ni quizAnswerKey', () => {
      const comp = createComponent({ evaluation: mockHtmlEvaluation });
      expect(comp.isQuiz()).toBe(false);
    });

    it('retourne true quand quizContent est présent', () => {
      const comp = createComponent({ evaluation: mockQuizEvaluation });
      expect(comp.isQuiz()).toBe(true);
    });
  });

  describe('ngOnInit - mode HTML', () => {
    it('initialise htmlContent correctement', () => {
      const comp = createComponent({ evaluation: mockHtmlEvaluation });
      expect(comp.htmlContent()).toBe('<h1>Hello World</h1>');
    });

    it('htmlContent vide quand undefined', () => {
      const evalWithoutContent = { ...mockHtmlEvaluation, htmlContent: undefined };
      const comp = createComponent({ evaluation: evalWithoutContent });
      expect(comp.htmlContent()).toBe('');
    });
  });

  describe('ngOnInit - mode Quiz', () => {
    it('parse correctement quizContent et quizAnswerKey', () => {
      const comp = createComponent({ evaluation: mockQuizEvaluation });

      expect(comp.questions()).toHaveLength(1);
      expect(comp.questions()[0].question).toContain('capitale');
      expect(comp.questions()[0].correctAnswer).toBe('Paris');
    });

    it('gère JSON invalide gracieusement', () => {
      const badEval: TechnicalEvaluation = {
        ...mockQuizEvaluation,
        quizContent: 'invalid json',
        quizAnswerKey: 'invalid json',
      };
      const comp = createComponent({ evaluation: badEval });
      expect(comp.questions()).toEqual([]);
    });
  });

  describe('Quiz editing', () => {
    let comp: EditContentModalComponent;

    beforeEach(() => {
      comp = createComponent({ evaluation: mockQuizEvaluation });
    });

    it('setActive', () => {
      comp.setActive(0);
      expect(comp.activeQuestionIndex()).toBe(0);
    });

    it('updateQuestion', () => {
      comp.updateQuestion(0, 'question', 'Nouvelle question ?');
      expect(comp.questions()[0].question).toBe('Nouvelle question ?');
    });

    it('addOption / removeOption', () => {
      const initialLength = comp.questions()[0].options.length;
      comp.addOption(0);
      expect(comp.questions()[0].options.length).toBe(initialLength + 1);

      comp.removeOption(0, 0);
      expect(comp.questions()[0].options.length).toBe(initialLength);
    });

    it('toggleCorrectAnswer single_choice', () => {
      comp.toggleCorrectAnswer(0, 'Berlin');
      expect(comp.questions()[0].correctAnswer).toBe('Berlin');
    });

    it('isCorrect', () => {
      expect(comp.isCorrect(comp.questions()[0], 'Paris')).toBe(true);
    });
  });

  describe('Outputs', () => {
    it('émet close', () => {
      const comp = createComponent();
      const spy = vi.fn();
      comp.close.subscribe(spy);
      comp.close.emit();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('émet confirm en mode HTML', () => {
      const comp = createComponent({ evaluation: mockHtmlEvaluation });
      const spy = vi.fn();
      comp.confirm.subscribe(spy);

      comp.htmlContent.set('<p>Contenu modifié</p>');
      comp.onConfirm();

      expect(spy).toHaveBeenCalledWith({
        htmlContent: '<p>Contenu modifié</p>',
        changeType: 'minor',
        isQuiz: false,
      } as EditContentPayload);
    });

    it('émet confirm en mode Quiz', () => {
      const comp = createComponent({ evaluation: mockQuizEvaluation });
      const spy = vi.fn();
      comp.confirm.subscribe(spy);

      comp.onConfirm();

      const payload: EditContentPayload = spy.mock.calls[0][0];
      expect(payload.isQuiz).toBe(true);
      expect(payload.quizContent).toBeDefined();
      expect(payload.quizAnswerKey).toBeDefined();
    });
  });

  it("reflète l'input saving", () => {
    const comp = createComponent({ saving: true });
    expect(comp.saving()).toBe(true);
  });
});
