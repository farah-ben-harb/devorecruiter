import { Module } from '@nestjs/common';
import { ChatbotController } from './contollers/chatbot.controller';
import { AgentService } from './services/agent.service';
import { ChatbotService } from './services/chatbot.service';
import { MemoryService } from './services/memory.service';

@Module({
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    AgentService,
    MemoryService,
  ],
  exports: [ChatbotService], // ← ajout
})
export class ChatbotModule {}