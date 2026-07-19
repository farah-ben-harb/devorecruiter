import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { EvaluationInvitationComponent } from './evaluation-invitations.component';
import { JobPostFacade } from '../../../job-posts/state/job-posts.facade';
import { ScoringResume, DriveFile } from '../../../job-posts/models/job-post.model';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';
import {
  EvaluationInvitation,
  EvaluationInvitationSummary,
  SendEvaluationInvitationsPayload,
} from '../../models/evaluation-invitation/evaluation-invitation.model';
import { EvaluationInvitationsService } from '../../services/evaluation-invitations/evaluation-invitations.service';
import { TechnicalEvaluationService } from '../../services/technical-evaluations/technical-evaluation.service';
import { ResumeListItem } from '../../../candidates/models/candidate.model';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateQuizResult } from '../../models/candidate-quiz-result/candidate-quiz-result.model';
import { CandidateCodeEvaluationService } from '../../services/candidates-code-evaluation/candidate-code-evaluation.service';
import { CandidateQuizService } from '../../services/candidate-quiz/candidate-quiz.service';

// ── Factories ─────────────────────────────────────────────────────────────

function createScoring(overrides: Partial<ScoringResume> = {}): ScoringResume {
  return {
    id: 1,
    resumeFileId: 'resume-1',
    resumeName: 'CV Jean',
    jobPostId: 100,
    jobPostGoogleDriveFileId: 'drive-job-100',
    scoreGlobal: 75,
    criteria: {
      technicalSkills: { score: 80, detail: 'Bon' },
      experience: { score: 70, detail: 'Correct' },
      education: { score: 75, detail: 'Correct' },
      softSkills: { score: 60, detail: 'Moyen' },
      languages: { score: 90, detail: 'Bon' },
    },
    strengths: [],
    weaknesses: [],
    resume: '',
    recommendation: '',
    status: 'ACCEPTED',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as ScoringResume;
}

function createEvaluation(overrides: Partial<TechnicalEvaluation> = {}): TechnicalEvaluation {
  return {
    id: 10,
    jobPostId: 100,
    title: 'Évaluation Angular',
    status: 'pending',
    version: '1.0',
    name: null,
    index: null,
    ...overrides,
  } as TechnicalEvaluation;
}

function createInvitation(overrides: Partial<EvaluationInvitation> = {}): EvaluationInvitation {
  return {
    id: 1,
    evaluationId: 10,
    candidateId: 'cand-1',
    jobPostId: 100,
    sentAt: '2024-01-01T00:00:00.000Z',
    dueDate: '2024-02-01',
    ...overrides,
  } as EvaluationInvitation;
}

function createResumeListItem(overrides: Partial<ResumeListItem> = {}): ResumeListItem {
  return {
    id: 'resume-1',
    name: 'Jean Dupont',
    driveLink: 'https://drive.google.com/resume-1',
    driveId: 'resume-1',
    type: 'brut',
    createdAt: '2024-01-01T00:00:00.000Z',
    status: 'done',
    hasUnifie: false,
    ...overrides,
  };
}

function createCodeEval(overrides: Partial<CandidateCodeEvaluation> = {}): CandidateCodeEvaluation {
  return {
    id: 1,
    invitationId: 1,
    candidateId: 'cand-1',
    evaluationId: 10,
    branch: 'main',
    globalScore: 80,
    technicalScore: 85,
    qualityScore: 75,
    feedback: 'Bon travail',
    strengths: [],
    improvements: [],
    recommendation: 'hire',
    evaluatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createQuizResult(overrides: Partial<CandidateQuizResult> = {}): CandidateQuizResult {
  return {
    id: 1,
    invitationId: 1,
    candidateId: 'cand-1',
    evaluationId: 10,
    totalQuestions: 10,
    correctAnswers: 8,
    scorePercent: 80,
    detailJson: null,
    aiFeedbackJson: null,
    durationSeconds: 600,
    submittedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────

function createFacadeMock() {
  return {
    scorings: signal<ScoringResume[]>([]),
    loadingScoring: signal(false),
    loadingAll: signal(false),
    scoringError: signal<string | null>(null),
    showScoringListModal: signal(false),
    scoringToastMessage: signal<string | null>(null),
    scoringToastType: signal<'success' | 'error'>('success'),
    loadScoringData: vi.fn(),
    openScoringListModal: vi.fn(),
    closeScoringListModal: vi.fn(),
    unscoredResumes: vi.fn((): DriveFile[] => []),
    scoreAllCVs: vi.fn(),
    deleteScoringResume: vi.fn(),
  };
}

function createEvaluationServiceMock() {
  return {
    findByJobPost: vi.fn(() => of<TechnicalEvaluation[]>([createEvaluation()])),
  };
}

function createInvitationsServiceMock() {
  return {
    getByJobPost: vi.fn(() => of<EvaluationInvitationSummary[]>([])),
    getByResume: vi.fn(() => of<EvaluationInvitation[]>([])),
    getByEvaluation: vi.fn(() => of<EvaluationInvitation[]>([])),
    send: vi.fn(() => of(undefined)),
  };
}

function createCodeEvalServiceMock() {
  return {
    evaluate: vi.fn(() => of<CandidateCodeEvaluation>(createCodeEval())),
    getByInvitation: vi.fn(() => of<CandidateCodeEvaluation | null>(null)),
  };
}

function createQuizServiceMock() {
  return {
    getResultByInvitation: vi.fn(() => of<CandidateQuizResult | null>(null)),
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────

describe('EvaluationInvitationComponent', () => {
  let facadeMock: ReturnType<typeof createFacadeMock>;
  let evaluationServiceMock: ReturnType<typeof createEvaluationServiceMock>;
  let invitationsServiceMock: ReturnType<typeof createInvitationsServiceMock>;
  let codeEvalServiceMock: ReturnType<typeof createCodeEvalServiceMock>;
  let quizServiceMock: ReturnType<typeof createQuizServiceMock>;
  let component: EvaluationInvitationComponent;

  beforeEach(() => {
    facadeMock = createFacadeMock();
    evaluationServiceMock = createEvaluationServiceMock();
    invitationsServiceMock = createInvitationsServiceMock();
    codeEvalServiceMock = createCodeEvalServiceMock();
    quizServiceMock = createQuizServiceMock();

    TestBed.configureTestingModule({
      imports: [EvaluationInvitationComponent],
      providers: [
        { provide: EvaluationInvitationsService, useValue: invitationsServiceMock },
        { provide: TechnicalEvaluationService, useValue: evaluationServiceMock },
        { provide: CandidateCodeEvaluationService, useValue: codeEvalServiceMock },
        { provide: CandidateQuizService, useValue: quizServiceMock },
      ],
    });

    TestBed.overrideComponent(EvaluationInvitationComponent, {
      set: {
        template: '<div></div>',
        providers: [{ provide: JobPostFacade, useValue: facadeMock }],
      },
    });

    const fixture = TestBed.createComponent(EvaluationInvitationComponent);
    component = fixture.componentInstance;
    component.jobPostId = 100;
    component.jobPostGoogleDriveFileId = 'drive-job-100';
    component.jobPostName = 'Développeur Angular';
    component.canSendEvaluationInvitation = true;
    component.canDelete = true;
    component.canViewGitRepo = true;
  });

  describe('ngOnInit', () => {
    it('charge les données de scoring, ouvre le modal et charge les évaluations', () => {
      component.ngOnInit();

      expect(facadeMock.loadScoringData).toHaveBeenCalledWith(100);
      expect(facadeMock.openScoringListModal).toHaveBeenCalled();
      expect(evaluationServiceMock.findByJobPost).toHaveBeenCalledWith(100);
      expect(invitationsServiceMock.getByJobPost).toHaveBeenCalledWith(100);
    });

    it('sélectionne automatiquement l’évaluation si une seule est retournée', () => {
      component.ngOnInit();

      expect(component.evaluations()).toHaveLength(1);
      expect(component.selectedEvaluationId_signal()).toBe(10);
    });

    it('ne présélectionne rien si plusieurs évaluations existent', () => {
      evaluationServiceMock.findByJobPost.mockReturnValue(
        of<TechnicalEvaluation[]>([createEvaluation({ id: 10 }), createEvaluation({ id: 11 })]),
      );

      component.ngOnInit();

      expect(component.selectedEvaluationId_signal()).toBeNull();
    });
  });

  describe('sélection des candidats', () => {
    it('toggleSelection ajoute puis retire un id', () => {
      expect(component.isSelected(1)).toBe(false);

      component.toggleSelection(1);
      expect(component.isSelected(1)).toBe(true);

      component.toggleSelection(1);
      expect(component.isSelected(1)).toBe(false);
    });

    it('toggleSelectAll sélectionne puis désélectionne tous les scorings', () => {
      facadeMock.scorings.set([createScoring({ id: 1 }), createScoring({ id: 2 })]);

      component.toggleSelectAll();
      expect(component.isAllSelected()).toBe(true);

      component.toggleSelectAll();
      expect(component.isAllSelected()).toBe(false);
    });

    it('isIndeterminate est vrai si une sélection partielle existe', () => {
      facadeMock.scorings.set([createScoring({ id: 1 }), createScoring({ id: 2 })]);

      component.toggleSelection(1);

      expect(component.isIndeterminate()).toBe(true);
    });

    it('selectedCount additionne scorings et candidats non scorés sélectionnés', () => {
      component.toggleSelection(1);
      component.toggleUnscoredSelection('drive-1');

      expect(component.selectedCount()).toBe(2);
    });
  });

  describe('sendEvaluationInvitations', () => {
    it("échoue si aucune date d'échéance n'est renseignée", () => {
      component.toggleSelection(1);
      component.selectedEvaluationId_signal.set(10);

      component.sendEvaluationInvitations();

      expect(component.invitationError()).toBe("Veuillez sélectionner une date d'échéance.");
      expect(invitationsServiceMock.send).not.toHaveBeenCalled();
    });

    it('échoue si la date est dans le passé', () => {
      component.toggleSelection(1);
      component.selectedEvaluationId_signal.set(10);
      component.onDueDateChange('2000-01-01');

      component.sendEvaluationInvitations();

      expect(component.invitationError()).toBe(
        "La date d'échéance ne peut pas être dans le passé.",
      );
    });

    it('échoue si aucune évaluation n’est sélectionnée', () => {
      component.toggleSelection(1);
      component.selectedEvaluationId_signal.set(null);
      component.onDueDateChange('2099-01-01');

      component.sendEvaluationInvitations();

      expect(component.invitationError()).toBe('Veuillez sélectionner une évaluation.');
    });

    it('échoue si aucun candidat n’est sélectionné', () => {
      component.selectedEvaluationId_signal.set(10);
      component.onDueDateChange('2099-01-01');

      component.sendEvaluationInvitations();

      expect(component.invitationError()).toBe('Sélectionnez au moins un candidat.');
    });

    it('envoie le payload correct et réinitialise les sélections en cas de succès', () => {
      component.toggleSelection(1);
      component.toggleUnscoredSelection('drive-1');
      component.selectedEvaluationId_signal.set(10);
      component.onDueDateChange('2099-01-01');

      component.sendEvaluationInvitations();

      const expectedPayload: SendEvaluationInvitationsPayload = {
        scoringResumeIds: [1],
        unscoredResumeIds: ['drive-1'],
        evaluationId: 10,
        dueDate: '2099-01-01',
        jobPostId: 100,
      };

      expect(invitationsServiceMock.send).toHaveBeenCalledWith(expectedPayload);
      expect(component.invitationSuccess()).toBe(true);
      expect(component.selectedIds().size).toBe(0);
      expect(component.selectedUnscoredIds().size).toBe(0);
    });
  });

  describe('openInviteesModal / closeInviteesModal', () => {
    it('charge les invités pour une évaluation donnée', () => {
      const evaluation = createEvaluation({ id: 10 });
      invitationsServiceMock.getByEvaluation.mockReturnValue(
        of<EvaluationInvitation[]>([createInvitation({ id: 5 })]),
      );

      component.openInviteesModal(evaluation);

      expect(component.showInviteesModal()).toBe(true);
      expect(component.selectedEvaluationForInvitees()).toEqual(evaluation);
      expect(component.inviteesForEvaluation()).toHaveLength(1);
      expect(component.loadingInvitees()).toBe(false);
    });

    it('réinitialise l’état à la fermeture', () => {
      component.openInviteesModal(createEvaluation());
      component.closeInviteesModal();

      expect(component.showInviteesModal()).toBe(false);
      expect(component.selectedEvaluationForInvitees()).toBeNull();
    });
  });

  describe('helpers visuels', () => {
    it('getBarColor retourne la bonne couleur selon le score', () => {
      expect(component.getBarColor(80)).toBe('bg-green-500');
      expect(component.getBarColor(50)).toBe('bg-amber-500');
      expect(component.getBarColor(10)).toBe('bg-red-500');
    });

    it('getBadgeClass distingue ACCEPTED des autres statuts', () => {
      expect(component.getBadgeClass('ACCEPTED')).toBe('bg-green-100 text-green-800');
      expect(component.getBadgeClass('REJECTED')).toBe('bg-red-100 text-red-800');
    });

    it('getScoreCircleClass retourne la bonne classe selon le score', () => {
      expect(component.getScoreCircleClass(80)).toBe('border-green-400 text-green-700 bg-green-50');
      expect(component.getScoreCircleClass(50)).toBe('border-amber-400 text-amber-700 bg-amber-50');
      expect(component.getScoreCircleClass(10)).toBe('border-red-400 text-red-700 bg-red-50');
    });

    it('isExpired retourne false si dueDate est null', () => {
      expect(component.isExpired(null)).toBe(false);
    });

    it('isExpired retourne true pour une date passée', () => {
      expect(component.isExpired('2000-01-01')).toBe(true);
    });
  });

  describe('évaluation de code et quiz', () => {
    it('onEvaluate stocke le résultat et réinitialise evaluatingInvitationId', () => {
      const result = createCodeEval({ id: 99 });
      codeEvalServiceMock.evaluate.mockReturnValue(of<CandidateCodeEvaluation>(result));

      component.onEvaluate(1);

      expect(component.codeEvaluations().get(1)).toEqual(result);
      expect(component.evaluatingInvitationId()).toBeNull();
    });

    it('openCodeEvalModal ouvre le modal seulement si un résultat existe', () => {
      component.openCodeEvalModal(1);
      expect(component.showCodeEvalModal()).toBe(false);

      const result = createCodeEval({ id: 1 });
      component.codeEvaluations.set(new Map([[1, result]]));
      component.openCodeEvalModal(1);

      expect(component.showCodeEvalModal()).toBe(true);
      expect(component.selectedCodeEval()).toEqual(result);
    });

    it('openQuizResultModal ouvre le modal seulement si un résultat existe', () => {
      component.openQuizResultModal(1);
      expect(component.showQuizResultModal()).toBe(false);

      const result = createQuizResult({ id: 1 });
      component.quizResults.set(new Map([[1, result]]));
      component.openQuizResultModal(1);

      expect(component.showQuizResultModal()).toBe(true);
      expect(component.selectedQuizResult()).toEqual(result);
    });
  });

  describe('getResumeListItem / hasMissingFields', () => {
    it('retrouve un candidat par driveId ou id', () => {
      component.candidateResumeItems = [createResumeListItem({ driveId: 'resume-1' })];

      expect(component.getResumeListItem('resume-1')).toBeDefined();
      expect(component.getResumeListItem('inconnu')).toBeUndefined();
    });

    it('hasMissingFields retourne false par défaut', () => {
      component.candidateResumeItems = [createResumeListItem({ driveId: 'resume-1' })];

      expect(component.hasMissingFields('resume-1')).toBe(false);
    });
  });
});
