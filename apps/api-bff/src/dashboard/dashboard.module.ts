import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/entities/job-post.entity';
import { Candidate } from '../candidates/entities/candidate.entity';
import { TechnicalEvaluation } from '../technical-evaluations/entities/technical-evaluations/technical-evaluations.entity';
import { Invitation } from '../technical-evaluations/entities/evaluation-invitations/evaluation-invitation.entity';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardService } from './services/dashboard.service';
import { DashboardController } from './controllers/dashboard.controller';
import { ConversationEntity } from '../assistance/entities/conversation.entity';
import { MessageEntity } from '../assistance/entities/message.entity';
import { UserMemoryEntity } from '../assistance/entities/user-memory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      JobPost,
      Candidate,
      TechnicalEvaluation,
      Invitation,
      ConversationEntity,
      MessageEntity,
      UserMemoryEntity,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService],
})
export class DashboardModule {}
