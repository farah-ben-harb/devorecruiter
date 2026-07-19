import { Module } from '@nestjs/common';
import { ExportService } from './services/export.service';
import { ExportController } from './controllers/export.controller';
import { GoogleDriveModule } from '../common/google-drive/google-drive.module';
import { UsersModule } from '../users/users.module';
import { JobPostsModule } from '../job-posts/job-posts.module';
import { CandidateModule } from '../candidates/candidate.module';

@Module({
  imports: [GoogleDriveModule, UsersModule, JobPostsModule, CandidateModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
