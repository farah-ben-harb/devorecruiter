import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';

import { ResumeEvaluationFacade } from './resume-evaluations.facade';
import { CandidatesService } from '../../services/candidates.service';
import { BrowserUiService } from '@core/services/browser-ui.service';
import { UiFacade } from '../uis/ui.facade';
import {
  ResumeListItem,
  ScoringResult,
  TriggerScoringResponse,
} from '../../models/candidate.model';

const mockResume: ResumeListItem = {
  id: 'cand-1',
  name: 'CV_Test.pdf',
  driveLink: 'https://drive.google.com/file/d/drive-1/view',
  driveId: 'drive-1',
  type: 'brut',
  createdAt: '2024-01-15T10:00:00Z',
  status: 'pending',
  hasUnifie: false,
};

const mockScoringResult: ScoringResult = {
  id: 'scoring-1',
  candidateId: 'cand-1',
  status: 'done',
  totalMatch: 2,
  matches: [
    {
      fileId: 'file-1',
      fileName: 'Offre Dev.pdf',
      jobTitle: 'Développeur Frontend',
      scoreGlobal: 78,
      status: 'MATCH',
      createdAt: '2024-03-01T00:00:00Z',
      detail: {
        scoreGlobal: 78,
        recommendation: 'ACCEPTED',
        resume: 'Profil intéressant',
        strengths: ['Bonne communication'],
        weaknesses: ["Peu d'expérience"],
        technicalSkills: { score: 75, detail: 'Correct' },
        experience: { score: 70, detail: 'Junior' },
        education: { score: 85, detail: 'Bonne formation' },
        softSkills: { score: 80, detail: 'Bon esprit' },
        languages: { score: 80, detail: 'Bilingue' },
      },
    },
  ],
  createdAt: '2024-03-01T00:00:00Z',
  completedAt: null,
};

const mockTriggerResponse: TriggerScoringResponse = {
  message: 'Scoring terminé',
  scoringId: 'scoring-42',
  totalMatch: 1,
  matches: [],
  completedAt: '2024-03-02T00:00:00Z',
};

function createServiceMock() {
  return {
    getScoringResult: vi.fn().mockReturnValue(of(mockScoringResult)),
    triggerScoring: vi.fn().mockReturnValue(of(mockTriggerResponse)),
    downloadJobPost: vi
      .fn()
      .mockReturnValue(of({ data: btoa('pdf-content'), mimeType: 'application/pdf' })),
  };
}

function createBrowserUiMock() {
  return {
    addBodyClass: vi.fn(),
    removeBodyClass: vi.fn(),
  };
}

