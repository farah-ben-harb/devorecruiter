import {
  Controller,
  Get,
  Res,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ExportService } from '../services/export.service';
import { UsersService } from '../../users/services/users.service';
import { JobPostService } from '../../job-posts/services/job-posts.service';
import { CandidateService } from '../../candidates/services/candidate.service';
import { requireGoogleAccessToken } from '../../common/utils/auth-request.util';
import type { AuthRequest } from '../../auth/interfaces/auth.interface';

@ApiTags('Export')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('export')
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly usersService: UsersService,
    private readonly jobPostService: JobPostService,
    private readonly candidateService: CandidateService,
  ) {}

  @Get('users')
  @Roles(UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Exporter les utilisateurs au format Excel' })
  @ApiResponse({
    status: 200,
    description: 'Fichier Excel des utilisateurs téléchargé.',
    headers: {
      'Content-Disposition': {
        description: 'attachment; filename="utilisateurs_YYYY-MM-DD.xlsx"',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async exportUsers(@Res() res: Response): Promise<void> {
    const { data: users } = await this.usersService.findAll(1, 9999);
    const buffer = await this.exportService.exportUsersToExcel(users);
    const date = new Date().toISOString().split('T')[0];

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="utilisateurs_${date}.xlsx"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get('job-posts/excel')
  @Roles(UserRole.TALENT_ACQUISITION, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Exporter les fiches de poste au format Excel' })
  @ApiResponse({
    status: 200,
    description: 'Fichier Excel des fiches de poste téléchargé.',
    headers: {
      'Content-Disposition': {
        description: 'attachment; filename="fiches_poste_YYYY-MM-DD.xlsx"',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async exportJobPostsExcel(@Res() res: Response): Promise<void> {
    const { data: jobPosts } = await this.jobPostService.getAll(1, 9999);
    const buffer = await this.exportService.exportJobPostsToExcel(jobPosts);
    const date = new Date().toISOString().split('T')[0];

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="fiches_poste_${date}.xlsx"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get('job-posts/zip')
  @Roles(UserRole.TALENT_ACQUISITION, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Exporter les fiches de poste au format ZIP (avec documents Google Drive)' })
  @ApiResponse({
    status: 200,
    description: 'Archive ZIP des fiches de poste téléchargée.',
    headers: {
      'Content-Disposition': {
        description: 'attachment; filename="fiches_poste_YYYY-MM-DD.zip"',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token Google manquant.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async exportJobPostsZip(
    @Req() req: AuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const user = requireGoogleAccessToken(
      req,
      () => new BadRequestException('Token Google manquant'),
    );
    const { data: jobPosts } = await this.jobPostService.getAll(1, 9999);
    const buffer = await this.exportService.exportJobPostsToZip(
      jobPosts,
      user.id,
    );
    const date = new Date().toISOString().split('T')[0];

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="fiches_poste_${date}.zip"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get('candidates/excel')
  @Roles(UserRole.TALENT_ACQUISITION, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Exporter les candidats au format Excel' })
  @ApiResponse({
    status: 200,
    description: 'Fichier Excel des candidats téléchargé.',
    headers: {
      'Content-Disposition': {
        description: 'attachment; filename="candidats_YYYY-MM-DD.xlsx"',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async exportCandidatesExcel(@Res() res: Response): Promise<void> {
    const { data: candidates } = await this.candidateService.findAll(1, 9999);
    const buffer = await this.exportService.exportCandidatesToExcel(candidates);
    const date = new Date().toISOString().split('T')[0];

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="candidats_${date}.xlsx"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }

  @Get('candidates/zip')
  @Roles(UserRole.TALENT_ACQUISITION, UserRole.ADMIN_RH)
  @ApiOperation({ summary: 'Exporter les candidats au format ZIP (avec CVs depuis Google Drive)' })
  @ApiResponse({
    status: 200,
    description: 'Archive ZIP des candidats téléchargée.',
    headers: {
      'Content-Disposition': {
        description: 'attachment; filename="candidats_YYYY-MM-DD.zip"',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token Google manquant.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async exportCandidatesZip(
    @Req() req: AuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const user = requireGoogleAccessToken(
      req,
      () => new BadRequestException('Token Google manquant'),
    );
    const { data: candidates } = await this.candidateService.findAll(1, 9999);
    const buffer = await this.exportService.exportCandidatesToZip(
      candidates,
      user.id,
    );
    const date = new Date().toISOString().split('T')[0];

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="candidats_${date}.zip"`,
      'Content-Length': String(buffer.length),
    });
    res.end(buffer);
  }
}