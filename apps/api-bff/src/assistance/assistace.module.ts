import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';
import { UserMemoryEntity } from './entities/user-memory.entity';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { UserMemoryRepository } from './repositories/user-memory.repository';
import { AssistanceService } from './services/assistance.service';
import { AssistanceController } from './controllers/assistance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationEntity,
      MessageEntity,
      UserMemoryEntity,
    ]),
    HttpModule,
  ],
  controllers: [AssistanceController],
  providers: [
    AssistanceService,
    ConversationRepository,
    MessageRepository,
    UserMemoryRepository,
  ],
  exports: [AssistanceService], 
})
export class AssistanceModule {}