function createUiMock() {
  return {
    toast: vi.fn(),
    dialogConfig: vi.fn(),
    dialogVisible: vi.fn(),
    showInvalidFileModal: vi.fn(),
    showToast: vi.fn(),
    toastSuccess: vi.fn(),
    dialogError: vi.fn(),
    openDialog: vi.fn(),
    closeDialog: vi.fn(),
    hideToast: vi.fn(),
    closeInvalidFileModal: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('ResumeEvaluationFacade', () => {
  let facade: ResumeEvaluationFacade;
  let service: ReturnType<typeof createServiceMock>;
  let browserUi: ReturnType<typeof createBrowserUiMock>;

  beforeEach(async () => {
    service = createServiceMock();
    browserUi = createBrowserUiMock();

    await TestBed.configureTestingModule({
      providers: [
        ResumeEvaluationFacade,
        { provide: CandidatesService, useValue: service },
        { provide: BrowserUiService, useValue: browserUi },
        { provide: UiFacade, useValue: createUiMock() },
      ],
    }).compileComponents();

    facade = TestBed.inject(ResumeEvaluationFacade);
  });

  // ── openScoringPanel ──────────────────────────────────────────────────────

  describe('openScoringPanel', () => {
    it('définit le CV courant et réinitialise les signals', () => {
      facade.openScoringPanel(mockResume);

      expect(facade.scoringPanelResume()).toEqual(mockResume);
      expect(facade.scoringResult()).not.toBeNull();
      expect(facade.scoringError()).toBe('');
    });

    it('ajoute la classe modal-open au body', () => {
      facade.openScoringPanel(mockResume);
      expect(browserUi.addBodyClass).toHaveBeenCalledWith('modal-open');
    });

    it('charge le résultat de scoring', () => {
      facade.openScoringPanel(mockResume);
      expect(service.getScoringResult).toHaveBeenCalledWith('cand-1');
      expect(facade.scoringLoading()).toBe(false);
      expect(facade.scoringResult()).not.toBeNull();
    });
  });

  // ── closeScoringPanel ─────────────────────────────────────────────────────

  describe('closeScoringPanel', () => {
    it('remet tous les signals à null/vide', () => {
      facade.openScoringPanel(mockResume);
      facade.closeScoringPanel();

      expect(facade.scoringPanelResume()).toBeNull();
      expect(facade.scoringResult()).toBeNull();
      expect(facade.scoringError()).toBe('');
    });

    it('supprime la classe modal-open du body', () => {
      facade.openScoringPanel(mockResume);
      facade.closeScoringPanel();
      expect(browserUi.removeBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  // ── loadScoringResult ─────────────────────────────────────────────────────

  describe('loadScoringResult', () => {
    it('charge et mappe le résultat de scoring', () => {
      facade.loadScoringResult('cand-1');

      expect(service.getScoringResult).toHaveBeenCalledWith('cand-1');
      expect(facade.scoringResult()).not.toBeNull();
      expect(facade.scoringResult()!.candidateId).toBe('cand-1');
      expect(facade.scoringLoading()).toBe(false);
    });

    it('stocke null si le service retourne null', () => {
      service.getScoringResult.mockReturnValue(of(null));
      facade.loadScoringResult('cand-1');
      expect(facade.scoringResult()).toBeNull();
      expect(facade.scoringLoading()).toBe(false);
    });

    it('gère une erreur et met à jour scoringError', () => {
      service.getScoringResult.mockReturnValue(throwError(() => new Error('Network error')));
      facade.loadScoringResult('cand-1');

      expect(facade.scoringError()).toBe('Impossible de charger les résultats.');
      expect(facade.scoringLoading()).toBe(false);
    });
  });

  // ── triggerScoring ────────────────────────────────────────────────────────

  describe('triggerScoring', () => {
    it('déclenche le scoring et met à jour le résultat', () => {
      facade.triggerScoring('cand-1');

      expect(service.triggerScoring).toHaveBeenCalledWith('cand-1');
      expect(facade.scoringResult()).not.toBeNull();
      expect(facade.scoringResult()!.id).toBe('scoring-42');
      expect(facade.scoringTriggering()).toBe(false);
    });

    it('réinitialise scoringError avant de lancer', () => {
      facade.scoringError.set('ancienne erreur');
      facade.triggerScoring('cand-1');
      expect(facade.scoringError()).toBe('');
    });

    it('gère une erreur avec message imbriqué', () => {
      service.triggerScoring.mockReturnValue(
        throwError(() => ({ error: { message: 'Erreur serveur' } })),
      );
      facade.triggerScoring('cand-1');

      expect(facade.scoringError()).toBe('Erreur serveur');
      expect(facade.scoringTriggering()).toBe(false);
    });

    it('gère une erreur avec message simple', () => {
      service.triggerScoring.mockReturnValue(throwError(() => ({ message: 'Erreur réseau' })));
      facade.triggerScoring('cand-1');

      expect(facade.scoringError()).toBe('Erreur réseau');
      expect(facade.scoringTriggering()).toBe(false);
    });

    it('utilise le message par défaut si aucun message disponible', () => {
      service.triggerScoring.mockReturnValue(throwError(() => ({})));
      facade.triggerScoring('cand-1');
      expect(facade.scoringError()).toBe('Erreur lors du déclenchement');
    });
  });

  // ── downloadJobPost ───────────────────────────────────────────────────────

  describe('downloadJobPost', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:fake-url'),
        revokeObjectURL: vi.fn(),
      });

      const mockAnchor = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(
        () => mockAnchor as unknown as Node,
      );
      vi.spyOn(document.body, 'removeChild').mockImplementation(
        () => mockAnchor as unknown as Node,
      );
    });

    it('télécharge le fichier et réinitialise downloadingFileId', () => {
      facade.downloadJobPost('file-1', 'Offre Dev.pdf');

      expect(service.downloadJobPost).toHaveBeenCalledWith('file-1');
      expect(facade.downloadingFileId()).toBeNull();
    });

    it('ignore un second appel si un téléchargement est déjà en cours', () => {
      facade.downloadingFileId.set('file-already');
      facade.downloadJobPost('file-1', 'Offre Dev.pdf');
      expect(service.downloadJobPost).not.toHaveBeenCalled();
    });

    it("remet downloadingFileId à null en cas d'erreur", () => {
      service.downloadJobPost.mockReturnValue(throwError(() => new Error('Download error')));
      facade.downloadJobPost('file-1', 'Offre Dev.pdf');
      expect(facade.downloadingFileId()).toBeNull();
    });
  });

  // ── destroy ───────────────────────────────────────────────────────────────

  describe('destroy', () => {
    it('complète le subject sans erreur', () => {
      expect(() => facade.destroy()).not.toThrow();
    });

    it('arrête les souscriptions actives après destroy', () => {
      const subject = new Subject<ScoringResult | null>();
      service.getScoringResult.mockReturnValue(subject.asObservable());

      // 1. Lancer le chargement AVANT destroy — scoringLoading passe à true
      facade.loadScoringResult('cand-1');
      expect(facade.scoringLoading()).toBe(true);

      // 2. Détruire le facade — takeUntil complète la souscription
      facade.destroy();

      // 3. Émettre une valeur — le flux est coupé, rien ne se passe
      subject.next(mockScoringResult);

      // scoringLoading reste true car le next() n'a pas été traité
      expect(facade.scoringLoading()).toBe(true);
    });
  });
});
