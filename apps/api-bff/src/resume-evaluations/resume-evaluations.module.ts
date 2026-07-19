import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { ResumeEvaluationController } from './controllers/resume-evaluations.controller';
import { ResumeEvaluationWebhookController } from './controllers/resume-evaluation-webhook.controller';
import { ResumeEvaluationService } from './services/resume-evaluations.service';
import { ResumeEvaluation } from './entities/resume-evaluation.entity';
import { ResumeEvaluationRepository } from './repositories/resume-evaluations.repository';
import { JobPostsModule } from '../job-posts/job-posts.module';
import { WebhookSecretGuard } from '../auth/guards/webhook-secret.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResumeEvaluation]),
    HttpModule,
    JobPostsModule,
    ConfigModule, 
  ],
  controllers: [
    ResumeEvaluationController,
    ResumeEvaluationWebhookController, 
  ],
  providers: [
    ResumeEvaluationService,
    ResumeEvaluationRepository,
    WebhookSecretGuard,             
  ],
  exports: [ResumeEvaluationService, ResumeEvaluationRepository],
})
export class ResumeEvaluationModule {}