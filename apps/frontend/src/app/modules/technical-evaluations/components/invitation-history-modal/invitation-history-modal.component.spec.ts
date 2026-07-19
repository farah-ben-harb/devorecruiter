import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';

import { InvitationHistoryModalComponent } from './invitation-history-modal.component';
import { EvaluationInvitationsService } from '../../services/evaluation-invitations/evaluation-invitations.service';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';
import { EvaluationInvitation } from '../../models/evaluation-invitation/evaluation-invitation.model';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockInvitations: EvaluationInvitation[] = [
  {
    id: 1,
    jobPostId: 1, // ← ajouté (cohérent avec l'évaluation 10 → jobPostId 1)
    evaluationId: 10,
    candidateId: 'cand-1',
    candidateResumeFileId: 'resume-abc',
    sentAt: '2024-01-01',
    dueDate: '2099-12-31',
    gitRepoUrl: 'https://github.com/a',
  },
  {
    id: 2,
    jobPostId: 2, // ← ajouté (cohérent avec l'évaluation 20 → jobPostId 2)
    evaluationId: 20,
    candidateId: 'cand-2',
    candidateResumeFileId: 'resume-abc',
    sentAt: '2024-01-02',
    dueDate: '2000-01-01',
    gitRepoUrl: null,
  },
];

const mockEvaluations: TechnicalEvaluation[] = [
  {
    id: 10,
    jobPostId: 1,
    name: null,
    title: 'Éval Angular',
    status: 'pending',
    version: '1.0',
    index: null,
  },
  {
    id: 20,
    jobPostId: 2,
    name: null,
    title: 'Éval Node',
    status: 'in_progress',
    version: '1.0',
    index: null,
  },
];

