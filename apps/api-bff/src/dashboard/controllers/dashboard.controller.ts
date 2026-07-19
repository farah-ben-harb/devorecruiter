import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { DashboardService } from '../services/dashboard.service';
import type { AuthRequest } from '../../auth/interfaces/auth.interface';
import { requireGoogleAccessToken } from '../../common/utils/auth-request.util';
import {
  UserStats,
  JobPostStats,
  CvStats,
  EvaluationStats,
  ReferentEvaluationStats,
  ReferentInvitationStats,
  ActivityPoint,
  PendingEvaluation,
  ConsultantStats,
  ConsultantActivityPoint,
  ConsultantHourlyPoint,
  RecentConversation,
  ConsultantDomainStats,
} from '../interfaces/dashboard.interface';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('users')
  @Roles(UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Récupérer les statistiques des utilisateurs' })
  @ApiResponse({ status: 200, description: 'Statistiques des utilisateurs retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getUserStats(): Promise<UserStats> {
    return this.dashboardService.getUserStats();
  }

  @Get('job-posts')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT)
  @ApiOperation({ summary: 'Récupérer les statistiques des fiches de poste' })
  @ApiResponse({ status: 200, description: 'Statistiques des fiches de poste retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getJobPostStats(): Promise<JobPostStats> {
    return this.dashboardService.getJobPostStats();
  }

  @Get('candidates')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Récupérer les statistiques des candidats' })
  @ApiResponse({ status: 200, description: 'Statistiques des candidats retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getCvStats(): Promise<CvStats> {
    return this.dashboardService.getCvStats();
  }

  @Get('evaluations')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT)
  @ApiOperation({ summary: 'Récupérer les statistiques des évaluations' })
  @ApiResponse({ status: 200, description: 'Statistiques des évaluations retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getEvaluationStats(): Promise<EvaluationStats> {
    return this.dashboardService.getEvaluationStats();
  }

  @Get('referent/evaluations')
  @Roles(UserRole.ADMIN_RH, UserRole.TECHNICAL_REFERENT)
  @ApiOperation({ summary: 'Récupérer les statistiques d\'évaluations du référent technique' })
  @ApiResponse({ status: 200, description: 'Statistiques des évaluations référent retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getReferentEvaluationStats(): Promise<ReferentEvaluationStats> {
    return this.dashboardService.getReferentEvaluationStats();
  }

  @Get('referent/invitations')
  @Roles(UserRole.ADMIN_RH, UserRole.TECHNICAL_REFERENT, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Récupérer les statistiques d\'invitations du référent technique' })
  @ApiResponse({ status: 200, description: 'Statistiques des invitations référent retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getReferentInvitationStats(): Promise<ReferentInvitationStats> {
    return this.dashboardService.getReferentInvitationStats();
  }

  @Get('referent/activity')
  @Roles(UserRole.ADMIN_RH, UserRole.TECHNICAL_REFERENT)
  @ApiOperation({ summary: 'Récupérer l\'activité du référent technique' })
  @ApiResponse({ status: 200, description: 'Points d\'activité référent retournés.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getReferentActivity(): Promise<ActivityPoint[]> {
    return this.dashboardService.getReferentActivity();
  }

  @Get('referent/pending')
  @Roles(UserRole.ADMIN_RH, UserRole.TECHNICAL_REFERENT, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Récupérer les évaluations en attente' })
  @ApiResponse({ status: 200, description: 'Liste des évaluations en attente retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getPendingEvaluations(): Promise<PendingEvaluation[]> {
    return this.dashboardService.getPendingEvaluations();
  }

  @Get('consultant/stats')
  @Roles(UserRole.ADMIN_RH, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer les statistiques du consultant connecté' })
  @ApiResponse({ status: 200, description: 'Statistiques consultant retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async getConsultantStats(@Req() req: AuthRequest): Promise<ConsultantStats> {
    const user = requireGoogleAccessToken(req);
    return this.dashboardService.getConsultantStats(user.id);
  }

  @Get('consultant/activity')
  @Roles(UserRole.ADMIN_RH, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer l\'activité du consultant connecté' })
  @ApiResponse({ status: 200, description: 'Points d\'activité consultant retournés.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async getConsultantActivity(@Req() req: AuthRequest): Promise<ConsultantActivityPoint[]> {
    const user = requireGoogleAccessToken(req);
    return this.dashboardService.getConsultantActivity(user.id);
  }

  @Get('consultant/hourly')
  @Roles(UserRole.ADMIN_RH, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer l\'activité horaire du consultant connecté' })
  @ApiResponse({ status: 200, description: 'Points d\'activité horaire consultant retournés.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async getConsultantHourlyActivity(@Req() req: AuthRequest): Promise<ConsultantHourlyPoint[]> {
    const user = requireGoogleAccessToken(req);
    return this.dashboardService.getConsultantHourlyActivity(user.id);
  }

  @Get('consultant/recent')
  @Roles(UserRole.ADMIN_RH, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer les conversations récentes du consultant connecté' })
  @ApiResponse({ status: 200, description: 'Conversations récentes retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async getRecentConversations(@Req() req: AuthRequest): Promise<RecentConversation[]> {
    const user = requireGoogleAccessToken(req);
    return this.dashboardService.getRecentConversations(user.id);
  }

  @Get('consultant/domains')
  @Roles(UserRole.ADMIN_RH, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer les statistiques par domaine du consultant connecté' })
  @ApiResponse({ status: 200, description: 'Statistiques par domaine consultant retournées.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async getConsultantDomainStats(@Req() req: AuthRequest): Promise<ConsultantDomainStats> {
    const user = requireGoogleAccessToken(req);
    return this.dashboardService.getConsultantDomainStats(user.id);
  }
}