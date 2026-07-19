import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { JobPostEvaluation } from './entities/job-post-evaluation.entity';
import { JobPostEvaluationService } from './services/job-post-evaluations.service';
import { JobPostEvaluationController } from './controllers/job-post-evaluations.controller';
import { JobPostEvaluationRepository } from './repositories/job-post-evaluations.repository';
import { SCORING_JOB_POST_REPOSITORY } from './interfaces/job-post-evaluations.interface';

import { Candidate } from '../candidates/entities/candidate.entity';
import { CandidateRepository } from '../candidates/repositories/candidate.repository';
import { CANDIDATE_REPOSITORY } from '../candidates/interfaces/candidate-repository.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPostEvaluation, Candidate]),

    HttpModule.register({
      timeout: 15 * 60 * 1000,
      maxRedirects: 3,
    }),

    ConfigModule,
  ],

  controllers: [JobPostEvaluationController],

  providers: [
    JobPostEvaluationService,

    {
      provide: SCORING_JOB_POST_REPOSITORY,
      useClass: JobPostEvaluationRepository,
    },

    {
      provide: CANDIDATE_REPOSITORY,
      useClass: CandidateRepository,
    },
  ],

  exports: [JobPostEvaluationService],
})
export class JobPostEvaluationModule {}
