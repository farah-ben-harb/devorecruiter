import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EvaluationActionsMenuComponent } from './evaluation-actions-menu.component';
import {
  MenuPosition,
  TechnicalEvaluation,
  EvaluationStatus,
} from '../../models/technical-evaluation/technical-evaluation.model';
import { signal, WritableSignal } from '@angular/core';

describe('EvaluationActionsMenuComponent', () => {
  let fixture: ComponentFixture<EvaluationActionsMenuComponent>;
  let component: EvaluationActionsMenuComponent;

  const mockEvaluation: TechnicalEvaluation = {
    id: 123,
    jobPostId: 456,
    name: null, // ← ajouté
    title: 'Développeur Full Stack Senior',
    status: 'pending' as EvaluationStatus,
    version: '1.0',
    index: 0,
  };

  const mockPosition: MenuPosition = { top: 150, left: 300 };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationActionsMenuComponent],
    }).compileComponents();
  });

  // CORRECTION: interface stricte pour les overrides
  interface ComponentOverrides {
    evaluation?: TechnicalEvaluation;
    menuPosition?: MenuPosition;
    approving?: number | null;
    canEdit?: boolean;
    canApprove?: boolean;
    canDelete?: boolean;
    canSendEvaluationInvitation?: boolean;
    canViewInvitees?: boolean;
  }

  const createComponent = (overrides: ComponentOverrides = {}) => {
    fixture = TestBed.createComponent(EvaluationActionsMenuComponent);
    component = fixture.componentInstance;

    (component.evaluation as unknown as WritableSignal<TechnicalEvaluation>) = signal(
      overrides.evaluation ?? mockEvaluation,
    );
    (component.menuPosition as unknown as WritableSignal<MenuPosition>) = signal(
      overrides.menuPosition ?? mockPosition,
    );
    (component.approving as unknown as WritableSignal<number | null>) = signal(
      overrides.approving ?? null,
    );

    (component.canEdit as unknown as WritableSignal<boolean>) = signal(overrides.canEdit ?? false);
    (component.canApprove as unknown as WritableSignal<boolean>) = signal(
      overrides.canApprove ?? false,
    );
    (component.canDelete as unknown as WritableSignal<boolean>) = signal(
      overrides.canDelete ?? false,
    );
    (component.canSendEvaluationInvitation as unknown as WritableSignal<boolean>) = signal(
      overrides.canSendEvaluationInvitation ?? false,
    );
    (component.canViewInvitees as unknown as WritableSignal<boolean>) = signal(
      overrides.canViewInvitees ?? false,
    );

    fixture.detectChanges();
    return component;
  };

  it('devrait créer le composant', () => {
    expect(createComponent()).toBeTruthy();
  });

  describe('Inputs', () => {
    it('reçoit evaluation', () => {
      const comp = createComponent();
      expect(comp.evaluation()).toEqual(mockEvaluation);
    });

    it('reçoit menuPosition', () => {
      const comp = createComponent();
      expect(comp.menuPosition()).toEqual(mockPosition);
    });

    it('met à jour evaluation', () => {
      const updated: TechnicalEvaluation = { ...mockEvaluation, id: 999 };
      const comp = createComponent({ evaluation: updated });
      expect(comp.evaluation()).toEqual(updated);
    });

    it('reflète approving', () => {
      const comp = createComponent({ approving: 42 });
      expect(comp.approving()).toBe(42);
    });
  });

  describe('Permissions', () => {
    it('canEdit true', () => {
      const comp = createComponent({ canEdit: true });
      expect(comp.canEdit()).toBe(true);
    });

    it('canApprove true', () => {
      const comp = createComponent({ canApprove: true });
      expect(comp.canApprove()).toBe(true);
    });

    it('canDelete true', () => {
      const comp = createComponent({ canDelete: true });
      expect(comp.canDelete()).toBe(true);
    });

    it('canSendEvaluationInvitation true', () => {
      const comp = createComponent({ canSendEvaluationInvitation: true });
      expect(comp.canSendEvaluationInvitation()).toBe(true);
    });

    it('canViewInvitees true', () => {
      const comp = createComponent({ canViewInvitees: true });
      expect(comp.canViewInvitees()).toBe(true);
    });
  });

  describe('Outputs', () => {
    let comp: EvaluationActionsMenuComponent;

    beforeEach(() => {
      comp = createComponent();
    });

    it('close', () => {
      const spy = vi.fn();
      comp.close.subscribe(spy);
      comp.close.emit();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('regenerate', () => {
      const spy = vi.fn();
      comp.regenerate.subscribe(spy);
      comp.regenerate.emit(mockEvaluation);
      expect(spy).toHaveBeenCalledWith(mockEvaluation);
    });

    it('editContent, download, approve, reject, delete, viewInvitees, sendEvaluation', () => {
      const spies = {
        editContent: vi.fn(),
        download: vi.fn(),
        approve: vi.fn(),
        reject: vi.fn(),
        delete: vi.fn(),
        viewInvitees: vi.fn(),
        sendEvaluation: vi.fn(),
      };

      comp.editContent.subscribe(spies.editContent);
      comp.download.subscribe(spies.download);
      comp.approve.subscribe(spies.approve);
      comp.reject.subscribe(spies.reject);
      comp.delete.subscribe(spies.delete);
      comp.viewInvitees.subscribe(spies.viewInvitees);
      comp.sendEvaluation.subscribe(spies.sendEvaluation);

      (Object.keys(spies) as Array<keyof typeof spies>).forEach((key) => {
        comp[key].emit(mockEvaluation);
      });

      Object.values(spies).forEach((spy) => {
        expect(spy).toHaveBeenCalledWith(mockEvaluation);
      });
    });
  });
});
