import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JobPost } from './entities/job-post.entity';
import { GlobalCriteria } from './entities/global-criterias.entity';
import { JobPostCriteria } from './entities/job-post-criteria.entity';

import { JobPostController } from './controllers/job-posts.controller';
import { GlobalCriteriaController } from './controllers/global-criterias.controller';

import { JobPostService } from './services/job-posts.service';
import { GlobalCriteriaService } from './services/global-criterias.service';
import { JobPostCriteriaService } from './services/job-post-criteria.service'; 

import { JobPostDriveService } from './services/job-posts-drive.service';
import { JobPostHelpersService } from './services/job-posts-helpers.service';
import { GroqService } from './services/groq.service';

import { JobPostRepository } from './repositories/job-posts.repository';
import { JobPostCriteriaRepository } from './repositories/job-post-criteria.repository';

import { JOB_POST_REPOSITORY } from './interfaces/job-post.interface';
import { JOB_POST_CRITERIA_REPOSITORY } from './interfaces/job-post-criteria.interface';

import { GoogleDriveModule } from '../common/google-drive/google-drive.module';
import { N8nWorkflowModule } from '../common/workflows/n8n-workflow.module';
import { CriteriaCategoryController } from './controllers/criteria-category.controller';
import { CriteriaCategory } from './entities/criteria-category.entity';
import { CriteriaCategoryService } from './services/criteria-category.service';

@Module({
  imports: [
    HttpModule,
    MulterModule.register({ storage: memoryStorage() }),
    TypeOrmModule.forFeature([
      JobPost,
      GlobalCriteria,
      JobPostCriteria,
      CriteriaCategory,
      
    ]),
    GoogleDriveModule,
    N8nWorkflowModule,
  ],
  controllers: [
    JobPostController,
    GlobalCriteriaController,
    CriteriaCategoryController,
  ],
  providers: [
    JobPostService,
    GlobalCriteriaService,
    JobPostCriteriaService,
    JobPostDriveService,
    JobPostHelpersService,
    CriteriaCategoryService,
    GroqService,
    {
      provide: JOB_POST_REPOSITORY,
      useClass: JobPostRepository,
    },
    {
      provide: JOB_POST_CRITERIA_REPOSITORY,
      useClass: JobPostCriteriaRepository,
    },
  ],
  exports: [
    JobPostService,
    JobPostDriveService,
    GlobalCriteriaService,
    JobPostCriteriaService, 
    CriteriaCategoryService,
  ],
})
export class JobPostsModule {}