import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatMessageDto, ChatResponseDto } from '../dtos/chat-message.dto';
import { ChatbotService } from '../services/chatbot.service';


@ApiTags('Chatbot')
@ApiBearerAuth()
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Envoyer un message au chatbot et recevoir une réponse' })
  async chat(@Body() dto: ChatMessageDto): Promise<ChatResponseDto> {
    return this.chatbotService.processMessage(dto);
  }

  @Delete('history/:sessionId')
  @ApiOperation({ summary: 'Vider l\'historique d\'une session de conversation' })
  clearHistory(@Param('sessionId') sessionId: string): { success: boolean } {
    return this.chatbotService.clearHistory(sessionId);
  }
}