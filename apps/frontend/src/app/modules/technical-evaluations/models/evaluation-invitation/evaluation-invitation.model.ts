export interface EvaluationInvitation {
  id: number;
  evaluationId: number;
  candidateId: string;
  candidateName?: string;
  jobPostId: number;
  candidateFirstName?: string;
  sentAt: string;
  dueDate: string | null;
  candidateEmail?: string;
  candidateResumeFileId?: string;
  gitRepoUrl?: string | null;
  quizToken?: string | null;
}

export interface EvaluationInvitationSummary {
  candidateResumeFileId: string | null;
  evaluationId: number;
}

export interface SendEvaluationInvitationsPayload {
  scoringResumeIds: number[];
  unscoredResumeIds: string[];
  evaluationId: number;
  dueDate: string;
  jobPostId: number;
}
