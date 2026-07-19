import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CandidatesFacade } from '../candidates/candidates.facade';
import { CandidatesService } from '../../services/candidates.service';
import { BrowserUiService } from '@core/services/browser-ui.service';
import { ResumeListItem, ScoringResult } from '../../models/candidate.model';
import { PaginatedResponse } from '@shared/models/shared.model';
import { UiFacade } from '../uis/ui.facade';
import { ResumeEvaluationFacade } from '../resume-evaluations/resume-evaluations.facade';

const mockResume: ResumeListItem = {
  id: 'cand-1',
  name: 'CV_Test.pdf',
  driveId: 'drive-brut-1',
  driveLink: 'https://drive.google.com/file/d/drive-brut-1/view',
  status: 'pending',
  type: 'brut',
  hasUnifie: false,
  createdAt: '2024-01-15T10:00:00Z',
};

const mockPaginated: PaginatedResponse<ResumeListItem> = {
  data: [mockResume],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockScoringResult: ScoringResult = {
  id: 'scoring-1',
  candidateId: 'cand-1',
  status: 'done',
  totalMatch: 0,
  matches: null,
  createdAt: '2024-03-01T00:00:00Z',
  completedAt: null,
};

const mockResumeItem: ResumeListItem = {
  id: 'cand-1',
  name: 'CV_Test.pdf',
  driveLink: 'https://drive.google.com/file/d/drive-brut-1/view',
  driveId: 'drive-brut-1',
  type: 'brut',
  createdAt: '2024-01-15T10:00:00Z',
  status: 'pending',
  hasUnifie: false,
};

const mockRaw = {
  id: 'cand-1',
  name: 'CV_Test.pdf',
  driveLink: 'https://drive.google.com/file/d/drive-brut-1/view',
  driveId: 'drive-brut-1',
  type: 'brut',
  createdAt: '2024-01-15T10:00:00Z',
  status: 'pending',
  hasUnifie: false,
  hasMissingFields: false,
  email: null,
  githubUsername: null,
};

const mockUnifieResume: ResumeListItem = {
  id: 'cand-2',
  name: 'CV_Unifie.pdf',
  driveId: 'drive-unifie-1',
  driveLink: 'https://drive.google.com/file/d/drive-unifie-1/view',
  status: 'done',
  type: 'unifie',
  hasUnifie: true,
  createdAt: '2024-01-15T10:00:00Z',
};

function createServiceMock() {
  return {
    syncDrive: vi.fn().mockReturnValue(of({ synced: 0 })),
    getAll: vi.fn().mockReturnValue(of(mockPaginated)),
    uploadResume: vi.fn().mockReturnValue(of(mockResumeItem)),
    deleteResume: vi.fn().mockReturnValue(of(void 0)),
    triggerUnification: vi.fn().mockReturnValue(of({ message: 'Unification lancée' })),
    listDriveFiles: vi.fn().mockReturnValue(of([])),
    downloadDriveFile: vi
      .fn()
      .mockReturnValue(of(new Blob(['content'], { type: 'application/pdf' }))),
    getScoringResult: vi.fn().mockReturnValue(of(mockScoringResult)),
    triggerScoring: vi.fn().mockReturnValue(of(mockScoringResult)),
    downloadJobPost: vi
      .fn()
      .mockReturnValue(of({ data: btoa('pdf-content'), mimeType: 'application/pdf' })),
    updateFields: vi
      .fn()
      .mockReturnValue(of({ ...mockRaw, githubUsername: 'john-doe', email: 'john@example.com' })),
  };
}

function createBrowserUiMock() {
  return {
    addBodyClass: vi.fn(),
    removeBodyClass: vi.fn(),
  };
}

describe('CandidatesFacade', () => {
  let facade: CandidatesFacade;
  let service: ReturnType<typeof createServiceMock>;
  let browserUi: ReturnType<typeof createBrowserUiMock>;

  beforeEach(async () => {
    service = createServiceMock();
    browserUi = createBrowserUiMock();

    await TestBed.configureTestingModule({
      providers: [
        UiFacade,
        ResumeEvaluationFacade,
        CandidatesFacade,
        { provide: CandidatesService, useValue: service },
        { provide: BrowserUiService, useValue: browserUi },
      ],
    }).compileComponents();

    facade = TestBed.inject(CandidatesFacade);
  });

  // ── init ──────────────────────────────────────────────────────────────────

  describe('init', () => {
    it('charge et mappe les CVs depuis getAll', () => {
      vi.useFakeTimers();

      facade.init();

      vi.advanceTimersByTime(2000);
      expect(service.syncDrive).toHaveBeenCalled();
      expect(service.getAll).toHaveBeenCalledWith(1, 9999);
      expect(facade.resumes()[0].name).toBe('CV_Test.pdf');
      expect(facade.resumes()[0].type).toBe('brut');
    });

    it('met à jour les métadonnées de pagination', () => {
      vi.useFakeTimers();

      facade.init();
      vi.advanceTimersByTime(2000);
      expect(facade.totalItems()).toBe(1);
      expect(facade.totalPages()).toBe(1);
    });

    it('affiche un toast info si syncDrive retourne des fichiers synchronisés', () => {
      vi.useFakeTimers();

      service.syncDrive.mockReturnValue(of({ added: 3, removed: 0 }));
      facade.init();
      vi.advanceTimersByTime(2000);
      expect(facade.toast().type).toBe('info');
      expect(facade.toast().visible).toBe(true);
    });

    it('charge quand même les CVs si syncDrive échoue', () => {
      vi.useFakeTimers();

      service.syncDrive.mockReturnValue(throwError(() => new Error('Sync error')));
      facade.init();
      vi.advanceTimersByTime(2000);
      expect(service.getAll).toHaveBeenCalled();
    });

    it('gère une erreur de chargement', () => {
      vi.useFakeTimers();

      service.getAll.mockReturnValue(throwError(() => new Error('Network error')));
      facade.init();
      vi.advanceTimersByTime(2000);
      expect(facade.loading()).toBe(false);
      expect(facade.toast().type).toBe('error');
    });
  });

  // ── goToPage ──────────────────────────────────────────────────────────────

  describe('goToPage', () => {
    it('change de page sans recharger', () => {
      facade.resumes.set(
        Array.from({ length: 30 }, (_, i) => ({
          ...mockResume,
          id: `cand-${i + 1}`,
          name: `CV_${i + 1}.pdf`,
        })),
      );
      facade.goToPage(2);
      expect(facade.currentPage()).toBe(2);
      expect(service.getAll).not.toHaveBeenCalled();
    });

    it('ignore une page hors limites', () => {
      facade.resumes.set([
        mockResumeItem,
        { ...mockResumeItem, id: 'cand-2', driveId: 'drive-brut-2', name: 'CV_2.pdf' },
      ]);
      facade.itemsPerPage.set(1);

      facade.goToPage(0);
      expect(facade.currentPage()).toBe(1);
    });

    it('ignore une page supérieure au total', () => {
      facade.resumes.set([
        mockResumeItem,
        { ...mockResumeItem, id: 'cand-2', driveId: 'drive-brut-2', name: 'CV_2.pdf' },
      ]);
      facade.itemsPerPage.set(1);

      facade.goToPage(5);
      expect(facade.currentPage()).toBe(1);
    });
  });

  // ── setFilter ─────────────────────────────────────────────────────────────

  describe('setFilter', () => {
    it('filtre les CVs par type', () => {
      facade.init();
      facade.setFilter('brut');
      expect(facade.filtered().every((c) => c.type === 'brut')).toBe(true);
    });

    it('retourne tous les CVs avec le filtre "all"', () => {
      facade.init();
      facade.setFilter('all');
      expect(facade.filter()).toBe('all');
    });
  });

  // ── setSort ───────────────────────────────────────────────────────────────

  describe('setSort', () => {
    it('inverse le sens si même champ', () => {
      facade.sortField.set('name');
      facade.sortAsc.set(true);
      facade.setSort('name');
      expect(facade.sortAsc()).toBe(false);
    });

    it("change de champ et remet l'ordre croissant", () => {
      facade.setSort('status');
      expect(facade.sortField()).toBe('status');
      expect(facade.sortAsc()).toBe(true);
    });
  });

  // ── setSearchQuery ────────────────────────────────────────────────────────

  describe('setSearchQuery', () => {
    it('met à jour la query et remet la page à 1', () => {
      facade.currentPage.set(3);
      facade.setSearchQuery('test');
      expect(facade.searchQuery()).toBe('test');
      expect(facade.currentPage()).toBe(1);
    });
  });

  // ── deleteResume ──────────────────────────────────────────────────────────

  describe('deleteResume', () => {
    it('ouvre la modale de suppression et configure resumeToDelete', () => {
      facade.init();
      const target = facade.resumes()[0];
      facade.deleteResume(target);

      expect(facade.showDeleteModal()).toBe(true);
      expect(facade.resumeToDelete()).toEqual(target);
      expect(browserUi.addBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  // ── closeDeleteModal ──────────────────────────────────────────────────────

  describe('closeDeleteModal', () => {
    it('ferme la modale et remet resumeToDelete à null', () => {
      facade.init();
      facade.deleteResume(facade.resumes()[0]);
      facade.closeDeleteModal();

      expect(facade.showDeleteModal()).toBe(false);
      expect(facade.resumeToDelete()).toBeNull();
      expect(browserUi.removeBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  // ── confirmDelete ─────────────────────────────────────────────────────────

  describe('confirmDelete', () => {
    it('supprime un CV et recharge la liste', () => {
      facade.init();
      const target = facade.resumes()[0]; // type === 'brut' ✅
      facade.deleteResume(target);
      facade.confirmDelete();

      expect(service.deleteResume).toHaveBeenCalledWith('cand-1', 'brut');
      expect(facade.showDeleteModal()).toBe(false);
      expect(facade.toast().type).toBe('success');
    });

    it("gère l'erreur de suppression", () => {
      service.deleteResume.mockReturnValue(throwError(() => new Error('Erreur réseau')));
      facade.init();
      facade.deleteResume(facade.resumes()[0]);
      facade.confirmDelete();
      expect(facade.showDeleteModal()).toBe(false);
      expect(facade.dialogVisible()).toBe(true);
    });
  });

  // ── unify ─────────────────────────────────────────────────────────────────

  describe('unify', () => {
    it("ouvre le dialog de confirmation d'unification", () => {
      facade.init();
      facade.unify(facade.resumes()[0]);
      expect(facade.dialogVisible()).toBe(true);
      expect(facade.dialogConfig()?.type).toBe('warning');
    });

    it('déclenche triggerUnification après confirmation', () => {
      facade.init();
      facade.unify(facade.resumes()[0]);
      facade.confirmDialog();
      expect(service.triggerUnification).toHaveBeenCalledWith('cand-1');
    });
  });

  // ── downloadResume ────────────────────────────────────────────────────────

  describe('downloadResume', () => {
    it('appelle downloadDriveFile et déclenche le callback avec le blob', () => {
      facade.init();
      const resume = facade.resumes()[0];
      const triggerDownload = vi.fn();

      facade.downloadResume(resume, triggerDownload);

      // Le service prend 1 seul argument maintenant
      expect(service.downloadDriveFile).toHaveBeenCalledWith(resume.driveId);
      expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), resume.name);
    });

    it('affiche un dialog erreur si le téléchargement échoue', () => {
      service.downloadDriveFile.mockReturnValue(throwError(() => new Error('Download error')));
      facade.init();
      const resume = facade.resumes()[0];

      facade.downloadResume(resume, vi.fn());

      expect(facade.dialogVisible()).toBe(true);
    });
  });

  // ── openDriveModal ────────────────────────────────────────────────────────

  describe('openDriveModal', () => {
    it('ouvre la modale et charge les fichiers Drive', () => {
      facade.openDriveModal();
      expect(facade.isModalOpen()).toBe(true);
      expect(service.listDriveFiles).toHaveBeenCalled();
      expect(browserUi.addBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  // ── closeModal ────────────────────────────────────────────────────────────

  describe('closeModal', () => {
    it('ferme la modale Drive', () => {
      facade.openDriveModal();
      facade.closeModal();
      expect(facade.isModalOpen()).toBe(false);
      expect(browserUi.removeBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  // ── openScoringPanel ──────────────────────────────────────────────────────

  describe('openScoringPanel', () => {
    it('ouvre le panel et charge le résultat de scoring', () => {
      facade.init();
      const resume = facade.resumes()[0];
      facade.openScoringPanel(resume);

      expect(facade.scoringPanelResume()).toEqual(resume);
      expect(service.getScoringResult).toHaveBeenCalledWith('cand-1');
      expect(browserUi.addBodyClass).toHaveBeenCalledWith('modal-open');
    });

    it('mappe et stocke le résultat de scoring', () => {
      facade.init();
      facade.openScoringPanel(facade.resumes()[0]);
      expect(facade.scoringResult()).not.toBeNull();
      expect(facade.scoringLoading()).toBe(false);
    });

    it('gère une erreur de chargement du scoring', () => {
      service.getScoringResult.mockReturnValue(throwError(() => new Error('Scoring error')));
      facade.init();
      facade.openScoringPanel(facade.resumes()[0]);
      expect(facade.scoringError()).toBeTruthy();
      expect(facade.scoringLoading()).toBe(false);
    });
  });

  // ── closeScoringPanel ─────────────────────────────────────────────────────

  describe('closeScoringPanel', () => {
    it('ferme le panel et réinitialise les signals', () => {
      facade.init();
      facade.openScoringPanel(facade.resumes()[0]);
      facade.closeScoringPanel();

      expect(facade.scoringPanelResume()).toBeNull();
      expect(facade.scoringResult()).toBeNull();
      expect(facade.scoringError()).toBe('');
      expect(browserUi.removeBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  // ── triggerScoring ────────────────────────────────────────────────────────

  describe('triggerScoring', () => {
    it('déclenche le scoring et met à jour le résultat', () => {
      facade.triggerScoring('cand-1');
      expect(service.triggerScoring).toHaveBeenCalledWith('cand-1');
      expect(facade.scoringResult()).not.toBeNull();
      expect(facade.scoringTriggering()).toBe(false);
    });

    it('gère une erreur de scoring', () => {
      service.triggerScoring.mockReturnValue(throwError(() => ({ message: 'Trigger error' })));
      facade.triggerScoring('cand-1');
      expect(facade.scoringError()).toBeTruthy();
      expect(facade.scoringTriggering()).toBe(false);
    });
  });

  // ── hideToast ─────────────────────────────────────────────────────────────

  describe('hideToast', () => {
    it('masque le toast', () => {
      facade.init();
      facade.hideToast();
      expect(facade.toast().visible).toBe(false);
    });
  });

  // ── openMissingFieldsModal ────────────────────────────────────────────────

  describe('openMissingFieldsModal', () => {
    it('ouvre le modal et définit la cible', () => {
      facade.openMissingFieldsModal(mockUnifieResume);

      expect(facade.showMissingFieldsModal()).toBe(true);
      expect(facade.missingFieldsTarget()).toEqual(mockUnifieResume);
    });
  });

  // ── closeMissingFieldsModal ───────────────────────────────────────────────

  describe('closeMissingFieldsModal', () => {
    it('ferme le modal et remet la cible à null', () => {
      facade.openMissingFieldsModal(mockUnifieResume);
      facade.closeMissingFieldsModal();

      expect(facade.showMissingFieldsModal()).toBe(false);
      expect(facade.missingFieldsTarget()).toBeNull();
    });
  });

  // ── saveFields ────────────────────────────────────────────────────────────

  describe('saveFields', () => {
    it('ne fait rien si aucune cible définie', () => {
      facade.saveFields({ githubUsername: 'john', email: 'john@example.com' });
      expect(service.updateFields).not.toHaveBeenCalled();
    });

    it('appelle updateFields avec les bons paramètres', () => {
      facade.openMissingFieldsModal(mockUnifieResume);
      facade.saveFields({ githubUsername: 'john-doe', email: 'john@example.com' });

      expect(service.updateFields).toHaveBeenCalledWith('cand-2', {
        githubUsername: 'john-doe',
        email: 'john@example.com',
      });
    });

    it('ferme le modal et affiche un toast succès après sauvegarde', () => {
      facade.openMissingFieldsModal(mockUnifieResume);
      facade.saveFields({ githubUsername: 'john-doe', email: 'john@example.com' });

      expect(facade.showMissingFieldsModal()).toBe(false);
      expect(facade.missingFieldsTarget()).toBeNull();
      expect(facade.toast().type).toBe('success');
      expect(facade.savingFields()).toBe(false);
    });

    it('affiche un dialog erreur si la sauvegarde échoue', () => {
      service.updateFields.mockReturnValue(throwError(() => new Error('Save error')));
      facade.openMissingFieldsModal(mockUnifieResume);
      facade.saveFields({ githubUsername: 'john-doe' });

      expect(facade.dialogVisible()).toBe(true);
      expect(facade.savingFields()).toBe(false);
    });
  });
});
