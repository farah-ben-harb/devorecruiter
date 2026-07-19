import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Body,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Patch,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JobPostService } from '../services/job-posts.service';
import { CreateJobPostDto } from '../dtos/job-post.dto';
import { JobPost, JobPostActivityStatus } from '../entities/job-post.entity';
import { JobPostCriteria } from '../entities/job-post-criteria.entity'; // ← NOUVEAU
import type { AuthRequest } from '../../auth/interfaces/auth.interface';
import type { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import type { GoogleDriveFilesResponse } from '../../common/interfaces/google-drive.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { requireGoogleAccessToken } from '../../common/utils/auth-request.util';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { JobPostCriteriaService } from '../services/job-post-criteria.service';
import type { RawCriteriaPayload } from '../services/job-post-criteria.service';
import { CandidateSearchResult } from '../interfaces/job-post.interface';

type ProcessPostResponse = { message: string; data: JobPost };
type UnifyResponse = { message: string };

@ApiTags('Job Posts')
@ApiBearerAuth('access-token')
@Controller(['job-posts'])
export class JobPostController {
  constructor(
    private readonly jobpostService: JobPostService,
    private readonly configService: ConfigService,
    private readonly criteriaService: JobPostCriteriaService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post('process')
  @ApiOperation({ summary: "Traiter une offre d'emploi depuis Google Drive" })
  @ApiResponse({ status: 201, description: 'Offre traitée avec succès.', schema: { example: { message: 'Post processed', data: {} } } })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async processPost(
    @Body() dto: CreateJobPostDto,
    @Req() req: AuthRequest,
  ): Promise<ProcessPostResponse> {
    const user = requireGoogleAccessToken(req);
    const post = await this.jobpostService.processPost(dto, user.id);
    return { message: 'Post processed', data: post };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: "Importer une offre d'emploi depuis un fichier local" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary', description: 'Fichier CV ou offre d\'emploi' } } } })
  @ApiResponse({ status: 201, description: 'Fichier importé avec succès.', schema: { example: { message: 'File imported successfully', data: {} } } })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async uploadJobPost(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthRequest,
  ): Promise<ProcessPostResponse> {
    const user = requireGoogleAccessToken(req);
    const post = await this.jobpostService.uploadFromLocal(user.id, file);
    return { message: 'File imported successfully', data: post };
  }

  @Post('sync-drive')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Synchroniser les offres d'emploi depuis Google Drive" })
  @ApiQuery({ name: 'folderId', required: false, description: 'ID du dossier Google Drive source' })
  @ApiQuery({ name: 'unifiedFolderId', required: false, description: 'ID du dossier Google Drive unifié' })
  @ApiResponse({ status: 201, description: 'Synchronisation effectuée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async syncFromDrive(
    @Query('folderId') folderId: string,
    @Query('unifiedFolderId') unifiedFolderId: string,
    @Req() req: AuthRequest,
  ) {
    const user = requireGoogleAccessToken(req);
    const unifiedFolder =
      unifiedFolderId ||
      this.configService.get<string>('DRIVE_FOLDER_UNIFIED_ID');
    return this.jobpostService.syncFromDrive(user.id, folderId, unifiedFolder);
  }

  @Post(':id/unify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Déclencher l'unification d'une offre d'emploi + extraction des critères" })
  @ApiParam({ name: 'id', description: "ID de l'offre d'emploi" })
  @ApiResponse({ status: 201, description: 'Unification déclenchée.', schema: { example: { message: 'Unification triggered successfully' } } })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  async triggerUnification(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ): Promise<UnifyResponse> {
    const user = requireGoogleAccessToken(req);
    return this.jobpostService.triggerUnification(id, user.id);
  }

  // ── NOUVEAU ────────────────────────────────────────────────────────────────

  @Get(':id/criteria')
  @ApiOperation({ summary: "Récupérer les critères extraits d'une fiche de poste" })
  @ApiParam({ name: 'id', description: "ID de la fiche de poste" })
  @ApiResponse({ status: 200, type: JobPostCriteria, description: 'Critères retournés.' })
  @ApiResponse({ status: 404, description: 'Critères non trouvés.' })
  async getCriteria(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<JobPostCriteria> {
    return this.jobpostService.getCriteria(id);
  }

  // ──────────────────────────────────────────────────────────────────────────

  @Get('imported-file-ids')
  @ApiOperation({ summary: 'Récupérer les IDs des fichiers déjà importés' })
  @ApiResponse({ status: 200, description: 'Liste des IDs retournée.', schema: { example: ['uuid-1', 'uuid-2'] } })
  @UseGuards(JwtAuthGuard)
  async getImportedFileIds(): Promise<string[]> {
    return this.jobpostService.getImportedFileIds();
  }

  @Get('download/:docId')
  @ApiOperation({ summary: 'Télécharger un document généré depuis Google Drive' })
  @ApiParam({ name: 'docId', description: 'ID du document Google Drive' })
  @ApiQuery({ name: 'mimeType', required: false, description: 'Type MIME du fichier (défaut: application/pdf)', example: 'application/pdf' })
  @ApiResponse({ status: 200, description: 'Fichier retourné en base64.', schema: { example: { data: 'base64...', mimeType: 'application/pdf', fileName: 'document.pdf' } } })
  @UseGuards(JwtAuthGuard)
  async downloadGeneratedDocument(
    @Param('docId') docId: string,
    @Query('mimeType') mimeType: string,
    @Req() req: AuthRequest,
  ): Promise<{ data: string; mimeType: string; fileName: string }> {
    const user = requireGoogleAccessToken(req);
    const resolvedMimeType = mimeType || 'application/pdf';
    const base64 = await this.jobpostService.downloadFile(
      user.id,
      docId,
      resolvedMimeType,
    );
    const extMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };
    const ext = extMap[resolvedMimeType] ?? 'pdf';
    return { data: base64, mimeType: resolvedMimeType, fileName: `${docId}.${ext}` };
  }

  @Get('drive-files')
  @ApiOperation({ summary: 'Lister les fichiers dans un dossier Google Drive' })
  @ApiQuery({ name: 'folderId', required: true, description: 'ID du dossier Google Drive' })
  @ApiResponse({ status: 200, description: 'Liste des fichiers retournée.' })
  @ApiResponse({ status: 400, description: 'Folder ID manquant.' })
  @UseGuards(JwtAuthGuard)
  async getDriveFiles(
    @Req() req: AuthRequest,
    @Query('folderId') folderId: string,
  ): Promise<GoogleDriveFilesResponse['files']> {
    const user = requireGoogleAccessToken(req);
    if (!folderId) throw new BadRequestException('Folder ID missing');
    return this.jobpostService.listFiles(user.id, folderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('all')
  @ApiOperation({ summary: "Récupérer toutes les offres d'emploi avec pagination" })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de résultats par page', example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Mot clé de recherche' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut', enum: ['raw', 'processing', 'unified', 'error'] })
  @ApiResponse({ status: 200, description: 'Liste paginée des offres.', type: [JobPost] })
  async getAllPosts(
    @Query('page') rawPage?: string,
    @Query('limit') rawLimit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('jobStatus') jobStatus?: string,
  ): Promise<PaginatedResult<JobPost>> {
    const page = rawPage ? parseInt(rawPage, 10) || 1 : 1;
    const limit = rawLimit ? parseInt(rawLimit, 10) || 10 : 10;
    return this.jobpostService.getAll(page, limit, search, status, jobStatus);
  }

  @UseGuards(JwtAuthGuard)
  @Get('with-evaluations')
  @ApiOperation({ summary: "Récupérer les offres d'emploi avec leurs évaluations" })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre de résultats par page', example: 10 })
  @ApiQuery({ name: 'search', required: false, description: 'Mot clé de recherche' })
  @ApiResponse({ status: 200, description: 'Liste paginée des offres avec évaluations.', type: [JobPost] })
  async getPostsWithEvaluations(
    @Query('page') rawPage?: string,
    @Query('limit') rawLimit?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedResult<JobPost>> {
    const page = rawPage ? parseInt(rawPage, 10) || 1 : 1;
    const limit = rawLimit ? parseInt(rawLimit, 10) || 10 : 10;
    return this.jobpostService.getAllWithEvaluations(page, limit, search);
  }

  @UseGuards(JwtAuthGuard)
  @Post('share-existing')
  @ApiOperation({ summary: 'Partager tous les fichiers existants sur Google Drive' })
  @ApiResponse({ status: 201, description: 'Partage effectué.', schema: { example: { message: 'Done' } } })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async shareExisting(@Req() req: AuthRequest): Promise<{ message: string }> {
    const user = requireGoogleAccessToken(req);
    await this.jobpostService.shareAllExistingFiles(user.id);
    return { message: 'Done' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: "Supprimer une offre d'emploi" })
  @ApiParam({ name: 'id', description: "ID de l'offre d'emploi à supprimer" })
  @ApiResponse({ status: 200, description: 'Offre supprimée.', schema: { example: { message: 'Post 1 deleted successfully', id: 1, action: 'deleted' } } })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  async deletePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ): Promise<{ message: string; id: number; action: 'deleted' | 'reset' }> {
    const user = requireGoogleAccessToken(req);
    const { action } = await this.jobpostService.deletePost(id, user.id);
    const message =
      action === 'deleted'
        ? `Post ${id} deleted successfully`
        : `Unknown action for post ${id}`;
    return { message, id, action };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: "Récupérer une offre d'emploi par son ID" })
  @ApiParam({ name: 'id', description: "ID de l'offre d'emploi" })
  @ApiResponse({ status: 200, type: JobPost, description: "Offre d'emploi retournée." })
  @ApiResponse({ status: 404, description: 'Offre non trouvée.' })
  findOne(@Param('id') id: number) {
    return this.jobpostService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/requires-coding')
  @ApiOperation({ summary: 'Mettre à jour le champ requires_coding' })
  @ApiParam({ name: 'id', description: "ID de l'offre d'emploi" })
  @ApiResponse({ status: 200, description: 'Champ mis à jour.' })
  async updateRequiresCoding(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { requiresCoding: boolean | null },
  ): Promise<JobPost> {
    return this.jobpostService.updateRequiresCoding(id, body.requiresCoding);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/has-qcm')
  @ApiOperation({ summary: 'Mettre à jour le champ has_qcm' })
  @ApiParam({ name: 'id', description: "ID de l'offre d'emploi" })
  @ApiResponse({ status: 200, description: 'Champ mis à jour.' })
  async updateHasQcm(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { hasQcm: boolean | null },
  ): Promise<JobPost> {
    return this.jobpostService.updateHasQcm(id, body.hasQcm);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/title')
  @ApiOperation({ summary: 'Mettre à jour le titre et le client' })
  @ApiParam({ name: 'id', description: "ID de l'offre d'emploi" })
  @ApiResponse({ status: 200, description: 'Champ mis à jour.' })
  async updateTitle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string; company: string },
  ): Promise<JobPost> {
    return this.jobpostService.updateTitle(id, body.title, body.company);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Dupliquer une fiche de poste' })
  @ApiParam({ name: 'id', description: 'ID de la fiche à dupliquer' })
  @ApiResponse({ status: 201, description: 'Fiche dupliquée avec succès.' })
  async duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string; company: string; hasQcm: boolean; requiresCoding: boolean },
    @Req() req: AuthRequest,
  ): Promise<JobPost> {
    const user = requireGoogleAccessToken(req);
    return this.jobpostService.duplicate(id, body, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/docx-url')
  @ApiOperation({ summary: "Récupérer l'URL du fichier DOCX unifié" })
  @ApiParam({ name: 'id', description: 'ID de la fiche de poste' })
  @ApiResponse({ status: 200, description: 'URL du DOCX retournée.' })
  async getDocxUrl(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ url: string; docxId: string | null }> {
    const post = await this.jobpostService.findOne(id);
    const docxId = post.unifiedDocxId ?? null;
    const url = docxId
      ? `https://docs.google.com/document/d/${docxId}/edit`
      : '';
    return { url, docxId };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/download-pdf')
  @ApiOperation({ summary: 'Télécharger la fiche unifiée en PDF' })
  @ApiParam({ name: 'id', description: 'ID de la fiche de poste' })
  async downloadUnifiedPdf(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthRequest,
  ): Promise<{ data: string; mimeType: string; fileName: string }> {
    const user = requireGoogleAccessToken(req);
    const post = await this.jobpostService.findOne(id);

    const fileId = post.unifiedDocxId ?? post.googleDocId;
    if (!fileId) throw new NotFoundException('Aucun fichier unifié disponible');

    const base64 = await this.jobpostService.downloadFile(
      user.id,
      fileId,
      'application/pdf',
    );

    const fileName = (post.title ?? post.name).replace(/\.[^/.]+$/, '') + '.pdf';
    return { data: base64, mimeType: 'application/pdf', fileName };
  }

    @UseGuards(JwtAuthGuard)
  @Patch(':id/job-status')
  @ApiOperation({ summary: 'Mettre à jour le statut métier de la fiche de poste' })
  @ApiParam({ name: 'id', description: 'ID de la fiche de poste' })
  @ApiResponse({ status: 200, type: JobPost })
  async updateJobStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      jobStatus: 'open' | 'closed_with_hire' | 'closed_without_hire' | null;
      linkedCandidateIds?: string[];
    },
  ): Promise<JobPost> {
    return this.jobpostService.updateJobStatus(
      id,
      body.jobStatus as JobPostActivityStatus | null,
      body.linkedCandidateIds,
    );
  }
 
  @UseGuards(JwtAuthGuard)
  @Get('candidates/search')
  @ApiOperation({ summary: 'Rechercher des candidats pour association à une fiche' })
  @ApiQuery({ name: 'q', required: false, description: 'Terme de recherche (nom)' })
  @ApiResponse({ status: 200, description: 'Liste des candidats unifiés' })
  async searchCandidates(
  @Query('q') q?: string,
  @Query('ids') ids?: string,
): Promise<CandidateSearchResult[]> {
  const idList = ids ? ids.split(',').filter(Boolean) : undefined;
  return this.jobpostService.searchCandidatesForLinking(q, idList);
}

@Patch(':id/criteria')
@ApiOperation({ summary: 'Mettre à jour les critères (sections dynamiques)' })
@ApiParam({ name: 'id' })
@ApiResponse({ status: 200, type: JobPostCriteria })
async updateCriteria(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: RawCriteriaPayload,
): Promise<JobPostCriteria> {
  return this.criteriaService.upsertFromFrontend(id, body);  // ← remplace upsertFromN8n
}
}