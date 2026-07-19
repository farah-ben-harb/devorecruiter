import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { UnifiedAssistantController } from './controllers/unified-assistant.controller';
import { UnifiedAssistantService } from './services/unified-assistant.service';
import { ClassifierService } from './services/classifier.service';

import { RhAssistantModule } from '../rh-assistant/rh-assistant.module';
import { AssistanceModule } from '../assistance/assistace.module';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [
    HttpModule,
    AssistanceModule,
    RhAssistantModule,
    ChatbotModule,      // ← fournit ChatbotService + AgentService + MemoryService
  ],
  controllers: [UnifiedAssistantController],
  providers: [UnifiedAssistantService, ClassifierService],
  exports: [],
})
export class UnifiedAssistantModule {}