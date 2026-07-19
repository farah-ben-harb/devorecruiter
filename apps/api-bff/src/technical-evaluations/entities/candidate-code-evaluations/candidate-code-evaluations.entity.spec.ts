import { getMetadataArgsStorage } from 'typeorm';
import { CandidateCodeEvaluation } from './candidate-code-evaluations.entity';

describe('CandidateCodeEvaluation Entity', () => {
  const storage = getMetadataArgsStorage();

  const columns = storage.columns.filter(
    (c) => c.target === CandidateCodeEvaluation,
  );
  const table = storage.tables.find(
    (t) => t.target === CandidateCodeEvaluation,
  );

  const col = (name: string) => columns.find((c) => c.propertyName === name);

  // ── Table ──────────────────────────────────────────────────────────────────

  describe('table metadata', () => {
    it('should be mapped to table "candidate_code_evaluations"', () => {
      expect(table?.name).toBe('candidate_code_evaluations');
    });
  });

  // ── Columns ────────────────────────────────────────────────────────────────

  describe('columns', () => {
    it('should have a primary generated column "id"', () => {
      const pk = storage.generations.find(
        (g) => g.target === CandidateCodeEvaluation && g.propertyName === 'id',
      );
      expect(pk).toBeDefined();
    });

    it('should have column "invitationId"', () => {
      expect(col('invitationId')).toBeDefined();
    });

    it('should have column "candidateId"', () => {
      expect(col('candidateId')).toBeDefined();
    });

    it('should have column "evaluationId"', () => {
      expect(col('evaluationId')).toBeDefined();
    });

    it('should have nullable column "branch"', () => {
      const c = col('branch');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable int column "globalScore"', () => {
      const c = col('globalScore');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable int column "technicalScore"', () => {
      const c = col('technicalScore');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable int column "qualityScore"', () => {
      const c = col('qualityScore');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable text column "feedback"', () => {
      const c = col('feedback');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable simple-array column "strengths"', () => {
      const c = col('strengths');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable simple-array column "improvements"', () => {
      const c = col('improvements');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable column "recommendation"', () => {
      const c = col('recommendation');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have nullable text column "rawAiResponse"', () => {
      const c = col('rawAiResponse');
      expect((c?.options as { nullable?: boolean }).nullable).toBe(true);
    });

    it('should have CreateDateColumn "evaluatedAt"', () => {
      const c = storage.columns.find(
        (col) =>
          col.target === CandidateCodeEvaluation &&
          col.propertyName === 'evaluatedAt' &&
          col.mode === 'createDate',
      );
      expect(c).toBeDefined();
    });
  });
});
