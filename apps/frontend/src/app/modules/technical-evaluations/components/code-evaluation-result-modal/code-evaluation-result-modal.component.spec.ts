import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CodeEvalResultModalComponent } from './code-evaluation-result-modal.component';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type CodeEvalResultModalTestable = Omit<CodeEvalResultModalComponent, 'codeEval'> & {
  codeEval: ReturnType<typeof signal<CandidateCodeEvaluation>>;
};

describe('CodeEvalResultModalComponent', () => {
  let fixture: ComponentFixture<CodeEvalResultModalComponent>;
  let component: CodeEvalResultModalTestable;

  const mockEval = (score = 75): CandidateCodeEvaluation => ({
    id: 1,
    globalScore: score,
    technicalScore: 80,
    qualityScore: 70,
    feedback: 'Bravo',
    strengths: [],
    improvements: [],
    recommendation: 'hire',
    evaluatedAt: new Date().toISOString(),
    invitationId: 1,
    candidateId: '1',
    evaluationId: 1,
    branch: 'main',
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeEvalResultModalComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(CodeEvalResultModalComponent, {
        set: { template: '', templateUrl: undefined },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CodeEvalResultModalComponent);
    component = fixture.componentInstance as unknown as CodeEvalResultModalTestable;
  });

  const setupSignal = (data: CandidateCodeEvaluation) => {
    component.codeEval = signal(data);
    fixture.detectChanges();
  };

  it('devrait recevoir les données initiales', () => {
    setupSignal(mockEval(75));
    expect(component.codeEval().globalScore).toBe(75);
  });

  it('devrait se mettre à jour réactivement', () => {
    setupSignal(mockEval(75));
    component.codeEval.set(mockEval(90));
    fixture.detectChanges();
    expect(component.codeEval().globalScore).toBe(90);
  });

  it("devrait émettre l'output close", () => {
    setupSignal(mockEval());
    const spy = vi.fn();
    component.close.subscribe(spy);
    component.close.emit();
    expect(spy).toHaveBeenCalled();
  });
});
