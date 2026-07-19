import { describe, it, expect } from 'vitest';
import type {
  EvaluationInvitation,
  EvaluationInvitationSummary,
  SendEvaluationInvitationsPayload,
} from './evaluation-invitation.model';

describe('EvaluationInvitation interfaces', () => {
  it('should create a valid EvaluationInvitation object', () => {
    const invitation: EvaluationInvitation = {
      id: 1,
      jobPostId: 10,
      evaluationId: 10,
      candidateId: 'cand-001',
      candidateName: 'Doe',
      candidateFirstName: 'John',
      sentAt: new Date().toISOString(),
      dueDate: null,
      candidateEmail: 'john.doe@test.com',
      candidateResumeFileId: 'resume-123',
      gitRepoUrl: 'https://github.com/test/repo',
    };

    expect(invitation.id).toBe(1);
    expect(invitation.dueDate).toBeNull();
    expect(invitation.gitRepoUrl).toContain('github');
  });

  it('should create a valid EvaluationInvitationSummary object', () => {
    const summary: EvaluationInvitationSummary = {
      candidateResumeFileId: 'resume-123',
      evaluationId: 10,
    };

    expect(summary.evaluationId).toBe(10);
    expect(summary.candidateResumeFileId).toBe('resume-123');
  });

  it('should create a valid SendEvaluationInvitationsPayload object', () => {
    const payload: SendEvaluationInvitationsPayload = {
      scoringResumeIds: [1, 2, 3],
      unscoredResumeIds: ['resume-1', 'resume-2'],
      evaluationId: 10,
      dueDate: new Date().toISOString(),
      jobPostId: 5,
    };

    expect(payload.scoringResumeIds.length).toBe(3);
    expect(payload.unscoredResumeIds).toContain('resume-1');
  });
});
