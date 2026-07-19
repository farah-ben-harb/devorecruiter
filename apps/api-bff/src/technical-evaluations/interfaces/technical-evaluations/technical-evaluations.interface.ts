import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';

export const TECHNICAL_EVALUATION_REPOSITORY =
  'TECHNICAL_EVALUATION_REPOSITORY';

export interface ITechnicalEvaluationRepository {
  create(data: Partial<TechnicalEvaluation>): Promise<TechnicalEvaluation>;
  findAll(jobPostId: number): Promise<TechnicalEvaluation[]>;
  findAllEvaluations(): Promise<TechnicalEvaluation[]>;
  findById(id: number): Promise<TechnicalEvaluation | null>;
  findByDriveFileId(driveFileId: string): Promise<TechnicalEvaluation | null>;
  save(evaluation: TechnicalEvaluation): Promise<TechnicalEvaluation>;
  update(
    id: number,
    data: Partial<TechnicalEvaluation>,
  ): Promise<TechnicalEvaluation>;
  delete(id: number): Promise<void>;
}
