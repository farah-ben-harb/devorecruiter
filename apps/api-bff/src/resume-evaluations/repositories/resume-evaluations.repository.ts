import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResumeEvaluation } from '../entities/resume-evaluation.entity';
import { IResumeEvaluationRepository } from '../interfaces/resume-evaluations.interface';

@Injectable()
export class ResumeEvaluationRepository implements IResumeEvaluationRepository {
  constructor(
    @InjectRepository(ResumeEvaluation)
    private readonly repo: Repository<ResumeEvaluation>,
  ) { }

  async create(data: Partial<ResumeEvaluation>): Promise<ResumeEvaluation> {
    const ResumeEvaluation = this.repo.create(data);
    return this.repo.save(ResumeEvaluation);
  }

  async findByJobPost(jobPostId: number): Promise<ResumeEvaluation[]> {
    return this.repo.find({
      where: { jobPostId },
      order: { scoreGlobal: 'DESC' },
    });
  }

  async findById(id: number): Promise<ResumeEvaluation> {
    const ResumeEvaluation = await this.repo.findOne({ where: { id } });
    if (!ResumeEvaluation)
      throw new NotFoundException(`ResumeEvaluation ${id} non trouvé`);
    return ResumeEvaluation;
  }

  async findByResumeAndJobPost(
    resumeFileId: string,
    jobPostId: number,
  ): Promise<ResumeEvaluation | null> {
    return this.repo.findOne({ where: { resumeFileId, jobPostId } });
  }

  async deleteById(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`ResumeEvaluation ${id} non trouvé`);
  }

  async update(
    id: number,
    data: Partial<ResumeEvaluation>,
  ): Promise<ResumeEvaluation> {
    await this.repo.update(id, data);
    return this.findById(id);
  }



  async markOutdated(highlightedFileId: string): Promise<{ affected: number }> {
  const result = await this.repo.update(
    { highlightedFileId },
    { isOutdated: true }
  );
  console.log('markOutdatedByHighlightedFileId — affected:', result.affected);
  return { affected: result.affected ?? 0 };
}

  async rescoreOne(id: number, data: Partial<ResumeEvaluation>): Promise<ResumeEvaluation> {
    await this.repo.update(id, { ...data, isOutdated: false });
    return this.repo.findOneOrFail({ where: { id } });
  }
}
