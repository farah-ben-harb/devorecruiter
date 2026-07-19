import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CandidateRepositoriesModalComponent } from './candidate-repositories-modal.component';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';
import { EvaluationInvitation } from '../../models/evaluation-invitation/evaluation-invitation.model';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

const mockEvaluation: TechnicalEvaluation = {
  id: 1,
  jobPostId: 100,
  name: null,
  title: 'Test Evaluation',
  status: 'pending',
  version: '1.0',
  index: 0,
  quizContent: '[{"question":"Q1"}]',
  quizAnswerKey: '{}',
};

const mockInvitees: EvaluationInvitation[] = [
  {
    id: 99,
    jobPostId: 100,
    evaluationId: 1,
    candidateId: 'candidate-1',
    sentAt: '2026-05-11T15:14:23.108Z',
    dueDate: null,
  },
];

interface CreateComponentOptions {
  evaluation?: TechnicalEvaluation | null;
  invitees?: EvaluationInvitation[];
  loadingInvitees?: boolean;
  evaluatingInvitationId?: number | null;
  codeEvaluations?: Map<number, CandidateCodeEvaluation>;
  quizResults?: Map<number, CandidateQuizResult>;
}

describe('CandidateRepositoriesModalComponent', () => {
  let fixture: ComponentFixture<CandidateRepositoriesModalComponent>;
  let component: CandidateRepositoriesModalComponent;

  const createComponent = (overrides: CreateComponentOptions = {}) => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [CandidateRepositoriesModalComponent],
    });

    fixture = TestBed.createComponent(CandidateRepositoriesModalComponent);
    component = fixture.componentInstance;

    component.evaluation =
      overrides.evaluation !== undefined ? overrides.evaluation : mockEvaluation;
    component.invitees = overrides.invitees ?? [];
    component.loadingInvitees = overrides.loadingInvitees ?? false;
    component.evaluatingInvitationId = overrides.evaluatingInvitationId ?? null;
    component.codeEvaluations = overrides.codeEvaluations ?? new Map();
    component.quizResults = overrides.quizResults ?? new Map();

    fixture.detectChanges();
    return component;
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait créer le composant', () => {
    expect(createComponent()).toBeTruthy();
  });

  describe('isQuizEvaluation', () => {
    it('retourne false quand evaluation est null', () => {
      const comp = createComponent({ evaluation: null });
      expect(comp.isQuizEvaluation()).toBe(false);
    });

    it('retourne false sans quizContent', () => {
      const comp = createComponent({
        evaluation: { ...mockEvaluation, quizContent: null },
      });
      expect(comp.isQuizEvaluation()).toBe(false);
    });

    it('retourne true avec quizContent', () => {
      const comp = createComponent({ evaluation: mockEvaluation });
      expect(comp.isQuizEvaluation()).toBe(true);
    });
  });

  describe('Réactivité des inputs', () => {
    it('met à jour invitees', () => {
      const comp = createComponent({ invitees: mockInvitees });
      expect(comp.invitees).toEqual(mockInvitees);
    });

    it('reflète loadingInvitees', () => {
      const comp = createComponent({ loadingInvitees: true });
      expect(comp.loadingInvitees).toBe(true);
    });

    it('met à jour evaluatingInvitationId', () => {
      const comp = createComponent({ evaluatingInvitationId: 77 });
      expect(comp.evaluatingInvitationId).toBe(77);
    });

    it('met à jour codeEvaluations', () => {
      const map = new Map<number, CandidateCodeEvaluation>([
        [
          1,
          {
            id: 1,
            invitationId: 1,
            candidateId: 'cand-1',
            evaluationId: 1,
            branch: 'main',
            globalScore: 85,
            technicalScore: 80,
            qualityScore: 90,
            feedback: 'Bien',
            strengths: [],
            improvements: [],
            recommendation: 'hire',
            evaluatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      ]);
      const comp = createComponent({ codeEvaluations: map });
      expect(comp.codeEvaluations.get(1)?.globalScore).toBe(85);
    });

    it('met à jour quizResults', () => {
      const map = new Map<number, CandidateQuizResult>([
        [
          1,
          {
            id: 1,
            invitationId: 1,
            candidateId: 'cand-1',
            evaluationId: 1,
            totalQuestions: 10,
            correctAnswers: 9,
            scorePercent: 92,
            detailJson: null,
            aiFeedbackJson: null,
            durationSeconds: null,
            submittedAt: '2026-01-01T00:00:00Z',
          },
        ],
      ]);
      const comp = createComponent({ quizResults: map });
      expect(comp.quizResults.get(1)?.scorePercent).toBe(92);
    });
  });

  describe('Outputs', () => {
    let comp: CandidateRepositoriesModalComponent;

    beforeEach(() => {
      comp = createComponent();
    });

    it('émet close', () => {
      const spy = vi.fn();
      comp.close.subscribe(spy);
      comp.close.emit();
      expect(spy).toHaveBeenCalledOnce();
    });

    it("émet evaluate avec l'id", () => {
      const spy = vi.fn();
      comp.evaluate.subscribe(spy);
      comp.evaluate.emit(42);
      expect(spy).toHaveBeenCalledWith(42);
    });
  });
});
