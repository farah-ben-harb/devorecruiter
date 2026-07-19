import {
  JobPostEvaluation,
  ScoredJobPost,
} from '../entities/job-post-evaluation.entity';

export const SCORING_JOB_POST_REPOSITORY = 'SCORING_JOB_POST_REPOSITORY';

export interface IJobPostEvaluationRepository {
  createWithResults(data: {
    candidateId: string;
    totalMatch: number;
    matches: ScoredJobPost[];
  }): Promise<JobPostEvaluation>;

  createPending(candidateId: string): Promise<JobPostEvaluation>;
  markError(id: string, message: string): Promise<JobPostEvaluation>;
  findLatestByCandidateId(
    candidateId: string,
  ): Promise<JobPostEvaluation | null>;
  findAllByCandidateId(candidateId: string): Promise<JobPostEvaluation[]>;
  findById(id: string): Promise<JobPostEvaluation | null>;
  deleteById(id: string): Promise<void>;
}
