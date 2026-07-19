import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InvitationsService } from '../../services/evaluation-invitations/evaluation-invitations.service';
import { SendInvitationDto } from '../../dtos/evaluation-invitations/evaluation-invitation.dto';
import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('Invitations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('send')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Envoyer des invitations aux candidats' })
  @ApiResponse({ status: 201, type: [Invitation], description: 'Invitations envoyées avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  send(@Body() dto: SendInvitationDto) {
    return this.invitationsService.sendInvitations(dto);
  }

  @Get('by-resume/:resumeFileId')
  @Roles(
    UserRole.ADMIN_RH,
    UserRole.TALENT_ACQUISITION,
    UserRole.TECHNICAL_REFERENT,
    UserRole.CONSULTANT,
  )
  @ApiOperation({ summary: 'Récupérer les invitations par ID de fichier CV' })
  @ApiParam({ name: 'resumeFileId', description: 'ID du fichier CV' })
  @ApiResponse({ status: 200, type: [Invitation], description: 'Liste des invitations retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getByResumeFileId(@Param('resumeFileId') resumeFileId: string) {
    return this.invitationsService.findByResumeFileId(resumeFileId);
  }

  @Get('by-job-post/:jobPostId')
  @Roles(
    UserRole.ADMIN_RH,
    UserRole.TALENT_ACQUISITION,
    UserRole.TECHNICAL_REFERENT,
    UserRole.CONSULTANT,
  )
  @ApiOperation({ summary: 'Récupérer les invitations par offre d\'emploi' })
  @ApiParam({ name: 'jobPostId', description: 'ID de l\'offre d\'emploi' })
  @ApiResponse({ status: 200, type: [Invitation], description: 'Liste des invitations retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getByJobPost(@Param('jobPostId', ParseIntPipe) jobPostId: number) {
    return this.invitationsService.findByJobPost(jobPostId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Supprimer une invitation' })
  @ApiParam({ name: 'id', description: 'ID de l\'invitation à supprimer' })
  @ApiResponse({ status: 200, description: 'Invitation supprimée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Invitation non trouvée.' })
  deleteInvitation(@Param('id', ParseIntPipe) id: number) {
    return this.invitationsService.deleteInvitation(id);
  }

  @Get('by-evaluation/:evaluationId')
  @Roles(
    UserRole.TECHNICAL_REFERENT,
    UserRole.ADMIN_RH,
    UserRole.TALENT_ACQUISITION,
  )
  @ApiOperation({ summary: 'Récupérer les invitations par évaluation technique' })
  @ApiParam({ name: 'evaluationId', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 200, type: [Invitation], description: 'Liste des invitations retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getByEvaluation(@Param('evaluationId', ParseIntPipe) evaluationId: number) {
    return this.invitationsService.findByEvaluation(evaluationId);
  }
}