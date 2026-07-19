import {
  Injectable,
  HttpException,
  BadGatewayException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ResumeEvaluationRepository } from '../repositories/resume-evaluations.repository';
import { ResumeEvaluation } from '../entities/resume-evaluation.entity';
import { JobPostCriteriaService, buildN8nCriteriaPayload } from '../../job-posts/services/job-post-criteria.service';
import { GlobalCriteriaService } from '../../job-posts/services/global-criterias.service';
import { GlobalCriteria } from '../../job-posts/entities/global-criterias.entity';
import { JobPostCriteria } from '../../job-posts/entities/job-post-criteria.entity';
import { N8nResumeMatch, N8nWebhookResponse, N8nScoringResumeResult } from '../interfaces/resume-evaluations.interface';


@Injectable()
export class ResumeEvaluationService {
  constructor(
    private readonly scoringresumeRepo: ResumeEvaluationRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly jobPostCriteriaService: JobPostCriteriaService,
    private readonly globalCriteriaService: GlobalCriteriaService,
  ) {}

  // ── HIGHLIGHT ──────────────────────────────────────────────────────────────
  private async callPythonHighlight(
    fileId: string,
    fileName: string,
    termsToHighlight: string[],
    googleAccessToken: string,
  ): Promise<string | null> {
    const pythonUrl = this.configService.get<string>('PYTHON_HIGHLIGHT_URL');
    if (!pythonUrl) {
      console.warn('PYTHON_HIGHLIGHT_URL non configurée — highlight ignoré');
      return null;
    }
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ highlightedFileId: string }>(pythonUrl, {
          fileId,
          fileName,
          termsToHighlight,
          googleAccessToken,
        }),
      );
      return response.data.highlightedFileId ?? null;
    } catch (err) {
      console.warn(
        'Highlight échoué pour %s: %s',
        fileName,
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }
  }
  private buildCriteriaForN8n(
    jobPostCriteria: JobPostCriteria | null,
  ): Record<string, unknown> | null {
    if (!jobPostCriteria) return null;
    return buildN8nCriteriaPayload(jobPostCriteria);
  }

  // ── TRIGGER ALL ────────────────────────────────────────────────────────────
  async triggerAllAndSave(
    jobPostGoogleDriveFileId: string,
    jobPostId: number,
    googleAccessToken: string,
  ): Promise<ResumeEvaluation[]> {
    const webhookUrl = this.configService.get<string>('N8N_SCORING_CV_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new BadGatewayException('N8N_SCORING_CV_WEBHOOK_URL non configurée');
    }

    const minScoreRaw = this.configService.get<string | number>('N8N_SCORING_CV_MIN_SCORE');
    const minScore = Number(minScoreRaw ?? 10);
    const normalizedMinScore = Number.isFinite(minScore) ? minScore : 10;

    // ── Chargement des critères ──────────────────────────────────────────────
    // ── Chargement des critères ──────────────────────────────────────────────
let jobPostCriteria: JobPostCriteria | null = null;
try {
  jobPostCriteria = await this.jobPostCriteriaService.findByJobPostId(jobPostId);
} catch (err) {
  console.warn(
    'Critères non trouvés pour jobPostId %s: %s',
    jobPostId,
    err instanceof Error ? err.message : String(err),
  );
}

const criteriaPayload = this.buildCriteriaForN8n(jobPostCriteria);

// Si la fiche n'a pas encore "figé" les critères globaux dans ses sections
// (champ globalCriteriaIncluded === false ou absent), on envoie le
// catalogue global séparément pour que n8n fasse la fusion lui-même
// (comportement legacy).
const needsGlobalCriteria = !criteriaPayload || criteriaPayload['globalCriteriaIncluded'] !== true;

let globalCriteria: GlobalCriteria[] = [];
if (needsGlobalCriteria) {
  try {
    globalCriteria = await this.globalCriteriaService.findAll();
  } catch (err) {
    console.warn(
      'Erreur lors de la récupération des critères globaux:',
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ── Appel n8n ────────────────────────────────────────────────────────────
let matches: N8nResumeMatch[];
try {
  const response = await firstValueFrom(
    this.httpService.post<N8nWebhookResponse>(webhookUrl, {
      jobPostGoogleDriveFileId,
      minScore: normalizedMinScore,
      jobPostCriteria: criteriaPayload,
      ...(needsGlobalCriteria
        ? {
            globalCriteria: globalCriteria.map((gc) => ({
              id: gc.id,
              label: gc.label,
              category: gc.category,
            })),
          }
        : {}),
    }),
  );
  matches = response.data.matches ?? [];
} catch (err) {
  if (err instanceof HttpException) throw err;
  throw new BadGatewayException('Erreur workflow n8n');
}

    // ── Sauvegarde des résultats ──────────────────────────────────────────────
    const results = await Promise.all(
      matches.map(async (m: N8nResumeMatch) => {
        const detail = m.detail ?? ({ scoreGlobal: 0 } as N8nScoringResumeResult);

        const scoreData: Partial<ResumeEvaluation> = {
          resumeFileId: m.fileId,
          resumeName: m.fileName ?? m.fileId,
          jobPostId,
          jobPostGoogleDriveFileId,
          scoreGlobal: this.round(detail.scoreGlobal),
          criteria: {
            technicalSkills: {
              score: this.round(detail.technicalSkills?.score),
              detail: detail.technicalSkills?.detail ?? '',
            },
            experience: {
              score: this.round(detail.experience?.score),
              detail: detail.experience?.detail ?? '',
            },
            education: {
              score: this.round(detail.education?.score),
              detail: detail.education?.detail ?? '',
            },
            softSkills: {
              score: this.round(detail.softSkills?.score),
              detail: detail.softSkills?.detail ?? '',
            },
            languages: {
              score: this.round(detail.languages?.score),
              detail: detail.languages?.detail ?? '',
            },
            ...(detail.certifications
              ? {
                  certifications: {
                    score: this.round(detail.certifications.score),
                    detail: detail.certifications.detail ?? '',
                    matched: detail.certifications.matched ?? [],
                    missing: detail.certifications.missing ?? [],
                  },
                }
              : {}),
          },
          strengths: Array.isArray(detail.strengths) ? detail.strengths : [],
          weaknesses: Array.isArray(detail.weaknesses) ? detail.weaknesses : [],
          resume: detail.resume ?? '',
          recommendation: detail.recommendation ?? 'REJECTED',
          status: this.round(detail.scoreGlobal) >= 60 ? 'ACCEPTED' : 'REJECTED',
        };

        if (m.termsToHighlight?.length) {
          const highlightedFileId = await this.callPythonHighlight(
            m.fileId,
            m.fileName ?? m.fileId,
            m.termsToHighlight,
            googleAccessToken,
          );
          if (highlightedFileId) {
            scoreData.highlightedFileId = highlightedFileId;
          }
        }

        const existing = await this.scoringresumeRepo.findByResumeAndJobPost(
          m.fileId,
          jobPostId,
        );

        return existing
          ? this.scoringresumeRepo.update(existing.id, scoreData)
          : this.scoringresumeRepo.create(scoreData);
      }),
    );

    return results;
  }

  // ── GET / DELETE ───────────────────────────────────────────────────────────
  async getByJobPost(jobPostId: number): Promise<ResumeEvaluation[]> {
    return this.scoringresumeRepo.findByJobPost(jobPostId);
  }

  async getById(id: number): Promise<ResumeEvaluation> {
    const scoring = await this.scoringresumeRepo.findById(id);
    if (!scoring) throw new NotFoundException(`Scoring ${id} not found`);
    return scoring;
  }

  async delete(id: number): Promise<void> {
    return this.scoringresumeRepo.deleteById(id);
  }

  // ── RESCORE ONE ────────────────────────────────────────────────────────────
  async rescoreOne(
    evaluationId: number,
    googleAccessToken: string,
  ): Promise<ResumeEvaluation> {
    const existing = await this.scoringresumeRepo.findById(evaluationId);
    if (!existing) throw new NotFoundException(`Scoring ${evaluationId} not found`);

    const webhookUrl = this.configService.get<string>('N8N_SCORING_CV_WEBHOOK_URL');
    if (!webhookUrl) throw new BadGatewayException('N8N_SCORING_CV_WEBHOOK_URL non configurée');

    const minScoreRaw = this.configService.get<string | number>('N8N_SCORING_CV_MIN_SCORE');
    const minScore = Number(minScoreRaw ?? 10);

    // ── Chargement des critères ──────────────────────────────────────────────
    let jobPostCriteria: JobPostCriteria | null = null;
try {
  jobPostCriteria = await this.jobPostCriteriaService.findByJobPostId(
    existing.jobPostId,
  );
} catch { /* optionnel */ }

const criteriaPayload = this.buildCriteriaForN8n(jobPostCriteria);
const needsGlobalCriteria = !criteriaPayload || criteriaPayload['globalCriteriaIncluded'] !== true;

let globalCriteria: GlobalCriteria[] = [];
if (needsGlobalCriteria) {
  try {
    globalCriteria = await this.globalCriteriaService.findAll();
  } catch { /* optionnel */ }
}

let matches: N8nResumeMatch[];
try {
  const response = await firstValueFrom(
    this.httpService.post<N8nWebhookResponse>(webhookUrl, {
      jobPostGoogleDriveFileId: existing.jobPostGoogleDriveFileId,
      minScore: Number.isFinite(minScore) ? minScore : 10,
      singleResumeFileId: existing.highlightedFileId ?? existing.resumeFileId,
      singleResumeOriginalId: existing.resumeFileId,
      singleResumeFileName: existing.resumeName,
      jobPostCriteria: criteriaPayload,
      ...(needsGlobalCriteria
        ? {
            globalCriteria: globalCriteria.map((gc) => ({
              id: gc.id,
              label: gc.label,
              category: gc.category,
            })),
          }
        : {}),
    }),
  );
  matches = response.data.matches ?? [];
} catch (err) {
  if (err instanceof HttpException) throw err;
  throw new BadGatewayException('Erreur workflow n8n');
}

// ← cherche par l'ID original (pas le highlighté)
const match =
  matches.find((m) => m.fileId === (existing.highlightedFileId ?? existing.resumeFileId)) ??
  matches[0];
    if (!match)
      throw new NotFoundException('Aucun résultat retourné par n8n pour ce CV');

    const detail = match.detail ?? ({ scoreGlobal: 0 } as N8nScoringResumeResult);

    const scoreData: Partial<ResumeEvaluation> = {
      scoreGlobal: this.round(detail.scoreGlobal),
      criteria: {
        technicalSkills: {
          score: this.round(detail.technicalSkills?.score),
          detail: detail.technicalSkills?.detail ?? '',
        },
        experience: {
          score: this.round(detail.experience?.score),
          detail: detail.experience?.detail ?? '',
        },
        education: {
          score: this.round(detail.education?.score),
          detail: detail.education?.detail ?? '',
        },
        softSkills: {
          score: this.round(detail.softSkills?.score),
          detail: detail.softSkills?.detail ?? '',
        },
        languages: {
          score: this.round(detail.languages?.score),
          detail: detail.languages?.detail ?? '',
        },
        ...(detail.certifications
          ? {
              certifications: {
                score: this.round(detail.certifications.score),
                detail: detail.certifications.detail ?? '',
                matched: detail.certifications.matched ?? [],
                missing: detail.certifications.missing ?? [],
              },
            }
          : {}),
      },
      strengths: Array.isArray(detail.strengths) ? detail.strengths : [],
      weaknesses: Array.isArray(detail.weaknesses) ? detail.weaknesses : [],
      resume: detail.resume ?? '',
      recommendation: detail.recommendation ?? 'REJECTED',
      status: this.round(detail.scoreGlobal) >= 60 ? 'ACCEPTED' : 'REJECTED',
      isOutdated: false,
    };

    if (match.termsToHighlight?.length) {
      const highlightedFileId = await this.callPythonHighlight(
        match.fileId,
        match.fileName ?? match.fileId,
        match.termsToHighlight,
        googleAccessToken,
      );
      if (highlightedFileId) scoreData.highlightedFileId = highlightedFileId;
    }

    return this.scoringresumeRepo.rescoreOne(evaluationId, scoreData);
  }

  // ── MARK OUTDATED ──────────────────────────────────────────────────────────
  async markOutdated(highlightedFileId: string): Promise<{ updated: number }> {
    console.log('markOutdated par highlightedFileId:', highlightedFileId);
    const result = await this.scoringresumeRepo.markOutdated(highlightedFileId);
    console.log('Lignes affectées:', result.affected);
    return { updated: result.affected };
  }

  private round(value: unknown): number {
    return Math.round(parseFloat(String(value)) || 0);
  }
}
