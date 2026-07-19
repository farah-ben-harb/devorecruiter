import {
  TechnicalEvaluation,
  EvaluationStatus,
} from '../models/technical-evaluation/technical-evaluation.model';

export function mapTechnicalEvaluation(raw: TechnicalEvaluation): TechnicalEvaluation {
  return {
    ...raw,
    name: raw.name ?? null,
    version: raw.version ?? '1.0',
    status: (raw.status ?? 'pending') as EvaluationStatus,
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
    driveFileId: raw.driveFileId ?? undefined,
    driveFileUrl: raw.driveFileUrl ?? undefined,
  };
}

export function mapTechnicalEvaluations(list: TechnicalEvaluation[]): TechnicalEvaluation[] {
  return list.map(mapTechnicalEvaluation);
}
