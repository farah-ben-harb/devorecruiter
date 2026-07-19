import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { WebhookSecretGuard } from '../../auth/guards/webhook-secret.guard';
import { ResumeEvaluationService } from '../services/resume-evaluations.service';

@Controller('scoringresume')
@UseGuards(WebhookSecretGuard)
export class ResumeEvaluationWebhookController {
  constructor(private readonly service: ResumeEvaluationService) {}

  @Post('webhook/cv-updated')
markOutdated(@Body() dto: { highlightedFileId: string }) {
  if (!dto.highlightedFileId) {
    throw new BadRequestException('highlightedFileId manquant');
  }
  return this.service.markOutdated(dto.highlightedFileId);
}
}