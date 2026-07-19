import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';

import { UiFacade } from './ui.facade';
import { BrowserUiService } from '@core/services/browser-ui.service';

function createBrowserUiMock() {
  return {
    addBodyClass: vi.fn(),
    removeBodyClass: vi.fn(),
  };
}

describe('UiFacade', () => {
  let facade: UiFacade;
  let browserUi: ReturnType<typeof createBrowserUiMock>;

  beforeEach(async () => {
    browserUi = createBrowserUiMock();
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      providers: [UiFacade, { provide: BrowserUiService, useValue: browserUi }],
    }).compileComponents();

    facade = TestBed.inject(UiFacade);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('état initial', () => {
    it('toast est invisible par défaut', () => {
      expect(facade.toast().visible).toBe(false);
      expect(facade.toast().message).toBe('');
      expect(facade.toast().type).toBe('info');
    });

    it('dialog est fermé par défaut', () => {
      expect(facade.dialogVisible()).toBe(false);
      expect(facade.dialogConfig()).toBeNull();
    });

    it('showInvalidFileModal est false par défaut', () => {
      expect(facade.showInvalidFileModal()).toBe(false);
    });
  });

  describe('showToast', () => {
    it('affiche un toast avec le bon message et type', () => {
      facade.showToast('Message test', 'success');
      expect(facade.toast().message).toBe('Message test');
      expect(facade.toast().type).toBe('success');
      expect(facade.toast().visible).toBe(true);
    });

    it('masque le toast automatiquement après la durée', () => {
      facade.showToast('Message test', 'info', 3000);
      expect(facade.toast().visible).toBe(true);
      vi.advanceTimersByTime(3000);
      expect(facade.toast().visible).toBe(false);
    });

    it('annule le timer précédent si showToast est rappelé', () => {
      facade.showToast('Premier', 'info', 3000);
      vi.advanceTimersByTime(1000);
      facade.showToast('Second', 'success', 3000);
      vi.advanceTimersByTime(2500);
      expect(facade.toast().visible).toBe(true);
      expect(facade.toast().message).toBe('Second');
    });

    it('supporte les trois types de toast', () => {
      facade.showToast('ok', 'success');
      expect(facade.toast().type).toBe('success');
      facade.showToast('err', 'error');
      expect(facade.toast().type).toBe('error');
      facade.showToast('info', 'info');
      expect(facade.toast().type).toBe('info');
    });
  });

  describe('hideToast', () => {
    it('masque le toast sans effacer le message', () => {
      facade.showToast('Message', 'success');
      facade.hideToast();
      expect(facade.toast().visible).toBe(false);
      expect(facade.toast().message).toBe('Message');
    });
  });

  describe('toastSuccess', () => {
    it('affiche un toast de type success', () => {
      facade.toastSuccess('Opération réussie');
      expect(facade.toast().message).toBe('Opération réussie');
      expect(facade.toast().type).toBe('success');
      expect(facade.toast().visible).toBe(true);
    });
  });

  describe('openDialog', () => {
    it('ouvre le dialog avec la config fournie', () => {
      const config = {
        type: 'warning' as const,
        title: 'Titre',
        message: 'Message',
        confirmText: 'OK',
      };
      facade.openDialog(config);
      expect(facade.dialogVisible()).toBe(true);
      expect(facade.dialogConfig()).toEqual(config);
      expect(browserUi.addBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  describe('confirmDialog', () => {
    it('appelle onConfirm et ferme le dialog', () => {
      const onConfirm = vi.fn();
      facade.openDialog({
        type: 'warning',
        title: 'Titre',
        message: 'Message',
        confirmText: 'OK',
        onConfirm,
      });
      facade.confirmDialog();
      expect(onConfirm).toHaveBeenCalledOnce();
      expect(facade.dialogVisible()).toBe(false);
      expect(facade.dialogConfig()).toBeNull();
    });

    it('fonctionne sans onConfirm défini', () => {
      facade.openDialog({ type: 'info', title: 'Titre', message: 'Message', confirmText: 'OK' });
      expect(() => facade.confirmDialog()).not.toThrow();
      expect(facade.dialogVisible()).toBe(false);
    });
  });

  describe('closeDialog', () => {
    it('ferme le dialog et retire la classe modal-open', () => {
      facade.openDialog({ type: 'info', title: 'Titre', message: 'Message', confirmText: 'OK' });
      facade.closeDialog();
      expect(facade.dialogVisible()).toBe(false);
      expect(facade.dialogConfig()).toBeNull();
      expect(browserUi.removeBodyClass).toHaveBeenCalledWith('modal-open');
    });
  });

  describe('dialogError', () => {
    it('ouvre un dialog de type error avec le bon titre et message', () => {
      facade.dialogError('Titre erreur', 'Description erreur');
      expect(facade.dialogVisible()).toBe(true);
      expect(facade.dialogConfig()?.type).toBe('error');
      expect(facade.dialogConfig()?.title).toBe('Titre erreur');
      expect(facade.dialogConfig()?.message).toBe('Description erreur');
      expect(facade.dialogConfig()?.confirmText).toBe('OK');
    });
  });

  describe('closeInvalidFileModal', () => {
    it('ferme le modal de fichier invalide', () => {
      facade.showInvalidFileModal.set(true);
      facade.closeInvalidFileModal();
      expect(facade.showInvalidFileModal()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('annule le timer actif sans erreur', () => {
      facade.showToast('Message', 'info', 5000);
      expect(facade.toast().visible).toBe(true); // visible avant destroy

      expect(() => facade.destroy()).not.toThrow();

      // Le timer est annulé — avancer le temps ne masque PAS le toast
      vi.advanceTimersByTime(5000);
      // Le toast reste visible car hideToast n'a pas été appelé
      expect(facade.toast().visible).toBe(true);
    });

    it("ne lève pas d'erreur si aucun timer actif", () => {
      expect(() => facade.destroy()).not.toThrow();
    });
  });
});
