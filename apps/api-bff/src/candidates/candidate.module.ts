import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Candidate } from './entities/candidate.entity';
import { CandidateService } from './services/candidate.service';
import { CandidateDriveService } from './services/candidate-drive.service'; // ← nouveau
import { CandidateController } from './controllers/candidate.controller';
import { CandidateRepository } from './repositories/candidate.repository';
import { GoogleDriveModule } from '../common/google-drive/google-drive.module';
import { CANDIDATE_REPOSITORY } from './interfaces/candidate-repository.interface';
import { N8nWorkflowModule } from '../common/workflows/n8n-workflow.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Candidate]),
    MulterModule.register(),
    GoogleDriveModule,
    N8nWorkflowModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [CandidateController],
  providers: [
    CandidateService,
    CandidateDriveService,
    {
      provide: CANDIDATE_REPOSITORY,
      useClass: CandidateRepository,
    },
  ],
  exports: [CandidateService, CandidateDriveService],
})
export class CandidateModule {}
