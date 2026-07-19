import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { RegenerateModalComponent } from './regenerate-modal.component';
import { TechnicalEvaluation } from '../../models/technical-evaluation/technical-evaluation.model';

describe('RegenerateModalComponent', () => {
  let component: RegenerateModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new RegenerateModalComponent());

    // input obligatoire
    component.evaluation = { id: 1 } as TechnicalEvaluation;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ================= SUBMIT =================
  it('should emit confirm when prompt is valid', () => {
    const spy = vi.spyOn(component.confirm, 'emit');

    component.prompt = '  test prompt  ';
    component.submit();

    expect(spy).toHaveBeenCalledWith({ prompt: 'test prompt' });
  });

  it('should not emit if prompt is empty', () => {
    const spy = vi.spyOn(component.confirm, 'emit');

    component.prompt = '   '; // seulement espaces
    component.submit();

    expect(spy).not.toHaveBeenCalled();
  });

  // ================= CLOSE =================
  it('should emit close event', () => {
    const spy = vi.spyOn(component.close, 'emit');

    component.close.emit();

    expect(spy).toHaveBeenCalled();
  });

  // ================= INPUTS =================
  it('should accept inputs correctly', () => {
    const evaluation = { id: 99 } as TechnicalEvaluation;

    component.evaluation = evaluation;
    component.regenerating = true;

    expect(component.evaluation).toBe(evaluation);
    expect(component.regenerating).toBe(true);
  });
});
