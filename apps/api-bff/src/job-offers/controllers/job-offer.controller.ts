import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { JobOfferService } from '../services/job-offer.service';
import { GenerateJobOfferDto, UpdateJobOfferDto, JobOfferResponseDto, GenerateFromJobPostDto } from '../dtos/job-offer.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthRequest } from '../../auth/interfaces/auth.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { requireGoogleAccessToken } from '../../common/utils/auth-request.util';

@ApiTags('Job Offers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('job-offers')
export class JobOfferController {
  constructor(private readonly jobOfferService: JobOfferService) { }

  // ── POST /job-offers/generate ─────────────────────────────
  @Post('generate')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Générer une offre LinkedIn via le modèle IA' })
  @ApiResponse({ status: 201, type: JobOfferResponseDto, description: 'Offre générée avec succès.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  generate(@Req() req: AuthRequest, @Body() dto: GenerateJobOfferDto) {
    const user = requireGoogleAccessToken(req);
    return this.jobOfferService.generate(dto, user.id);
  }

  // ── GET /job-offers ───────────────────────────────────────
  @Get()
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Lister toutes mes offres' })
  @ApiResponse({ status: 200, type: [JobOfferResponseDto], description: 'Liste des offres retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  findAll(@Req() req: AuthRequest) {
    const user = requireGoogleAccessToken(req);
    return this.jobOfferService.findAll(user.id);
  }

  // ── GET /job-offers/:id ───────────────────────────────────
  @Get(':id')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: "Voir le détail d'une offre" })
  @ApiParam({ name: 'id', description: "UUID de l'offre" })
  @ApiResponse({ status: 200, type: JobOfferResponseDto, description: 'Offre retournée.' })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  findOne(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    const user = requireGoogleAccessToken(req);
    return this.jobOfferService.findOne(id, user.id);
  }

  // ── PATCH /job-offers/:id ─────────────────────────────────
  @Patch(':id')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @ApiOperation({ summary: 'Modifier une offre (titre, texte, sections…)' })
  @ApiParam({ name: 'id', description: "UUID de l'offre" })
  @ApiResponse({ status: 200, type: JobOfferResponseDto, description: 'Offre mise à jour.' })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobOfferDto,
  ) {
    const user = requireGoogleAccessToken(req);
    return this.jobOfferService.update(id, user.id, dto);
  }

  // ── DELETE /job-offers/:id ────────────────────────────────
  @Delete(':id')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supprimer une offre' })
  @ApiParam({ name: 'id', description: "UUID de l'offre" })
  @ApiResponse({ status: 200, description: 'Offre supprimée.' })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    const user = requireGoogleAccessToken(req);
    return this.jobOfferService.remove(id, user.id);
  }

  @Post('generate-from-job-post')
  @Roles(UserRole.ADMIN_RH, UserRole.TALENT_ACQUISITION)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Générer une ou plusieurs offres LinkedIn depuis des fiches de poste unifiées' })
  @ApiResponse({ status: 201, type: [JobOfferResponseDto] })
  generateFromJobPost(
    @Req() req: AuthRequest,
    @Body() dto: GenerateFromJobPostDto,
  ) {
    const user = requireGoogleAccessToken(req);
    return this.jobOfferService.generateFromJobPost(dto.jobPostIds, user.id);
  }
}