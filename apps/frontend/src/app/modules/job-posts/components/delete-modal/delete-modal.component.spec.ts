import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DeleteModalComponent } from './delete-modal.component';
import { UploadedFile } from '../../models/job-post.model';

const mockFile: UploadedFile = {
  id: '1',
  name: 'test.pdf',
  type: 'application/pdf',
  url: 'https://example.com/test.pdf',
  isDriveFile: true,
  status: 'raw',
  isLoading: false,
};

async function setup(file: UploadedFile = mockFile) {
  await TestBed.configureTestingModule({});

  // Instantiate the component inside an injection context and set the input value manually
  const component = TestBed.runInInjectionContext(() => new DeleteModalComponent());
  // The `input` helper produces a getter; emulate it with a typed getter to avoid `any`.
  (component as unknown as { file: () => UploadedFile }).file = () => file;
  return { component } as unknown as { component: DeleteModalComponent };
}

describe('DeleteModalComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('input file', () => {
    it('reçoit le fichier en input', async () => {
      const { component } = await setup();
      expect(component.file()).toEqual(mockFile);
    });

    it('reçoit un fichier image', async () => {
      const imageFile: UploadedFile = { ...mockFile, type: 'image/png', name: 'photo.png' };
      const { component } = await setup(imageFile);
      expect(component.file().type).toBe('image/png');
    });
  });

  describe('output cancel', () => {
    it('émet cancel quand on annule', async () => {
      const { component } = await setup();
      let emitted = false;
      component.cancel.subscribe(() => (emitted = true));
      component.cancel.emit();
      expect(emitted).toBe(true);
    });
  });

  describe('output confirm', () => {
    it('émet confirm quand on confirme', async () => {
      const { component } = await setup();
      let emitted = false;
      component.confirm.subscribe(() => (emitted = true));
      component.confirm.emit();
      expect(emitted).toBe(true);
    });
  });

  describe('getFileIcon', () => {
    it('retourne une icône pour application/pdf', async () => {
      const { component } = await setup();
      expect(typeof component.getFileIcon('application/pdf')).toBe('string');
    });

    it('retourne une icône pour image/*', async () => {
      const { component } = await setup();
      expect(typeof component.getFileIcon('image/png')).toBe('string');
    });

    it('retourne une icône par défaut pour un type inconnu', async () => {
      const { component } = await setup();
      expect(typeof component.getFileIcon('application/zip')).toBe('string');
    });

    it('retourne une chaîne vide si le type est absent', async () => {
      const { component } = await setup();
      expect(component.getFileIcon(undefined)).toBe('');
    });

    it('retourne une chaîne vide si le type est vide', async () => {
      const { component } = await setup();
      expect(component.getFileIcon('')).toBe('');
    });
  });
});
