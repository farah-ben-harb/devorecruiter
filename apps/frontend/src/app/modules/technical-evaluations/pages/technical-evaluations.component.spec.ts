import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TechnicalEvaluationsComponent } from './technical-evaluations.component';
import { TechnicalEvaluationsFacade } from '../state/technical-evaluations.facade';
import { CandidatesFacade } from '../../candidates/state/candidates/candidates.facade';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { CandidateCodeEvaluationService } from '../services/candidates-code-evaluation/candidate-code-evaluation.service';
import { CandidateQuizService } from '../services/candidate-quiz/candidate-quiz.service';
import { of } from 'rxjs';
import { UiFacade } from '@app/modules/candidates/state/uis/ui.facade';
import { ResumeEvaluationFacade } from '@app/modules/candidates/state/resume-evaluations/resume-evaluations.facade';
import {
  TechnicalEvaluation,
  EvaluationStatus,
  RegeneratePayload,
} from '../models/technical-evaluation/technical-evaluation.model';
import { EditContentPayload } from '../models/candidate-quiz-result/candidate-quiz-result.model';
import { ToggleMenuEvent } from '../models/technical-evaluation/technical-evaluation.model';
describe('TechnicalEvaluationsComponent', () => {
  let fixture: ComponentFixture<TechnicalEvaluationsComponent>;
  let component: TechnicalEvaluationsComponent;

  const mockTechnicalFacade = {
    init: vi.fn(),
    jobPostId: signal(123),
    evaluations: signal<TechnicalEvaluation[]>([]),
    loading: signal(false),
    generating: signal(false),
    approving: signal<EvaluationStatus | null>(null),
    openMenuId: signal<number | null>(null),
    showRegenerateModal: signal(false),
    showEditContentModal: signal(false),
    closeMenu: vi.fn(),
    title: signal('Test'),
    company: signal('Test Co'),
    selectedEvaluation: signal<TechnicalEvaluation | null>(null),
    savingContent: signal(false),
    creatingGitRepo: signal<string | null>(null),
    jobPostGoogleDriveFileId: signal<string | null>(null),
    showInviteesModal: signal(false),
    selectedEvaluationForInvitees: signal<TechnicalEvaluation | null>(null),
    inviteesForEvaluation: signal<unknown[]>([]),
    loadingInvitees: signal(false),
    jobPostUnifiedDocId: signal<string | null>(null),
    canGenerate: signal(true),
    canEdit: signal(true),
    canApprove: signal(true),
    canDelete: signal(true),
    canSendEvaluationInvitation: signal(true),
    canViewGitRepo: signal(true),
    canViewInvitees: signal(true),
    loadingEvaluations: signal(false),
    regenerating: signal(false),
    generateEvaluation: vi.fn(),
    openRegenerateModal: vi.fn(),
    closeRegenerateModal: vi.fn(),
    onRegenerateConfirm: vi.fn(),
    openEditContentModal: vi.fn(),
    closeEditContentModal: vi.fn(),
    onEditContentConfirm: vi.fn(),
    approveEvaluation: vi.fn(),
    deleteEvaluation: vi.fn(),
    downloadEvaluation: vi.fn(),
    openInviteesModal: vi.fn(),
    closeInviteesModal: vi.fn(),
  };

  const mockCandidatesFacade = {
    init: vi.fn(),
    resumes: signal<unknown[]>([]),
  };

  const createMockActivatedRoute = (mode: 'coding' | 'quiz' = 'coding') => ({
    snapshot: {
      queryParamMap: {
        get: vi.fn((key: string) => {
          if (key === 'jobPostId') return '123';
          if (key === 'mode') return mode;
          return null;
        }),
      },
    },
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicalEvaluationsComponent],
      providers: [
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: CandidateCodeEvaluationService,
          useValue: { getByEvaluation: () => of([]), evaluate: () => of({}) },
        },
        { provide: CandidateQuizService, useValue: { getResultsByEvaluation: () => of([]) } },
      ],
    })
      .overrideComponent(TechnicalEvaluationsComponent, {
        set: {
          template: '<div></div>',
          providers: [
            { provide: TechnicalEvaluationsFacade, useValue: mockTechnicalFacade },
            { provide: CandidatesFacade, useValue: mockCandidatesFacade },
            { provide: UiFacade, useValue: {} },
            { provide: ResumeEvaluationFacade, useValue: {} },
          ],
        },
      })
      .compileComponents();
  });

  describe('avec mode coding (par défaut)', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
    });

    it('devrait créer le composant', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('devrait appeler facade.init() avec jobPostId converti en nombre et mode coding', () => {
      fixture.detectChanges();
      expect(mockTechnicalFacade.init).toHaveBeenCalledWith(123, 'coding');
    });

    it('devrait avoir evaluationMode à coding', () => {
      fixture.detectChanges();
      expect(component.evaluationMode()).toBe('coding');
    });

    it('devrait appeler candidatesFacade.init()', () => {
      fixture.detectChanges();
      expect(mockCandidatesFacade.init).toHaveBeenCalled();
    });
  });

  describe('avec mode quiz', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('quiz') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
    });

    it('devrait appeler facade.init() avec mode quiz', () => {
      fixture.detectChanges();
      expect(mockTechnicalFacade.init).toHaveBeenCalledWith(123, 'quiz');
    });

    it('devrait avoir evaluationMode à quiz', () => {
      fixture.detectChanges();
      expect(component.evaluationMode()).toBe('quiz');
    });
  });

  describe('sans mode dans les query params (fallback coding)', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: {
          snapshot: {
            queryParamMap: {
              get: vi.fn((key: string) => {
                if (key === 'jobPostId') return '123';
                return null;
              }),
            },
          },
        },
      });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
    });

    it('devrait fallback sur coding quand mode est absent', () => {
      fixture.detectChanges();
      expect(mockTechnicalFacade.init).toHaveBeenCalledWith(123, 'coding');
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('devrait naviguer vers /posts via goBack', () => {
      const router = TestBed.inject(Router);
      component.goBack();
      expect(router.navigate).toHaveBeenCalledWith(['/posts']);
    });
  });

  describe('Generate', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('devrait appeler facade.generateEvaluation avec le mode courant', () => {
      component.generateEvaluation();
      expect(mockTechnicalFacade.generateEvaluation).toHaveBeenCalledWith('coding');
    });
  });

  describe('Menu Logic', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it("devrait fermer le menu si on clique sur l'élément déjà ouvert", () => {
      mockTechnicalFacade.openMenuId.set(42);

      const btn = document.createElement('button');
      const mockEvent: ToggleMenuEvent = {
        id: 42,
        event: { currentTarget: btn } as unknown as MouseEvent,
      };

      component.onToggleMenu(mockEvent);
      expect(mockTechnicalFacade.closeMenu).toHaveBeenCalled();
      expect(component.selectedMenuEvaluation()).toBeNull();
    });

    it('devrait ouvrir le menu et positionner selectedMenuEvaluation', () => {
      mockTechnicalFacade.openMenuId.set(null);

      const mockEvaluation: TechnicalEvaluation = {
        id: 42,
        jobPostId: 123,
        name: null,
        title: 'Test',
        status: 'pending',
        version: '1.0',
        index: 0,
      };

      mockTechnicalFacade.evaluations.set([mockEvaluation]);

      const btn = document.createElement('button');
      document.body.appendChild(btn);
      const mockEvent: ToggleMenuEvent = {
        id: 42,
        event: { currentTarget: btn } as unknown as MouseEvent,
      };

      component.onToggleMenu(mockEvent);
      expect(mockTechnicalFacade.openMenuId()).toBe(42);
      expect(component.selectedMenuEvaluation()).toEqual(mockEvaluation);
      document.body.removeChild(btn);
    });
  });

  describe('Delete', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('devrait ouvrir le modal de suppression', () => {
      const evaluation: TechnicalEvaluation = {
        id: 1,
        jobPostId: 123,
        name: null,
        title: 'Test',
        status: 'pending',
        version: '1.0',
        index: 0,
      };
      component.openDeleteModal(evaluation);
      expect(component.showDeleteModal()).toBe(true);
      expect(component.evaluationToDelete()).toEqual(evaluation);
    });

    it('devrait fermer le modal de suppression', () => {
      component.closeDeleteModal();
      expect(component.showDeleteModal()).toBe(false);
      expect(component.evaluationToDelete()).toBeNull();
    });

    it('devrait appeler facade.deleteEvaluation et fermer le modal', () => {
      const evaluation: TechnicalEvaluation = {
        id: 1,
        jobPostId: 123,
        name: null,
        title: 'Test',
        status: 'pending',
        version: '1.0',
        index: 0,
      };
      component.openDeleteModal(evaluation);
      component.confirmDelete();
      expect(mockTechnicalFacade.deleteEvaluation).toHaveBeenCalledWith(evaluation);
      expect(component.showDeleteModal()).toBe(false);
    });
  });

  describe('Regenerate', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('devrait déléguer openRegenerateModal à la facade', () => {
      const evaluation: TechnicalEvaluation = {
        id: 1,
        jobPostId: 123,
        name: null,
        title: 'Test',
        status: 'pending',
        version: '1.0',
        index: 0,
      };
      component.openRegenerateModal(evaluation);
      expect(mockTechnicalFacade.openRegenerateModal).toHaveBeenCalledWith(evaluation);
    });

    it('devrait déléguer closeRegenerateModal à la facade', () => {
      component.closeRegenerateModal();
      expect(mockTechnicalFacade.closeRegenerateModal).toHaveBeenCalled();
    });

    it('devrait déléguer onRegenerateConfirm à la facade', () => {
      const payload: RegeneratePayload = { prompt: 'test' };
      component.onRegenerateConfirm(payload);
      expect(mockTechnicalFacade.onRegenerateConfirm).toHaveBeenCalledWith(payload);
    });
  });

  describe('Edit Content', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('devrait déléguer openEditContentModal à la facade', () => {
      const evaluation: TechnicalEvaluation = {
        id: 1,
        jobPostId: 123,
        name: null,
        title: 'Test',
        status: 'pending',
        version: '1.0',
        index: 0,
      };
      component.openEditContentModal(evaluation);
      expect(mockTechnicalFacade.openEditContentModal).toHaveBeenCalledWith(evaluation);
    });

    it('devrait déléguer onEditContentConfirm à la facade', () => {
      const payload: EditContentPayload = {
        htmlContent: '<p>test</p>',
        changeType: 'major',
        isQuiz: false,
      };
      component.onEditContentConfirm(payload);
      expect(mockTechnicalFacade.onEditContentConfirm).toHaveBeenCalledWith(payload);
    });
  });

  describe('Approve', () => {
    beforeEach(() => {
      TestBed.overrideProvider(ActivatedRoute, { useValue: createMockActivatedRoute('coding') });
      fixture = TestBed.createComponent(TechnicalEvaluationsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('devrait déléguer approveEvaluation à la facade', () => {
      const evaluation: TechnicalEvaluation = {
        id: 1,
        jobPostId: 123,
        name: null,
        title: 'Test',
        status: 'pending',
        version: '1.0',
        index: 0,
      };
      component.approveEvaluation(evaluation, 'approved');
      expect(mockTechnicalFacade.approveEvaluation).toHaveBeenCalledWith(evaluation, 'approved');
    });
  });
});
