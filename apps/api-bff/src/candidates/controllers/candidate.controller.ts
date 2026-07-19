import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Req,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CandidateService } from '../services/candidate.service';
import { Candidate } from '../entities/candidate.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaginateQueryDto } from '../../common/dtos/paginate-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import type { AuthRequest } from '../../auth/interfaces/auth.interface';
import {
  getGoogleAuthenticatedUser,
  requireGoogleAccessToken,
} from '../../common/utils/auth-request.util';
import { CandidateDriveService } from '../services/candidate-drive.service';
import { ResumeListItem } from '../interfaces/candidate-repository.interface';

@Controller('candidates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TALENT_ACQUISITION, UserRole.ADMIN_RH)
export class CandidateController {
  constructor(
    private readonly candidateService: CandidateService,
    private readonly candidateDriveService: CandidateDriveService,
  ) {}

  // ─── Liste paginée brute ───────────────────────────────────────────────────
  @Get('all')
  findAll(
    @Query() query: PaginateQueryDto,
  ): Promise<PaginatedResult<Candidate>> {
    return this.candidateService.findAll(query.page, query.limit);
  }
  // Télécharger un fichier Drive candidat
  @Get('download/:fileId')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Req() req: AuthRequest,
  ): Promise<{ data: string; mimeType: string }> {
    const user = requireGoogleAccessToken(
      req,
      () => new BadRequestException('Token Google manquant'),
    );
    const data = await this.candidateService.downloadFile(user.id, fileId);
    return { data, mimeType: 'application/pdf' };
  }

  @Get('drive-files')
  listDriveFiles(
    @Req() req: AuthRequest,
    @Query('folderId') folderId: string,
  ): Promise<unknown> {
    const user = getGoogleAuthenticatedUser(req);
    if (!user?.googleAccessToken) return Promise.resolve([]);
    if (!folderId) return Promise.resolve({ message: 'Folder ID manquant' });
    return this.candidateService.listDriveFiles(user.id, folderId);
  }
  @Get()
  listResumes(
    @Query() query: PaginateQueryDto,
  ): Promise<PaginatedResult<ResumeListItem>> {
    return this.candidateService.listResumes(query.page, query.limit);
  }

  @Post('sync-drive')
  async syncFromDrive(
    @Req() req: AuthRequest,
  ): Promise<{ added: number; removed: number }> {
    const user = requireGoogleAccessToken(
      req,
      () => new BadRequestException('Token Google manquant'),
    );
    return this.candidateDriveService.syncFromDrive(user.id);
  }
  // ─── Upload CV brut ────────────────────────────────────────────────────────
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Format non supporté (PDF, DOC, DOCX uniquement)',
            ),
            false,
          );
        }
      },
    }),
  )
  uploadResumeBrut(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
    @Query('folderId') folderId: string,
  ): Promise<Candidate> {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    if (!folderId) throw new BadRequestException('Folder ID manquant');
    const user = requireGoogleAccessToken(
      req,
      () => new BadRequestException('Token Google manquant'),
    );
    return this.candidateService.uploadResumeBrut(user.id, file, folderId);
  }

  // ─── Déclencher unification ────────────────────────────────────────────────
  @Post(':id/unify')
  triggerUnification(@Param('id') id: string): Promise<{ message: string }> {
    return this.candidateService.triggerUnification(id);
  }
  // ─── Suppression d'un CV ──────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteResume(
    @Param('id') id: string,
    @Query('type') type: 'brut' | 'unifie',
    @Req() req: AuthRequest,
  ): Promise<void> {
    if (!type || !['brut', 'unifie'].includes(type)) {
      throw new BadRequestException(
        'Le paramètre type doit être "brut" ou "unifie"',
      );
    }
    const user = requireGoogleAccessToken(
      req,
      () => new BadRequestException('Token Google manquant'),
    );
    return this.candidateService.deleteResume(user.id, id, type);
  }

  @Patch(':id/fields')
  updateFields(
    @Param('id') id: string,
    @Body() body: { githubUsername?: string; email?: string },
  ): Promise<Candidate> {
    return this.candidateService.updateFields(id, body);
  }
}
