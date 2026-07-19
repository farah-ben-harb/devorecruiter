import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';

import { MissingFieldsModalComponent } from './missing-fields-modal.component';
import { CandidatesService } from '../../../candidates/services/candidates.service';
import { ResumeListItem } from '../../../candidates/models/candidate.model';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockTarget: ResumeListItem = {
  id: 'resume-001',
  name: 'John Doe',
  driveLink: 'https://drive.google.com/file/resume-001',
  driveId: 'drive-001',
  type: 'brut',
  createdAt: '2024-01-01',
  status: 'done',
  hasUnifie: false,
  email: 'john@example.com',
  githubUsername: 'johndoe',
  hasMissingFields: true,
};

const mockService = {
  updateFields: vi.fn(),
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildChange(
  previousValue: ResumeListItem | null,
  currentValue: ResumeListItem | null,
  firstChange = false,
) {
  return new SimpleChange(previousValue, currentValue, firstChange);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('MissingFieldsModalComponent', () => {
  let component: MissingFieldsModalComponent;
  let fixture: ComponentFixture<MissingFieldsModalComponent>;

  beforeEach(async () => {
    mockService.updateFields.mockReset();

    await TestBed.configureTestingModule({
      imports: [MissingFieldsModalComponent],
      providers: [{ provide: CandidatesService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(MissingFieldsModalComponent);
    component = fixture.componentInstance;
  });

  // ─── État initial ─────────────────────────────────────────────────────────

  describe('état initial', () => {
    it('devrait créer le composant', () => {
      expect(component).toBeTruthy();
    });

    it('devrait avoir saving à false par défaut', () => {
      expect(component.saving()).toBe(false);
    });

    it('devrait avoir les champs de saisie vides par défaut', () => {
      expect(component.githubUsernameInput).toBe('');
      expect(component.emailInput).toBe('');
    });
  });

  // ─── ngOnChanges ──────────────────────────────────────────────────────────

  describe('ngOnChanges', () => {
    it('devrait initialiser les champs depuis target quand il change', () => {
      component.target = mockTarget;
      component.ngOnChanges({ target: buildChange(null, mockTarget, true) });

      expect(component.githubUsernameInput).toBe('johndoe');
      expect(component.emailInput).toBe('john@example.com');
    });

    it('devrait initialiser les champs à "" si les valeurs sont null', () => {
      const targetWithNulls: ResumeListItem = { ...mockTarget, githubUsername: null, email: null };
      component.target = targetWithNulls;
      component.ngOnChanges({ target: buildChange(null, targetWithNulls, true) });

      expect(component.githubUsernameInput).toBe('');
      expect(component.emailInput).toBe('');
    });

    it('devrait initialiser les champs à "" si les valeurs sont undefined', () => {
      const targetWithUndefined: ResumeListItem = {
        ...mockTarget,
        githubUsername: undefined,
        email: undefined,
      };
      component.target = targetWithUndefined;
      component.ngOnChanges({ target: buildChange(null, targetWithUndefined, true) });

      expect(component.githubUsernameInput).toBe('');
      expect(component.emailInput).toBe('');
    });

    it('ne devrait pas initialiser si target est absent des changements', () => {
      component.githubUsernameInput = 'ancien';
      component.emailInput = 'ancien@test.com';

      component.ngOnChanges({ autreChamp: new SimpleChange(null, 'valeur', false) });

      expect(component.githubUsernameInput).toBe('ancien');
      expect(component.emailInput).toBe('ancien@test.com');
    });

    it('ne devrait pas initialiser si target est falsy', () => {
      component.githubUsernameInput = 'ancien';
      component.ngOnChanges({ target: buildChange(mockTarget, null) });

      expect(component.githubUsernameInput).toBe('ancien');
    });
  });

  // ─── save ─────────────────────────────────────────────────────────────────

  describe('save', () => {
    beforeEach(() => {
      component.target = mockTarget;
      component.githubUsernameInput = 'johndoe';
      component.emailInput = 'john@example.com';
    });

    it('ne devrait rien faire si target est absent', () => {
      // Forcer undefined via accès direct à l'objet sans vérification TS
      Object.assign(component, { target: undefined });

      component.save();

      expect(mockService.updateFields).not.toHaveBeenCalled();
    });

    it('devrait passer saving à true pendant la sauvegarde', () => {
      let savingDuringCall = false;
      mockService.updateFields.mockImplementation(() => {
        savingDuringCall = component.saving();
        return of(void 0);
      });

      component.save();

      expect(savingDuringCall).toBe(true);
    });

    it('devrait appeler updateFields avec les bons arguments', () => {
      mockService.updateFields.mockReturnValue(of(void 0));

      component.save();

      expect(mockService.updateFields).toHaveBeenCalledWith('resume-001', {
        githubUsername: 'johndoe',
        email: 'john@example.com',
      });
    });

    it('devrait passer undefined pour les champs vides', () => {
      mockService.updateFields.mockReturnValue(of(void 0));
      component.githubUsernameInput = '';
      component.emailInput = '';

      component.save();

      expect(mockService.updateFields).toHaveBeenCalledWith('resume-001', {
        githubUsername: undefined,
        email: undefined,
      });
    });

    it('devrait remettre saving à false après succès', () => {
      mockService.updateFields.mockReturnValue(of(void 0));

      component.save();

      expect(component.saving()).toBe(false);
    });

    it('devrait émettre fieldsSaved avec le ResumeListItem mis à jour', () => {
      mockService.updateFields.mockReturnValue(of(void 0));
      const spy = vi.spyOn(component.fieldsSaved, 'emit');

      component.save();

      expect(spy).toHaveBeenCalledWith({
        ...mockTarget,
        githubUsername: 'johndoe',
        email: 'john@example.com',
        hasMissingFields: false,
      });
    });

    it('devrait émettre closeModal après succès', () => {
      mockService.updateFields.mockReturnValue(of(void 0));
      const spy = vi.spyOn(component.closeModal, 'emit');

      component.save();

      expect(spy).toHaveBeenCalled();
    });

    it("devrait remettre saving à false en cas d'erreur", () => {
      mockService.updateFields.mockReturnValue(throwError(() => new Error('fail')));

      component.save();

      expect(component.saving()).toBe(false);
    });

    it("devrait logger l'erreur sans crasher", () => {
      const err = new Error('fail');
      mockService.updateFields.mockReturnValue(throwError(() => err));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => component.save()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Erreur saveFields', err);

      consoleSpy.mockRestore();
    });

    it("ne devrait PAS émettre fieldsSaved ni closeModal en cas d'erreur", () => {
      mockService.updateFields.mockReturnValue(throwError(() => new Error('fail')));
      const fieldsSavedSpy = vi.spyOn(component.fieldsSaved, 'emit');
      const closeModalSpy = vi.spyOn(component.closeModal, 'emit');

      component.save();

      expect(fieldsSavedSpy).not.toHaveBeenCalled();
      expect(closeModalSpy).not.toHaveBeenCalled();
    });
  });

  // ─── close ────────────────────────────────────────────────────────────────

  describe('close', () => {
    it('devrait émettre closeModal', () => {
      const spy = vi.spyOn(component.closeModal, 'emit');

      component.close();

      expect(spy).toHaveBeenCalled();
    });
  });
});
