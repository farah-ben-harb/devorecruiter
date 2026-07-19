import { describe, it, expect } from 'vitest';
import type { CandidateCodeEvaluation } from './candidate-code-evaluation.model';

describe('CandidateCodeEvaluation', () => {
  it('should create a valid CandidateCodeEvaluation object', () => {
    const evaluation: CandidateCodeEvaluation = {
      id: 1,
      invitationId: 100,
      candidateId: 'cand-123',
      evaluationId: 200,
      branch: 'main',
      globalScore: 85,
      technicalScore: 90,
      qualityScore: 80,
      feedback: 'Good performance',
      strengths: ['Problem solving', 'Clean code'],
      improvements: ['Time management'],
      recommendation: 'hire',
      evaluatedAt: new Date().toISOString(),
    };

    expect(evaluation.id).toBe(1);
    expect(evaluation.recommendation).toBe('hire');
    expect(evaluation.globalScore).toBeGreaterThan(0);
  });
});
