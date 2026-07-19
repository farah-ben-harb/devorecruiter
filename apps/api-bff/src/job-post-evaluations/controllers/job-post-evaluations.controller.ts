import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JobPostEvaluationService } from '../services/job-post-evaluations.service';
import {
  TriggerScoringResponseDto,
  ScoringResultResponseDto,
} from '../dtos/job-post-evaluation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Scoring Job Post')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TALENT_ACQUISITION, UserRole.ADMIN_RH)
@Controller('scoring-job-post')
export class JobPostEvaluationController {
  constructor(
    private readonly scoringJobPostService: JobPostEvaluationService,
  ) {}

  @Post('candidates/:candidateId/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Déclencher le scoring d\'un candidat sur les offres d\'emploi' })
  @ApiParam({ name: 'candidateId', description: 'UUID du candidat' })
  @ApiResponse({ status: 200, type: TriggerScoringResponseDto, description: 'Scoring déclenché avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Candidat non trouvé.' })
  triggerScoring(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<TriggerScoringResponseDto> {
    return this.scoringJobPostService.triggerScoring(candidateId);
  }

  @Get('candidates/:candidateId/results')
  @ApiOperation({ summary: 'Récupérer le dernier résultat de scoring d\'un candidat' })
  @ApiParam({ name: 'candidateId', description: 'UUID du candidat' })
  @ApiResponse({ status: 200, type: ScoringResultResponseDto, description: 'Dernier résultat de scoring retourné.' })
  @ApiResponse({ status: 200, schema: { nullable: true }, description: 'Aucun résultat trouvé (null).' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getLatestResult(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<ScoringResultResponseDto | null> {
    return this.scoringJobPostService.getLatestResult(candidateId);
  }

  @Get('candidates/:candidateId/history')
  @ApiOperation({ summary: 'Récupérer l\'historique des scorings d\'un candidat' })
  @ApiParam({ name: 'candidateId', description: 'UUID du candidat' })
  @ApiResponse({ status: 200, type: [ScoringResultResponseDto], description: 'Historique des scorings retourné.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  getHistory(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
  ): Promise<ScoringResultResponseDto[]> {
    return this.scoringJobPostService.getHistory(candidateId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un résultat de scoring' })
  @ApiParam({ name: 'id', description: 'UUID du résultat de scoring' })
  @ApiResponse({ status: 204, description: 'Résultat supprimé avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Résultat non trouvé.' })
  deleteResult(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.scoringJobPostService.deleteResult(id);
  }
}