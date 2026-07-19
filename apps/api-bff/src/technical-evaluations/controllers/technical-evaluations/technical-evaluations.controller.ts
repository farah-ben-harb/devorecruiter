import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TechnicalEvaluationService } from '../../services/technical-evaluations/technical-evaluations.service';
import {
  CreateTechnicalEvaluationDto,
  UpdateTechnicalEvaluationDto,
  RegenerateTechnicalEvaluationDto,
  ApproveEvaluationDto,
  UpdateEvaluationContentDto,
} from '../../dtos/technical-evaluations/technical-evaluations.dto';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { CandidateCodeEvaluation } from '../../entities/candidate-code-evaluations/candidate-code-evaluations.entity';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';
import type { AuthRequest } from '../../../auth/interfaces/auth.interface';
import { requireGoogleAccessToken } from '../../../common/utils/auth-request.util';
import { CandidateCodeEvaluationService } from '../../services/candidate-code-evaluations/candidate-code-evaluation.service';

@ApiTags('Technical Evaluations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('technical-evaluations')
export class TechnicalEvaluationController {
  constructor(
    private readonly service: TechnicalEvaluationService,
    private readonly codeEvalService: CandidateCodeEvaluationService,
  ) { }

  @Post('generate')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT)
  @ApiOperation({ summary: 'Générer une évaluation technique pour une offre d\'emploi' })
  @ApiResponse({ status: 201, type: TechnicalEvaluation, description: 'Évaluation générée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  generate(@Req() req: AuthRequest, @Body() dto: CreateTechnicalEvaluationDto) {
    const user = requireGoogleAccessToken(req);
    return this.service.generate(user.id, dto);
  }


  @Post('sync-drive')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT)
  @ApiOperation({ summary: 'Synchroniser les évaluations depuis Google Drive' })
  @ApiQuery({ name: 'jobPostId', description: 'ID de l\'offre d\'emploi', example: 1 })
  @ApiResponse({ status: 201, description: 'Synchronisation effectuée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  syncFromDrive(
    @Req() req: AuthRequest,
    @Query('jobPostId', ParseIntPipe) jobPostId: number,
  ) {
    const user = requireGoogleAccessToken(req);
    return this.service.syncFromDrive(user.id, jobPostId);
  }

  @Post('regenerate')
  @Roles(UserRole.TECHNICAL_REFERENT, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Régénérer une évaluation technique existante' })
  @ApiResponse({ status: 201, type: TechnicalEvaluation, description: 'Évaluation régénérée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  regenerate(
    @Req() req: AuthRequest,
    @Body() dto: RegenerateTechnicalEvaluationDto,
  ) {
    const user = requireGoogleAccessToken(req);
    return this.service.regenerate(user.id, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer toutes les évaluations techniques d\'une offre d\'emploi' })
  @ApiQuery({ name: 'jobPostId', description: 'ID de l\'offre d\'emploi', example: 1 })
  @ApiResponse({ status: 200, type: [TechnicalEvaluation], description: 'Liste des évaluations retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  findAll(
    @Req() req: AuthRequest,
    @Query('jobPostId', ParseIntPipe) jobPostId: number,
    @Query('mode') mode?: 'coding' | 'quiz',
  ) {
    const user = requireGoogleAccessToken(req);
    return this.service.findAll(user.id, jobPostId, mode);
  }

  @Get('by-job-post')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer les évaluations par offre d\'emploi' })
  @ApiQuery({ name: 'jobPostId', description: 'ID de l\'offre d\'emploi', example: 1 })
  @ApiResponse({ status: 200, type: [TechnicalEvaluation], description: 'Liste des évaluations retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  findByJobPost(@Query('jobPostId') jobPostId: string) {
    return this.service.findAllByJobPost(Number(jobPostId));
  }

  @Get('candidate-code/invitation/:invitationId')
  @ApiOperation({ summary: 'Récupérer l\'évaluation de code par invitation' })
  @ApiParam({ name: 'invitationId', description: 'ID de l\'invitation' })
  @ApiResponse({ status: 200, type: CandidateCodeEvaluation, description: 'Évaluation de code retournée.' })
  @ApiResponse({ status: 404, description: 'Évaluation non trouvée.' })
  getByInvitation(@Param('invitationId') invitationId: string) {
    return this.codeEvalService.findByInvitation(+invitationId);
  }

  @Get('candidate-code/by-evaluation/:evaluationId')
  @ApiOperation({ summary: 'Récupérer les évaluations de code par évaluation technique' })
  @ApiParam({ name: 'evaluationId', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 200, type: [CandidateCodeEvaluation], description: 'Liste des évaluations de code retournée.' })
  @ApiResponse({ status: 404, description: 'Évaluation non trouvée.' })
  getByEvaluation(@Param('evaluationId') evaluationId: string) {
    return this.codeEvalService.findByEvaluation(+evaluationId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION, UserRole.TECHNICAL_REFERENT, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Récupérer une évaluation technique par son ID' })
  @ApiParam({ name: 'id', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 200, type: TechnicalEvaluation, description: 'Évaluation retournée.' })
  @ApiResponse({ status: 404, description: 'Évaluation non trouvée.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.TECHNICAL_REFERENT)
  @ApiOperation({ summary: 'Mettre à jour une évaluation technique' })
  @ApiParam({ name: 'id', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 200, type: TechnicalEvaluation, description: 'Évaluation mise à jour.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Évaluation non trouvée.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTechnicalEvaluationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Supprimer une évaluation technique' })
  @ApiParam({ name: 'id', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 200, description: 'Évaluation supprimée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Évaluation non trouvée.' })
  delete(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const user = requireGoogleAccessToken(req);
    return this.service.delete(user.id, id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.TECHNICAL_REFERENT, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Approuver ou rejeter une évaluation technique' })
  @ApiParam({ name: 'id', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 200, type: TechnicalEvaluation, description: 'Décision enregistrée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Évaluation non trouvée.' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveEvaluationDto,
  ) {
    return this.service.approve(id, dto);
  }


  @Patch(':id/content')
  @Roles(UserRole.TECHNICAL_REFERENT, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Modifier le contenu HTML ou quiz d\'une évaluation technique' })
  @ApiParam({ name: 'id', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 200, type: TechnicalEvaluation, description: 'Contenu mis à jour.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Évaluation non trouvée.' })
  updateContent(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvaluationContentDto,
  ) {
    const user = requireGoogleAccessToken(req);
    return this.service.updateContent(user.id, id, {
      htmlContent: dto.htmlContent,
      quizContent: dto.quizContent,
      quizAnswerKey: dto.quizAnswerKey,
      isQuiz: dto.isQuiz ?? false,
      changeType: dto.changeType ?? 'minor',
    });
  }

  @Post(':id/git-repo')
  @Roles(UserRole.TECHNICAL_REFERENT, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Créer un dépôt Git pour une évaluation technique' })
  @ApiParam({ name: 'id', description: 'ID de l\'évaluation technique' })
  @ApiResponse({ status: 201, description: 'Dépôt Git créé avec succès.', schema: { example: { gitRepoUrl: 'https://github.com/org/repo' } } })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  createGitRepo(@Param('id', ParseIntPipe) id: number) {
    return this.service.createGitRepo(id);
  }

  @Post('candidate-code/:invitationId/evaluate')
  @ApiOperation({ summary: 'Évaluer le code soumis par un candidat' })
  @ApiParam({ name: 'invitationId', description: 'ID de l\'invitation du candidat' })
  @ApiResponse({ status: 201, type: CandidateCodeEvaluation, description: 'Évaluation de code effectuée.' })
  @ApiResponse({ status: 404, description: 'Invitation non trouvée.' })
  evaluateCandidateCode(@Param('invitationId') invitationId: string) {
    return this.codeEvalService.evaluateCandidateWork(+invitationId);
  }
}