const mockService = {
  getByResume: vi.fn(),
  delete: vi.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChange(previousValue: unknown, currentValue: unknown, firstChange = false) {
  return new SimpleChange(previousValue, currentValue, firstChange);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('InvitationHistoryModalComponent', () => {
  let component: InvitationHistoryModalComponent;
  let fixture: ComponentFixture<InvitationHistoryModalComponent>;

  beforeEach(async () => {
    mockService.getByResume.mockReset();
    mockService.delete.mockReset();

    await TestBed.configureTestingModule({
      imports: [InvitationHistoryModalComponent],
      providers: [{ provide: EvaluationInvitationsService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(InvitationHistoryModalComponent);
    component = fixture.componentInstance;
  });

  // ─── État initial ────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('devrait créer le composant', () => {
      expect(component).toBeTruthy();
    });

    it('devrait avoir des signaux vides par défaut', () => {
      expect(component.invitations()).toEqual([]);
      expect(component.loading()).toBe(false);
      expect(component.openActionMenuId()).toBeNull();
    });

    it('devrait avoir canDelete et canViewGitRepo à false par défaut', () => {
      expect(component.canDelete).toBe(false);
      expect(component.canViewGitRepo).toBe(false);
    });
  });

  // ─── ngOnChanges ─────────────────────────────────────────────────────────

  describe('ngOnChanges', () => {
    it('devrait charger l historique quand resumeFileId change et est défini', () => {
      mockService.getByResume.mockReturnValue(of(mockInvitations));

      component.resumeFileId = 'resume-abc';
      component.ngOnChanges({ resumeFileId: buildChange(null, 'resume-abc', true) });

      expect(mockService.getByResume).toHaveBeenCalledWith('resume-abc');
    });

    it('ne devrait PAS charger si resumeFileId est vide/undefined', () => {
      component.resumeFileId = '';
      component.ngOnChanges({ resumeFileId: buildChange(null, '') });

      expect(mockService.getByResume).not.toHaveBeenCalled();
    });

    it('ne devrait PAS charger si resumeFileId n est pas dans les changements', () => {
      mockService.getByResume.mockReturnValue(of([]));

      component.resumeFileId = 'resume-abc';
      component.ngOnChanges({ candidateName: buildChange('', 'Alice') });

      expect(mockService.getByResume).not.toHaveBeenCalled();
    });
  });

  // ─── loadHistory (via ngOnChanges) ───────────────────────────────────────

  describe('loadHistory', () => {
    it('devrait mettre loading à true pendant le chargement puis false', () => {
      mockService.getByResume.mockReturnValue(of(mockInvitations));

      component.resumeFileId = 'resume-abc';
      component.ngOnChanges({ resumeFileId: buildChange(null, 'resume-abc', true) });

      // Après l'observable synchrone, loading doit être false
      expect(component.loading()).toBe(false);
    });

    it('devrait peupler le signal invitations avec les données reçues', () => {
      mockService.getByResume.mockReturnValue(of(mockInvitations));

      component.resumeFileId = 'resume-abc';
      component.ngOnChanges({ resumeFileId: buildChange(null, 'resume-abc', true) });

      expect(component.invitations()).toEqual(mockInvitations);
    });

    it('devrait filtrer par filterByEvaluationId quand il est défini', () => {
      mockService.getByResume.mockReturnValue(of(mockInvitations));

      component.resumeFileId = 'resume-abc';
      component.filterByEvaluationId = 10;
      component.ngOnChanges({ resumeFileId: buildChange(null, 'resume-abc', true) });

      expect(component.invitations()).toHaveLength(1);
      expect(component.invitations()[0].evaluationId).toBe(10);
    });

    it('ne devrait pas filtrer quand filterByEvaluationId est null', () => {
      mockService.getByResume.mockReturnValue(of(mockInvitations));

      component.resumeFileId = 'resume-abc';
      component.filterByEvaluationId = null;
      component.ngOnChanges({ resumeFileId: buildChange(null, 'resume-abc', true) });

      expect(component.invitations()).toHaveLength(mockInvitations.length);
    });

    it('devrait remettre loading à false en cas d erreur', () => {
      mockService.getByResume.mockReturnValue(throwError(() => new Error('Network error')));

      component.resumeFileId = 'resume-abc';
      component.ngOnChanges({ resumeFileId: buildChange(null, 'resume-abc', true) });

      expect(component.loading()).toBe(false);
    });

    it('devrait réinitialiser invitations à [] avant chaque chargement', () => {
      // Premier chargement
      mockService.getByResume.mockReturnValue(of(mockInvitations));
      component.resumeFileId = 'resume-abc';
      component.ngOnChanges({ resumeFileId: buildChange(null, 'resume-abc', true) });
      expect(component.invitations()).toHaveLength(2);

      // Deuxième chargement : entre les deux, invitations doit être []
      let capturedDuringLoad: EvaluationInvitation[] | null = null;
      mockService.getByResume.mockImplementation(() => {
        capturedDuringLoad = component.invitations();
        return of([]);
      });

      component.resumeFileId = 'resume-xyz';
      component.ngOnChanges({ resumeFileId: buildChange('resume-abc', 'resume-xyz') });

      expect(capturedDuringLoad).toEqual([]);
    });
  });

  // ─── toggleActionMenu ─────────────────────────────────────────────────────

  describe('toggleActionMenu', () => {
    it('devrait ouvrir le menu pour un id donné', () => {
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.toggleActionMenu(42, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.openActionMenuId()).toBe(42);
    });

    it('devrait fermer le menu si le même id est recliqué', () => {
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.toggleActionMenu(42, event);
      component.toggleActionMenu(42, event);

      expect(component.openActionMenuId()).toBeNull();
    });

    it('devrait basculer vers un autre id sans fermer', () => {
      const event = { stopPropagation: vi.fn() } as unknown as Event;

      component.toggleActionMenu(1, event);
      component.toggleActionMenu(2, event);

      expect(component.openActionMenuId()).toBe(2);
    });
  });

  // ─── deleteInvitation ─────────────────────────────────────────────────────

  describe('deleteInvitation', () => {
    beforeEach(() => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('ne devrait rien faire si l utilisateur annule la confirmation', () => {
      vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));

      component.deleteInvitation(1);

      expect(mockService.delete).not.toHaveBeenCalled();
    });

    it('devrait appeler le service delete avec le bon id', () => {
      mockService.delete.mockReturnValue(of(void 0));

      component.deleteInvitation(1);

      expect(mockService.delete).toHaveBeenCalledWith(1);
    });

    it('devrait retirer l invitation supprimée du signal', () => {
      mockService.delete.mockReturnValue(of(void 0));
      component.invitations.set([...mockInvitations]);

      component.deleteInvitation(1);

      expect(component.invitations().find((i) => i.id === 1)).toBeUndefined();
      expect(component.invitations()).toHaveLength(1);
    });

    it('devrait fermer le menu d action après suppression', () => {
      mockService.delete.mockReturnValue(of(void 0));
      component.openActionMenuId.set(1);

      component.deleteInvitation(1);

      expect(component.openActionMenuId()).toBeNull();
    });

    it('devrait émettre invitationDeleted avec l id supprimé', () => {
      mockService.delete.mockReturnValue(of(void 0));
      const spy = vi.spyOn(component.invitationDeleted, 'emit');
      component.invitations.set([...mockInvitations]);

      component.deleteInvitation(1);

      expect(spy).toHaveBeenCalledWith(1);
    });

    it('devrait logger l erreur sans crasher en cas d échec', () => {
      mockService.delete.mockReturnValue(throwError(() => new Error('fail')));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => component.deleteInvitation(1)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Erreur suppression');

      consoleSpy.mockRestore();
    });
  });

  // ─── getEvaluationTitle ───────────────────────────────────────────────────

  describe('getEvaluationTitle', () => {
    beforeEach(() => {
      component.evaluations = mockEvaluations;
    });

    it('devrait retourner le titre pour un id connu', () => {
      expect(component.getEvaluationTitle(10)).toBe('Éval Angular');
    });

    it('devrait retourner "—" pour un id inconnu', () => {
      expect(component.getEvaluationTitle(999)).toBe('—');
    });
  });

  // ─── isExpired ────────────────────────────────────────────────────────────

  describe('isExpired', () => {
    it('devrait retourner false si dueDate est null', () => {
      expect(component.isExpired(null)).toBe(false);
    });

    it('devrait retourner true pour une date dans le passé', () => {
      expect(component.isExpired('2000-01-01')).toBe(true);
    });

    it('devrait retourner false pour une date dans le futur', () => {
      expect(component.isExpired('2099-12-31')).toBe(false);
    });

    it('devrait traiter today (minuit UTC) comme non-expirée dans le fuseau local', () => {
      const today = new Date().toISOString().split('T')[0];
      const todayUTC = new Date(today);
      const localMidnight = new Date(new Date().toDateString());
      const expected = todayUTC < localMidnight;

      expect(component.isExpired(today)).toBe(expected);
    });
  });

  // ─── close ────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('devrait fermer le menu daction', () => {
      component.openActionMenuId.set(5);

      component.close();

      expect(component.openActionMenuId()).toBeNull();
    });

    it('devrait émettre closeModal', () => {
      const spy = vi.spyOn(component.closeModal, 'emit');

      component.close();

      expect(spy).toHaveBeenCalled();
    });
  });
});
