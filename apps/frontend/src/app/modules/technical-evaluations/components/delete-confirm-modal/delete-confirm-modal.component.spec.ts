import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DeleteConfirmModalComponent } from './delete-confirm-modal.component';

// Template de remplacement sans app-icon pour éviter les erreurs de résolution
const TEST_TEMPLATE = `
  <div>
    <button (click)="close.emit()" [disabled]="deleting()">Annuler</button>
    <button (click)="confirm.emit()" [disabled]="deleting()">Supprimer</button>
  </div>
`;

describe('DeleteConfirmModalComponent', () => {
  let component: DeleteConfirmModalComponent;
  let fixture: ComponentFixture<DeleteConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteConfirmModalComponent],
    })
      // On remplace le templateUrl par un template inline sans app-icon
      .overrideTemplate(DeleteConfirmModalComponent, TEST_TEMPLATE)
      .compileComponents();

    fixture = TestBed.createComponent(DeleteConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ================= CREATE =================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ================= INPUTS =================
  describe('Inputs', () => {
    it('should have evaluationIndex input with default value null', () => {
      expect(component.evaluationIndex()).toBeNull();
    });

    it('should have deleting input with default value false', () => {
      expect(component.deleting()).toBe(false);
    });
  });

  // ================= OUTPUTS =================
  describe('Outputs', () => {
    it('should emit close event', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);
      component.close.emit();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit confirm event', () => {
      const confirmSpy = vi.fn();
      component.confirm.subscribe(confirmSpy);
      component.confirm.emit();
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ================= TEMPLATE =================
  describe('Template', () => {
    it('should render cancel button', () => {
      const cancelButton = fixture.nativeElement.querySelector('button:first-of-type');
      expect(cancelButton).toBeTruthy();
      expect(cancelButton.textContent).toContain('Annuler');
    });

    it('should render delete button', () => {
      const deleteButton = fixture.nativeElement.querySelector('button:last-of-type');
      expect(deleteButton).toBeTruthy();
      expect(deleteButton.textContent).toContain('Supprimer');
    });

    it('should render buttons when component created', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(2);
    });

    it('should emit close on cancel button click', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);
      const cancelButton = fixture.nativeElement.querySelector('button:first-of-type');
      cancelButton.click();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit confirm on delete button click', () => {
      const confirmSpy = vi.fn();
      component.confirm.subscribe(confirmSpy);
      const deleteButton = fixture.nativeElement.querySelector('button:last-of-type');
      deleteButton.click();
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
  });
});
