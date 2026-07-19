// src/job-posts/interfaces/job-post-criteria.interface.ts
import { JobPostCriteria } from '../entities/job-post-criteria.entity';

export interface IJobPostCriteriaRepository {
  upsert(jobPostId: number, data: Partial<JobPostCriteria>): Promise<JobPostCriteria>;
  findByJobPostId(jobPostId: number): Promise<JobPostCriteria | null>;
  deleteByJobPostId(jobPostId: number): Promise<void>;
}

export const JOB_POST_CRITERIA_REPOSITORY = 'JOB_POST_CRITERIA_REPOSITORY';