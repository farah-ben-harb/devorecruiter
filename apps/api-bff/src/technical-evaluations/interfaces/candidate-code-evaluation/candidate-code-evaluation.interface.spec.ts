import {
  Recommendation,
  AiEvaluationResult,
  OpenRouterMessage,
  OpenRouterChoice,
  OpenRouterResponse,
} from './candidate-code-evaluation.interface';

describe('CandidateCodeEvaluationInterface', () => {
  describe('Recommendation', () => {
    it('should accept hire', () => {
      const r: Recommendation = 'hire';
      expect(r).toBe('hire');
    });

    it('should accept maybe', () => {
      const r: Recommendation = 'maybe';
      expect(r).toBe('maybe');
    });

    it('should accept reject', () => {
      const r: Recommendation = 'reject';
      expect(r).toBe('reject');
    });
  });

  describe('AiEvaluationResult', () => {
    it('should accept a fully populated result', () => {
      const obj: AiEvaluationResult = {
        globalScore: 80,
        technicalScore: 75,
        qualityScore: 85,
        feedback: 'Bon travail.',
        strengths: ['Clean code', 'Bonne architecture'],
        improvements: ['Tests manquants'],
        recommendation: 'hire',
      };
      expect(obj.globalScore).toBe(80);
      expect(obj.strengths).toHaveLength(2);
      expect(obj.recommendation).toBe('hire');
    });

    it('should accept empty strengths and improvements', () => {
      const obj: AiEvaluationResult = {
        globalScore: 0,
        technicalScore: 0,
        qualityScore: 0,
        feedback: '',
        strengths: [],
        improvements: [],
        recommendation: 'maybe',
      };
      expect(obj.strengths).toEqual([]);
      expect(obj.improvements).toEqual([]);
    });
  });

  describe('OpenRouterMessage', () => {
    it('should accept a valid message', () => {
      const obj: OpenRouterMessage = {
        role: 'user',
        content: 'Évalue ce code.',
      };
      expect(obj.role).toBe('user');
      expect(obj.content).toBe('Évalue ce code.');
    });
  });

  describe('OpenRouterChoice', () => {
    it('should accept a valid choice', () => {
      const obj: OpenRouterChoice = {
        message: { role: 'assistant', content: '{"globalScore": 80}' },
      };
      expect(obj.message.role).toBe('assistant');
    });
  });

  describe('OpenRouterResponse', () => {
    it('should accept a valid response with one choice', () => {
      const obj: OpenRouterResponse = {
        choices: [
          { message: { role: 'assistant', content: '{"globalScore": 80}' } },
        ],
      };
      expect(obj.choices).toHaveLength(1);
      expect(obj.choices[0].message.content).toBe('{"globalScore": 80}');
    });

    it('should accept multiple choices', () => {
      const obj: OpenRouterResponse = {
        choices: [
          { message: { role: 'assistant', content: 'response 1' } },
          { message: { role: 'assistant', content: 'response 2' } },
        ],
      };
      expect(obj.choices).toHaveLength(2);
    });
  });
});
