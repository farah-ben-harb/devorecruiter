// src/job-posts/repositories/job-post-criteria.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPostCriteria } from '../entities/job-post-criteria.entity';
import { IJobPostCriteriaRepository } from '../interfaces/job-post-criteria.interface';

@Injectable()
export class JobPostCriteriaRepository implements IJobPostCriteriaRepository {
  constructor(
    @InjectRepository(JobPostCriteria)
    private readonly repo: Repository<JobPostCriteria>,
  ) {}

  async upsert(
    jobPostId: number,
    data: Partial<JobPostCriteria>,
  ): Promise<JobPostCriteria> {
    const existing = await this.repo.findOne({ where: { jobPostId } });

    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }

    const entity = this.repo.create({ ...data, jobPostId });
    return this.repo.save(entity);
  }

  async findByJobPostId(jobPostId: number): Promise<JobPostCriteria | null> {
    return this.repo.findOne({ where: { jobPostId } });
  }

  async deleteByJobPostId(jobPostId: number): Promise<void> {
    await this.repo.delete({ jobPostId });
  }
}