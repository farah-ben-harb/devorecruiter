export interface CandidateCodeEvaluation {
  id: number;
  invitationId: number;
  candidateId: string;
  evaluationId: number;
  branch: string;
  globalScore: number;
  technicalScore: number;
  qualityScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  recommendation: 'hire' | 'maybe' | 'reject';
  evaluatedAt: string;
}
