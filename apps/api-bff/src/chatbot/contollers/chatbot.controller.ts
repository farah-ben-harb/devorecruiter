import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChatMessageDto, ChatResponseDto } from '../dtos/chat-message.dto';
import { ChatbotService } from '../services/chatbot.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type {
  AuthRequest,
  GoogleAuthenticatedUser,
} from '../../auth/interfaces/auth.interface';

const getUserId = (req: AuthRequest): number => {
  const user = req.user as GoogleAuthenticatedUser | undefined;
  if (!user?.id) throw new UnauthorizedException();
  return user.id;
};

@ApiTags('Chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Envoyer un message au chatbot et recevoir une réponse',
  })
  async chat(
    @Body() dto: ChatMessageDto,
    @Req() req: AuthRequest,
  ): Promise<ChatResponseDto> {
    return this.chatbotService.processMessage(dto, getUserId(req));
  }

  @Delete('history/:sessionId')
  @ApiOperation({ summary: "Vider l'historique d'une session de conversation" })
  clearHistory(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthRequest,
  ): { success: boolean } {
    return this.chatbotService.clearHistory(sessionId, getUserId(req));
  }
}
