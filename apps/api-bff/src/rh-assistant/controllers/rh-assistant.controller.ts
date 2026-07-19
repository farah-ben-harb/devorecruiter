import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RhAssistantService } from '../services/rh-assistant.service';
import { QuestionDto } from '../dtos/question.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../interfaces/rh-assistant.interface';

@ApiTags('RH Assistant')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/rh-assistant')
export class RhAssistantController {
  constructor(private readonly rhAssistantService: RhAssistantService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Poser une question à l\'assistant RH' })
  @ApiResponse({ status: 200, description: 'Réponse de l\'assistant retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async ask(@Body() dto: QuestionDto, @Req() req: RequestWithUser) {
    return this.rhAssistantService.askQuestion(req.user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Récupérer l\'historique des conversations de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Historique des conversations retourné.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async getHistory(@Req() req: RequestWithUser) {
    return this.rhAssistantService.getHistory(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Récupérer les statistiques d\'utilisation de l\'assistant' })
  @ApiResponse({ status: 200, description: 'Statistiques retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async getStats(@Req() req: RequestWithUser) {
    return this.rhAssistantService.getStats(req.user.id);
  }

  @Delete('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser la conversation en cours' })
  @ApiResponse({ status: 200, description: 'Conversation réinitialisée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async reset(@Req() req: RequestWithUser) {
    return this.rhAssistantService.resetConversation(req.user.id);
  }

  @Get('sidebar-history')
  @ApiOperation({ summary: 'Récupérer l\'historique pour la barre latérale' })
  @ApiResponse({ status: 200, description: 'Historique sidebar retourné.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async getSidebarHistory(@Req() req: RequestWithUser) {
    return this.rhAssistantService.getSidebarHistory(req.user.id);
  }

  @Get('conversation/:id')
  @ApiOperation({ summary: 'Récupérer une conversation par son ID' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvée.' })
  async getConversation(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.rhAssistantService.getConversationById(+id, req.user.id);
  }

  @Delete('conversation/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation supprimée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvée.' })
  async deleteConversation(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.rhAssistantService.deleteConversation(+id, req.user.id);
  }

  @Patch('conversation/:id/pin')
  @ApiOperation({ summary: 'Épingler ou désépingler une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Statut d\'épinglage mis à jour.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvée.' })
  async pinConversation(
    @Param('id') id: string,
    @Body() body: { isPinned: boolean },
    @Req() req: RequestWithUser,
  ) {
    return this.rhAssistantService.pinConversation(
      +id,
      req.user.id,
      body.isPinned,
    );
  }

  @Patch('conversation/:id/rename')
  @ApiOperation({ summary: 'Renommer une conversation' })
  @ApiParam({ name: 'id', description: 'ID de la conversation' })
  @ApiResponse({ status: 200, description: 'Conversation renommée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 404, description: 'Conversation non trouvée.' })
  async renameConversation(
    @Param('id') id: string,
    @Body() body: { title: string },
    @Req() req: RequestWithUser,
  ) {
    return this.rhAssistantService.renameConversation(
      +id,
      req.user.id,
      body.title,
    );
  }
}