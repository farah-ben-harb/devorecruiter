import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TechnicalEvaluation } from '../entities/technical-evaluations/technical-evaluations.entity';
import { ITechnicalEvaluationRepository } from '../interfaces/technical-evaluations/technical-evaluations.interface';

@Injectable()
export class TechnicalEvaluationRepository implements ITechnicalEvaluationRepository {
  constructor(
    @InjectRepository(TechnicalEvaluation)
    private readonly repo: Repository<TechnicalEvaluation>,
  ) {}

  async create(
    data: Partial<TechnicalEvaluation>,
  ): Promise<TechnicalEvaluation> {
    return this.repo.save(this.repo.create(data));
  }

  async findAll(jobPostId: number): Promise<TechnicalEvaluation[]> {
    return this.repo.find({
      where: { jobPostId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllEvaluations(): Promise<TechnicalEvaluation[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<TechnicalEvaluation | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByDriveFileId(
    driveFileId: string,
  ): Promise<TechnicalEvaluation | null> {
    return this.repo.findOne({ where: { driveFileId } });
  }

  async save(evaluation: TechnicalEvaluation): Promise<TechnicalEvaluation> {
    return this.repo.save(evaluation);
  }

  async update(
    id: number,
    data: Partial<TechnicalEvaluation>,
  ): Promise<TechnicalEvaluation> {
    await this.repo.update(id, data);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
