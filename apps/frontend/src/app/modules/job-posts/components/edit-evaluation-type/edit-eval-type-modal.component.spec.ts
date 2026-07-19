import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EditEvalTypeModalComponent } from './edit-eval-type-modal.component';
import { JobPostService } from '../../services/job-posts.service';
import { UploadedFile } from '../../models/job-post.model';

type JobPostServiceMock = Pick<JobPostService, 'updateRequiresCoding' | 'updateHasQcm'>;

const buildUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  id: '10',
  name: 'poste-1.docx',
  type: 'application/vnd.google-apps.document',
  url: '',
  isDriveFile: true,
  status: 'unified',
  isLoading: false,
  ...overrides,
});

describe('EditEvalTypeModalComponent', () => {
  let component: EditEvalTypeModalComponent;
  let jobPostServiceMock: JobPostServiceMock;

  beforeEach(() => {
    jobPostServiceMock = {
      updateRequiresCoding: vi.fn().mockReturnValue(of({})),
      updateHasQcm: vi.fn().mockReturnValue(of({})),
    };

    // Instanciation directe : le composant utilise l'injection par
    // constructeur, ce qui provoque NG0202 avec TestBed dans cet
    // environnement Vitest. `new` contourne le problème sans toucher au fichier.
    component = new EditEvalTypeModalComponent(jobPostServiceMock as JobPostService);
  });

  describe('ngOnInit', () => {
    it('initialise hasQcm et requiresCoding depuis file', () => {
      component.file = buildUploadedFile({ hasQcm: true, requiresCoding: true });

      component.ngOnInit();

      expect(component.hasQcm()).toBe(true);
      expect(component.requiresCoding()).toBe(true);
    });

    it('applique false par défaut si les champs sont null', () => {
      component.file = buildUploadedFile({ hasQcm: null, requiresCoding: null });

      component.ngOnInit();

      expect(component.hasQcm()).toBe(false);
      expect(component.requiresCoding()).toBe(false);
    });
  });

  describe('toggleQcm / toggleCoding', () => {
    it('toggleQcm met à jour hasQcm', () => {
      component.toggleQcm(true);
      expect(component.hasQcm()).toBe(true);

      component.toggleQcm(false);
      expect(component.hasQcm()).toBe(false);
    });

    it('toggleCoding met à jour requiresCoding', () => {
      component.toggleCoding(true);
      expect(component.requiresCoding()).toBe(true);

      component.toggleCoding(false);
      expect(component.requiresCoding()).toBe(false);
    });
  });

  describe('save', () => {
    it('ne fait rien si file.id est absent', () => {
      component.file = buildUploadedFile({ id: undefined });

      component.save();

      expect(jobPostServiceMock.updateRequiresCoding).not.toHaveBeenCalled();
      expect(jobPostServiceMock.updateHasQcm).not.toHaveBeenCalled();
      expect(component.saving()).toBe(false);
    });

    it('appelle updateRequiresCoding et updateHasQcm avec les valeurs actuelles', async () => {
      component.file = buildUploadedFile({ id: '42' });
      component.toggleQcm(true);
      component.toggleCoding(true);

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(jobPostServiceMock.updateRequiresCoding).toHaveBeenCalledWith(42, true);
      expect(jobPostServiceMock.updateHasQcm).toHaveBeenCalledWith(42, true);
    });

    it('émet saved avec hasQcm et requiresCoding en cas de succès', async () => {
      const savedSpy = vi.fn();
      component.saved.subscribe(savedSpy);
      component.file = buildUploadedFile({ id: '10' });
      component.toggleQcm(true);
      component.toggleCoding(false);

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(savedSpy).toHaveBeenCalledWith({ hasQcm: true, requiresCoding: false });
    });

    it('définit errorMsg en cas d’échec', async () => {
      jobPostServiceMock.updateRequiresCoding = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('network error')));
      component.file = buildUploadedFile({ id: '10' });

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(component.errorMsg()).toBe('Erreur lors de la sauvegarde. Veuillez réessayer.');
    });

    it('convertit file.id (string) en number pour les appels au service', async () => {
      component.file = buildUploadedFile({ id: '99' });

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(jobPostServiceMock.updateRequiresCoding).toHaveBeenCalledWith(99, expect.any(Boolean));
    });
  });

  describe('onClose', () => {
    it('émet close', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.onClose();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
