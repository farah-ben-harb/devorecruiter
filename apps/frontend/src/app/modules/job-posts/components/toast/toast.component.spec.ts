import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { Toast } from '../../models/job-post.model';

const mockToastSuccess: Toast = {
  message: 'Opération réussie',
  type: 'success',
  visible: true,
};

const mockToastError: Toast = {
  message: 'Une erreur est survenue',
  type: 'error',
  visible: true,
};

const mockToastHidden: Toast = {
  message: '',
  type: 'info',
  visible: false,
};

async function setup(toast: Toast = mockToastSuccess) {
  await TestBed.configureTestingModule({});
  const component = TestBed.runInInjectionContext(() => new ToastComponent());
  Object.defineProperty(component, 'toast', {
    value: () => toast,
    configurable: true,
  });
  return { component };
}

describe('ToastComponent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('input toast', () => {
    it('reçoit un toast success', async () => {
      const { component } = await setup(mockToastSuccess);
      expect(component.toast().type).toBe('success');
      expect(component.toast().visible).toBe(true);
      expect(component.toast().message).toBe('Opération réussie');
    });

    it('reçoit un toast error', async () => {
      const { component } = await setup(mockToastError);
      expect(component.toast().type).toBe('error');
      expect(component.toast().message).toBe('Une erreur est survenue');
    });

    it('reçoit un toast non visible', async () => {
      const { component } = await setup(mockToastHidden);
      expect(component.toast().visible).toBe(false);
    });

    it('reçoit un toast info', async () => {
      const { component } = await setup({ message: 'Info', type: 'info', visible: true });
      expect(component.toast().type).toBe('info');
    });
  });

  describe('output dismiss', () => {
    it('émet dismiss', async () => {
      const { component } = await setup();
      let emitted = false;
      component.dismiss.subscribe(() => (emitted = true));
      component.dismiss.emit();
      expect(emitted).toBe(true);
    });

    it('émet dismiss plusieurs fois', async () => {
      const { component } = await setup();
      let count = 0;
      component.dismiss.subscribe(() => count++);
      component.dismiss.emit();
      component.dismiss.emit();
      expect(count).toBe(2);
    });
  });
});
