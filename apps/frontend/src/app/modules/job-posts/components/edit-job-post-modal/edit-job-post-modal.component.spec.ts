import { describe, it, expect, vi } from 'vitest';

import { EditJobPostModalComponent } from './edit-job-post-modal.component';
import { UploadedFile } from '../../models/job-post.model';

const buildUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  name: 'poste-1.docx',
  type: 'application/vnd.google-apps.document',
  url: '',
  isDriveFile: true,
  status: 'unified',
  isLoading: false,
  ...overrides,
});

describe('EditJobPostModalComponent', () => {
  describe('ngOnInit', () => {
    it('initialise les champs depuis les valeurs du fichier', () => {
      const component = new EditJobPostModalComponent();
      component.file = buildUploadedFile({
        title: 'DevOps Engineer',
        company: 'Devoteam',
        hasQcm: true,
        requiresCoding: true,
      });

      component.ngOnInit();

      expect(component.title()).toBe('DevOps Engineer');
      expect(component.company()).toBe('Devoteam');
      expect(component.hasQcm()).toBe(true);
      expect(component.requiresCoding()).toBe(true);
    });

    it('applique les valeurs par défaut si les champs sont absents', () => {
      const component = new EditJobPostModalComponent();
      component.file = buildUploadedFile({
        title: undefined,
        company: undefined,
        hasQcm: null,
        requiresCoding: null,
      });

      component.ngOnInit();

      expect(component.title()).toBe('');
      expect(component.company()).toBe('');
      expect(component.hasQcm()).toBe(false);
      expect(component.requiresCoding()).toBe(false);
    });
  });

  describe('onConfirm', () => {
    it('émet confirm avec les valeurs actuelles des signaux', () => {
      const component = new EditJobPostModalComponent();
      component.file = buildUploadedFile();
      component.ngOnInit();

      const confirmSpy = vi.fn();
      component.confirm.subscribe(confirmSpy);

      component.title.set('Nouveau titre');
      component.company.set('Nouvelle entreprise');
      component.hasQcm.set(true);
      component.requiresCoding.set(false);

      component.onConfirm();

      expect(confirmSpy).toHaveBeenCalledWith({
        title: 'Nouveau titre',
        company: 'Nouvelle entreprise',
        hasQcm: true,
        requiresCoding: false,
      });
    });
  });

  describe('onClose', () => {
    it('émet close', () => {
      const component = new EditJobPostModalComponent();
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.onClose();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
