import { Module } from '@nestjs/common';
import { ImportService } from './services/import.service';
import { ImportController } from './controllers/import.controller';
import { UsersModule } from '../users/users.module';
import { JobPostsModule } from '../job-posts/job-posts.module';
import { CandidateModule } from '../candidates/candidate.module';

@Module({
  imports: [UsersModule, JobPostsModule, CandidateModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
