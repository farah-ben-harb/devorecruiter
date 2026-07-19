import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TechnicalEvaluation } from './entities/technical-evaluations/technical-evaluations.entity';
import { Invitation } from './entities/evaluation-invitations/evaluation-invitation.entity';
import { JobPost } from '../job-posts/entities/job-post.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { ResumeEvaluation } from '../resume-evaluations/entities/resume-evaluation.entity';
import { CandidateCodeEvaluation } from './entities/candidate-code-evaluations/candidate-code-evaluations.entity';
import { CandidateQuizResult } from './entities/candidate-quiz-results/candidate-quiz-result.entity';
import { User } from '../users/entities/user.entity';

import { TechnicalEvaluationController } from './controllers/technical-evaluations/technical-evaluations.controller';
import { InvitationsController } from './controllers/evaluation-invitations/evaluation-invitations.controller';
import { GithubController } from './controllers/github/github.controller';
import { CandidateQuizController } from './controllers/candidate-quiz/candidate-quiz.controller';

import { TechnicalEvaluationService } from './services/technical-evaluations/technical-evaluations.service';
import { InvitationsService } from './services/evaluation-invitations/evaluation-invitations.service';
import { GithubService } from './services/github/github.service';
import { CandidateCodeEvaluationService } from './services/candidate-code-evaluations/candidate-code-evaluation.service';
import { CandidateQuizService } from './services/candidate-quiz/candidate-quiz.service';
import { QuizTechnicalEvaluationService } from './services/quiz-technical-evaluations/quiz-technical-evaluations.service';
import { PdfGeneratorService } from './services/pdfs-generator/pdf-generator.service';

import { TechnicalEvaluationRepository } from './repositories/technical-evaluations.repository';
import { TECHNICAL_EVALUATION_REPOSITORY } from './interfaces/technical-evaluations/technical-evaluations.interface';

import { GoogleDriveModule } from '../common/google-drive/google-drive.module';
import { ResumeEvaluationModule } from '../resume-evaluations/resume-evaluations.module';
import { EvaluationNotificationService } from './services/evaluations-notifications/evaluation-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TechnicalEvaluation,
      Invitation,
      JobPost,
      Candidate,
      ResumeEvaluation,
      CandidateCodeEvaluation,
      CandidateQuizResult,
      User, 
    ]),
    GoogleDriveModule,
    ResumeEvaluationModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: configService.get<string>('EMAIL_USER'),
            pass: configService.get<string>('EMAIL_PASS'),
          },
        },
        defaults: {
          from: `"Devoteam" <${configService.get<string>('EMAIL_USER')}>`,
        },
      }),
    }),
  ],
  controllers: [
    TechnicalEvaluationController,
    InvitationsController,
    GithubController,
    CandidateQuizController,
  ],
  providers: [
    TechnicalEvaluationService,
    InvitationsService,
    CandidateCodeEvaluationService,
    GithubService,
    QuizTechnicalEvaluationService,
    PdfGeneratorService,
    CandidateQuizService,
    EvaluationNotificationService,
    {
      provide: TECHNICAL_EVALUATION_REPOSITORY,
      useClass: TechnicalEvaluationRepository,
    },
  ],
  exports: [TechnicalEvaluationService, InvitationsService, CandidateQuizService, MailerModule],
})
export class TechnicalEvaluationModule {}
