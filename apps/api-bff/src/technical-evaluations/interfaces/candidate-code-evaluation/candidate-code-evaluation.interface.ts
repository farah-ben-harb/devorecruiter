export type Recommendation = 'hire' | 'maybe' | 'reject';

export interface AiEvaluationResult {
  globalScore: number;
  technicalScore: number;
  qualityScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  recommendation: Recommendation;
  requirementsAnalysis?: {
  completed: string[];
  partial: string[];
  missing: string[];
  bonus: string[];
};
}

export interface OpenRouterMessage {
  role: string;
  content: string;
}

export interface OpenRouterChoice {
  message: OpenRouterMessage;
}

export interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}
