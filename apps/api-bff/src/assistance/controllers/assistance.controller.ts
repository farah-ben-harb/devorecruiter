import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Req,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AssistanceService } from '../services/assistance.service';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { UpdateConversationDto } from '../dtos/update-conversation.dto';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { SendChatDto } from '../dtos/chat-message.dto';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';
import type {
  AuthRequest,
  GoogleAuthenticatedUser,
} from '../../auth/interfaces/auth.interface';
import type { Response as ExpressResponse } from 'express';

const getUserId = (req: AuthRequest): number => {
  const user = req.user as GoogleAuthenticatedUser | undefined;
  if (!user?.id) throw new UnauthorizedException();
  return user.id;
};

@ApiTags('Assistance')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('assistance')
export class AssistanceController {
  constructor(private readonly assistanceService: AssistanceService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Envoyer un message au chatbot RH' })
  @ApiResponse({ status: 201, description: 'Réponse du chatbot retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  chat(@Body() dto: SendChatDto, @Req() req: AuthRequest) {
    return this.assistanceService.chat(dto, getUserId(req));
  }

  @Post('generate-title')
  @ApiOperation({ summary: 'Générer un titre pour une conversation' })
  @ApiBody({ schema: { example: { message: 'Quel est le processus de recrutement ?' } } })
  @ApiResponse({ status: 201, schema: { example: { title: 'Processus de recrutement' } } })
  async generateTitle(@Body('message') message: string) {
    const title = await this.assistanceService.generateTitle(message);
    return { title };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Récupérer toutes les conversations de l\'utilisateur' })
  @ApiResponse({ status: 200, type: [ConversationEntity], description: 'Liste des conversations.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  getConversations(@Req() req: AuthRequest) {
    return this.assistanceService.getConversations(getUserId(req));
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Créer une nouvelle conversation' })
  @ApiResponse({ status: 201, type: ConversationEntity, description: 'Conversation créée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  createConversation(
    @Body() dto: CreateConversationDto,
    @Req() req: AuthRequest,
  ) {
    return this.assistanceService.createConversation(dto, getUserId(req));
  }

  @Patch('conversations/:id')
  @ApiOperation({ summary: 'Mettre à jour une conversation' })
  @ApiParam({ name: 'id', description: 'UUID de la conversation' })
  @ApiResponse({ status: 200, type: ConversationEntity, description: 'Conversation mise à jour.' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvée.' })
  updateConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
    @Req() req: AuthRequest,
  ) {
    return this.assistanceService.updateConversation(id, dto, getUserId(req));
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Supprimer une conversation' })
  @ApiParam({ name: 'id', description: 'UUID de la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation supprimée.' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvée.' })
  deleteConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.assistanceService.deleteConversation(id, getUserId(req));
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Récupérer les messages d\'une conversation' })
  @ApiParam({ name: 'id', description: 'UUID de la conversation' })
  @ApiResponse({ status: 200, type: [MessageEntity], description: 'Liste des messages.' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvée.' })
  getMessages(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.assistanceService.getMessages(id, getUserId(req));
  }

  @Post('messages')
  @ApiOperation({ summary: 'Sauvegarder un message' })
  @ApiResponse({ status: 201, type: MessageEntity, description: 'Message sauvegardé.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  saveMessage(@Body() dto: CreateMessageDto, @Req() req: AuthRequest) {
    return this.assistanceService.saveMessage(dto, getUserId(req));
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Chat en streaming SSE (Server-Sent Events)' })
  @ApiResponse({ status: 201, description: 'Stream SSE de la réponse du chatbot.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async chatStream(
    @Body() dto: SendChatDto,
    @Req() req: AuthRequest,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const userId = getUserId(req);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const generator = this.assistanceService.chatStream(dto, userId);

    for await (const event of generator) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  }
}