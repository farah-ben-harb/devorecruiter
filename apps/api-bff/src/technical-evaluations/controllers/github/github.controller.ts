import { Controller, Post, Headers, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CandidateCodeEvaluationService } from '../../services/candidate-code-evaluations/candidate-code-evaluation.service';
import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import type { GithubPushPayload } from '../../interfaces/github/github.interface';

@ApiTags('Webhooks')
@Controller('webhook')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(
    private readonly codeEvalService: CandidateCodeEvaluationService,
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,
  ) {}

  @Post('github')
  @ApiOperation({ summary: 'Recevoir un webhook GitHub (événement push)' })
  @ApiHeader({
    name: 'x-github-event',
    description: 'Type d\'événement GitHub (ex: push)',
    required: true,
    example: 'push',
  })
  @ApiResponse({ status: 201, description: 'Webhook reçu et traité.', schema: { example: { received: true } } })
  @ApiResponse({ status: 400, description: 'Payload invalide ou événement non supporté.' })
  async handleGithubWebhook(
    @Headers('x-github-event') event: string,
    @Body() payload: GithubPushPayload,
  ): Promise<{ received: boolean }> {
    if (event !== 'push') return { received: true };

    const branch = payload.ref?.replace('refs/heads/', '');
    if (!branch || branch === 'main' || branch === 'master') {
      return { received: true };
    }

    const repoName = payload.repository?.name;
    if (!repoName) return { received: true };

    const invitation = await this.invitationRepo.findOne({
      where: { gitRepoUrl: Like(`%${repoName}%`) },
    });

    if (invitation) {
      this.logger.log(
        `Webhook push reçu → évaluation invitation ${invitation.id}`,
      );
      this.codeEvalService
        .evaluateCandidateWork(invitation.id)
        .catch((err: Error) =>
          this.logger.error('Évaluation échouée', err.message),
        );
    }

    return { received: true };
  }
}