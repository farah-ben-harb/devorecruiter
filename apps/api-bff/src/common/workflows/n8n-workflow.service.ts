// src/common/workflows/n8n-workflow.service.ts
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { N8nResponse } from '../interfaces/n8n-response.interface';

@Injectable()
export class N8nWorkflowService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ── Unification fiche de poste + extraction critères ──────────────────────

  async processJobPost(googleDriveFileId: string): Promise<N8nResponse> {
    const webhookUrl = this.configService.getOrThrow<string>('N8N_WEBHOOK_URL');

    const { data } = await firstValueFrom(
      this.httpService.post<N8nResponse>(
        webhookUrl,
        { googleDriveFileId },
        { timeout: 10 * 60 * 1000 }, // 10 min — Gemini peut être lent
      ),
    );

    return data;
  }

  // ── Unification CV candidat ───────────────────────────────────────────────

  async triggerCandidateUnification(
    candidateId: string,
    driveFileId: string,
    name: string,
    firstName: string,
  ): Promise<N8nResponse> {
    const webhookUrl =
      this.configService.get<string>('N8N_WEBHOOK_CANDIDATE_CV_UNIFICATION') ??
      process.env.N8N_WEBHOOK_CANDIDATE_CV_UNIFICATION ??
      '';

    if (!webhookUrl) {
      throw new BadRequestException(
        'N8N_WEBHOOK_CANDIDATE_CV_UNIFICATION manquant',
      );
    }

    const { data } = await firstValueFrom(
      this.httpService.post<N8nResponse>(
        webhookUrl,
        { candidateId, driveFileId, name, firstName },
        { timeout: 5 * 60 * 1000 },
      ),
    );

    return data;
  }
}