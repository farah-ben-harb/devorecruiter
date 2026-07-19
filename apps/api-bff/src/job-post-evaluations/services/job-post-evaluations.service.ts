import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { AxiosError } from 'axios';

import type { IJobPostEvaluationRepository } from '../interfaces/job-post-evaluations.interface';
import { SCORING_JOB_POST_REPOSITORY } from '../interfaces/job-post-evaluations.interface';
import {
  JobPostEvaluation,
  ScoredJobPost,
} from '../entities/job-post-evaluation.entity';
import {
  TriggerScoringResponseDto,
  ScoringResultResponseDto,
  N8nScoringResponseDto,
} from '../dtos/job-post-evaluation.dto';
import type { ICandidateRepository } from '../../candidates/interfaces/candidate-repository.interface';
import { CANDIDATE_REPOSITORY } from '../../candidates/interfaces/candidate-repository.interface';

@Injectable()
export class JobPostEvaluationService {
  private readonly logger = new Logger(JobPostEvaluationService.name);

  constructor(
    @Inject(SCORING_JOB_POST_REPOSITORY)
    private readonly scoringRepo: IJobPostEvaluationRepository,

    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,

    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}
  async triggerScoring(
    candidateId: string,
  ): Promise<TriggerScoringResponseDto> {
    const candidate = await this.candidateRepo.findBy({ id: candidateId });
    const timeoutMs = Number(
      this.configService.get<string>('N8N_TIMEOUT_MS') ?? '900000',
    );
    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }
    if (!candidate.unifieDriveId) {
      throw new BadRequestException(
        'The candidate does not have a unified CV. Import a CV before starting scoring.',
      );
    }

    const n8nUrl = this.configService.get<string>('N8N_SCORING_WEBHOOK_URL');
    if (!n8nUrl) {
      throw new InternalServerErrorException(
        'N8N_SCORING_WEBHOOK_URL not configured',
      );
    }

    const minScore = Number(
      this.configService.get<string>('N8N_SCORING_JOB_POST_MIN_SCORE') ?? '10',
    );

    this.logger.log(
      `Triggering scoring for candidate ${candidateId} → n8n (minScore: ${minScore})`,
    );

    let n8nResponse: N8nScoringResponseDto;

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<N8nScoringResponseDto>(n8nUrl, {
            resumeDriveFileId: candidate.unifieDriveId,
            minScore,
          })
          .pipe(
            timeout(timeoutMs),
            catchError((err: AxiosError | TimeoutError) => {
              if (err instanceof TimeoutError) {
                throw new BadRequestException(
                  'The scoring workflow exceeded the allowed timeout (15 min).',
                );
              }
              const axiosErr = err as AxiosError<{ message?: string }>;
              const status = axiosErr.response?.status;
              const message =
                axiosErr.response?.data?.message ?? axiosErr.message;

              throw new InternalServerErrorException(
                `n8n error (${status ?? 'unknown'}) : ${message}`,
              );
            }),
          ),
      );
      n8nResponse = response.data;
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Unexpected error during scoring: ${(err as Error).message}`,
      );
    }

    if (!n8nResponse || !Array.isArray(n8nResponse.matches)) {
      throw new InternalServerErrorException(
        'Invalid n8n response: missing or malformed "matches" field.',
      );
    }

    const sortedMatches: ScoredJobPost[] = [...n8nResponse.matches]
      .map((m) => ({ ...m, scoreGlobal: this.round(m.scoreGlobal) }))
      .sort((a, b) => b.scoreGlobal - a.scoreGlobal);

    const saved = await this.scoringRepo.createWithResults({
      candidateId,
      totalMatch: sortedMatches.length,
      matches: sortedMatches,
    });

    this.logger.log(
      `Scoring completed — candidate ${candidateId} — ${sortedMatches.length} job posting(s)`,
    );

    return {
      message: `Scoring completed: ${sortedMatches.length} compatible job posting(s) found`,
      totalMatch: sortedMatches.length,
      matches: sortedMatches,
      scoringId: saved.id,
      completedAt: saved.completedAt!,
    };
  }

  async getLatestResult(
    candidateId: string,
  ): Promise<ScoringResultResponseDto | null> {
    const record = await this.scoringRepo.findLatestByCandidateId(candidateId);
    if (!record) return null;
    return this.toResponseDto(record);
  }

  async getHistory(candidateId: string): Promise<ScoringResultResponseDto[]> {
    const records = await this.scoringRepo.findAllByCandidateId(candidateId);
    return records.map((r) => this.toResponseDto(r));
  }

  async deleteResult(id: string): Promise<void> {
    return this.scoringRepo.deleteById(id);
  }

  private toResponseDto(record: JobPostEvaluation): ScoringResultResponseDto {
    return {
      id: record.id,
      candidateId: record.candidateId,
      status: record.status,
      totalMatch: record.totalMatch,
      matches: record.matches,
      createdAt: record.createdAt,
      completedAt: record.completedAt,
    };
  }
  private round(value: unknown): number {
    return Math.round(parseFloat(String(value)) || 0);
  }
}
