import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RhAssistantController } from './controllers/rh-assistant.controller';
import { RhAssistantService } from './services/rh-assistant.service';
import { RhAssistantRepository } from './repositories/rh-assistant.repository';
import { RhConversationEntity } from './entities/rh_conversations.entity';
import { RhMessageEntity } from './entities/rh_messages.entity';

@Module({
  imports: [
    HttpModule.register({ timeout: 15000, maxRedirects: 3 }),
    TypeOrmModule.forFeature([RhConversationEntity, RhMessageEntity]),
  ],
  controllers: [RhAssistantController],
  providers: [RhAssistantService, RhAssistantRepository],
  exports: [RhAssistantService],
})
export class RhAssistantModule {}
