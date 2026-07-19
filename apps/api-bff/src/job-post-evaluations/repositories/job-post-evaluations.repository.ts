import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  JobPostEvaluation,
  ScoredJobPost,
  ScoringStatus,
} from '../entities/job-post-evaluation.entity';
import { IJobPostEvaluationRepository } from '../interfaces/job-post-evaluations.interface';

@Injectable()
export class JobPostEvaluationRepository implements IJobPostEvaluationRepository {
  private readonly logger = new Logger(JobPostEvaluationRepository.name);

  constructor(
    @InjectRepository(JobPostEvaluation)
    private readonly repo: Repository<JobPostEvaluation>,
  ) {}

  async createWithResults(data: {
    candidateId: string;
    totalMatch: number;
    matches: ScoredJobPost[];
  }): Promise<JobPostEvaluation> {
    this.logger.log(
      `Persistance scoring candidat ${data.candidateId} — ${data.totalMatch} match(s)`,
    );

    const entity = this.repo.create({
      candidateId: data.candidateId,
      totalMatch: data.totalMatch,
      matches: data.matches,
      status: ScoringStatus.DONE,
      completedAt: new Date(),
    });

    return this.repo.save(entity);
  }

  async createPending(candidateId: string): Promise<JobPostEvaluation> {
    const entity = this.repo.create({
      candidateId,
      status: ScoringStatus.RUNNING,
      totalMatch: 0,
    });
    return this.repo.save(entity);
  }

  async markError(id: string, message: string): Promise<JobPostEvaluation> {
    const entity = await this.findById(id);
    if (!entity) throw new NotFoundException(`ScoringResult ${id} introuvable`);

    entity.status = ScoringStatus.ERROR;
    entity.errorMessage = message;
    entity.completedAt = new Date();

    return this.repo.save(entity);
  }
  async findLatestByCandidateId(
    candidateId: string,
  ): Promise<JobPostEvaluation | null> {
    return this.repo.findOne({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByCandidateId(
    candidateId: string,
  ): Promise<JobPostEvaluation[]> {
    return this.repo.find({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<JobPostEvaluation | null> {
    return this.repo.findOneBy({ id });
  }

  async deleteById(id: string): Promise<void> {
    const entity = await this.findById(id);
    if (!entity) throw new NotFoundException(`ScoringResult ${id} introuvable`);
    await this.repo.remove(entity);
  }
}
