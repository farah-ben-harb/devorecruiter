import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UnifiedAssistantService } from '../services/unified-assistant.service';
import { SendChatDto } from '../../assistance/dtos/chat-message.dto';
import { CreateConversationDto } from '../../assistance/dtos/create-conversation.dto';
import { UpdateConversationDto } from '../../assistance/dtos/update-conversation.dto';
import { CreateMessageDto } from '../../assistance/dtos/create-message.dto';
import type {
  AuthRequest,
  GoogleAuthenticatedUser,
} from '../../auth/interfaces/auth.interface';

const getUserId = (req: AuthRequest): number => {
  const user = req.user as GoogleAuthenticatedUser | undefined;
  if (!user?.id) throw new UnauthorizedException();
  return user.id;
};

@ApiTags('Unified Assistant')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/assistant')
export class UnifiedAssistantController {
  constructor(private readonly unifiedService: UnifiedAssistantService) {}

  // ═══════════════════════════════════════════════════════
  // CHAT PRINCIPAL
  // ═══════════════════════════════════════════════════════

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat unifié — route automatiquement vers IT ou RH' })
  @ApiResponse({ status: 200, description: 'Réponse retournée avec le mode détecté.' })
  async chat(@Body() dto: SendChatDto, @Req() req: AuthRequest) {
    return this.unifiedService.chat(dto, getUserId(req));
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Chat unifié en streaming SSE' })
  @ApiResponse({ status: 200, description: 'Stream SSE avec mode détecté.' })
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

    for await (const event of this.unifiedService.chatStream(dto, userId)) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  }

  // ═══════════════════════════════════════════════════════
  // IT — CONVERSATIONS
  // ═══════════════════════════════════════════════════════

  @Get('it/conversations')
  @ApiOperation({ summary: '[IT] Lister les conversations' })
  getItConversations(@Req() req: AuthRequest) {
    return this.unifiedService.getConversations(getUserId(req));
  }

  @Post('it/conversations')
  @ApiOperation({ summary: '[IT] Créer une conversation' })
  createItConversation(
    @Body() dto: CreateConversationDto,
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.createConversation(dto, getUserId(req));
  }

  @Patch('it/conversations/:id')
  @ApiOperation({ summary: '[IT] Mettre à jour une conversation' })
  @ApiParam({ name: 'id', description: 'UUID de la conversation IT' })
  updateItConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.updateConversation(id, dto, getUserId(req));
  }

  @Delete('it/conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[IT] Supprimer une conversation' })
  @ApiParam({ name: 'id', description: 'UUID de la conversation IT' })
  deleteItConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.deleteConversation(id, getUserId(req));
  }

  @Get('it/conversations/:id/messages')
  @ApiOperation({ summary: '[IT] Messages d\'une conversation' })
  @ApiParam({ name: 'id', description: 'UUID de la conversation IT' })
  getItMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.getMessages(id, getUserId(req));
  }

  @Post('it/generate-title')
  @ApiOperation({ summary: '[IT] Générer un titre' })
  async generateTitle(@Body('message') message: string) {
    const title = await this.unifiedService.generateTitle(message);
    return { title };
  }

  // ═══════════════════════════════════════════════════════
  // RH — CONVERSATIONS
  // ═══════════════════════════════════════════════════════

  @Get('rh/history')
  @ApiOperation({ summary: '[RH] Historique actif' })
  getRhHistory(@Req() req: AuthRequest) {
    return this.unifiedService.getRhHistory(getUserId(req));
  }

  @Get('rh/sidebar-history')
  @ApiOperation({ summary: '[RH] Historique sidebar' })
  getRhSidebarHistory(@Req() req: AuthRequest) {
    return this.unifiedService.getRhSidebarHistory(getUserId(req));
  }

  @Get('rh/stats')
  @ApiOperation({ summary: '[RH] Statistiques' })
  getRhStats(@Req() req: AuthRequest) {
    return this.unifiedService.getRhStats(getUserId(req));
  }

  @Delete('rh/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[RH] Réinitialiser la conversation active' })
  resetRhConversation(@Req() req: AuthRequest) {
    return this.unifiedService.resetRhConversation(getUserId(req));
  }

  @Get('rh/conversation/:id')
  @ApiOperation({ summary: '[RH] Récupérer une conversation par ID' })
  @ApiParam({ name: 'id', description: 'ID numérique de la conversation RH' })
  getRhConversation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.getRhConversationById(id, getUserId(req));
  }

  @Delete('rh/conversation/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[RH] Supprimer une conversation' })
  @ApiParam({ name: 'id', description: 'ID numérique de la conversation RH' })
  deleteRhConversation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.deleteRhConversation(id, getUserId(req));
  }

  @Patch('rh/conversation/:id/pin')
  @ApiOperation({ summary: '[RH] Épingler / dépingler une conversation' })
  @ApiParam({ name: 'id', description: 'ID numérique de la conversation RH' })
  pinRhConversation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isPinned: boolean },
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.pinRhConversation(id, getUserId(req), body.isPinned);
  }

  @Patch('rh/conversation/:id/rename')
  @ApiOperation({ summary: '[RH] Renommer une conversation' })
  @ApiParam({ name: 'id', description: 'ID numérique de la conversation RH' })
  renameRhConversation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string },
    @Req() req: AuthRequest,
  ) {
    return this.unifiedService.renameRhConversation(id, getUserId(req), body.title);
  }
}