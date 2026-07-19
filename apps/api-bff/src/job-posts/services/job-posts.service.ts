import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { CreateJobPostDto } from '../dtos/job-post.dto';
import { JobPost, JobPostActivityStatus, JobPostStatus } from '../entities/job-post.entity';
import { JOB_POST_REPOSITORY } from '../interfaces/job-post.interface';
import type { CandidateSearchResult, IJobPostRepository } from '../interfaces/job-post.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { N8nWorkflowService } from '../../common/workflows/n8n-workflow.service';
import { JobPostHelpersService } from './job-posts-helpers.service';
import { JobPostDriveService } from './job-posts-drive.service';
import { JobPostCriteriaService } from './job-post-criteria.service'; // ← NOUVEAU
import { JobPostCriteria } from '../entities/job-post-criteria.entity'; // ← NOUVEAU

function fixMulterFilename(name: string): string {
  return Buffer.from(name, 'latin1').toString('utf8').normalize('NFC');
}

@Injectable()
export class JobPostService {
  private readonly logger = new Logger(JobPostService.name);
  

  constructor(
    @Inject(JOB_POST_REPOSITORY)
    private readonly jobPostRepository: IJobPostRepository,
    private readonly n8nWorkflowService: N8nWorkflowService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly configService: ConfigService,
    private readonly helpers: JobPostHelpersService,
    private readonly driveService: JobPostDriveService,
    private readonly criteriaService: JobPostCriteriaService, // ← NOUVEAU
  ) {}

  // ── createPost ─────────────────────────────────────────────────────────────

  async createPost(data: Partial<JobPost>, userId?: number): Promise<JobPost> {
    const post = await this.jobPostRepository.create(data);

    if (userId && post.name) {
      try {
        const parentFolderId = this.configService.getOrThrow<string>(
          'DRIVE_FOLDER_EVALUATIONS_ID',
        );
        const folder = await this.googleDriveService.createFolder(
          userId,
          `evaluations_${post.name}`,
          parentFolderId,
        );
        await this.jobPostRepository.updateEvaluationsFolder(post.id, folder.id);
        this.logger.log(
          `Dossier évaluations créé pour jobPost ${post.id} : ${folder.id}`,
        );
      } catch (err: unknown) {
        this.logger.warn(
          `Impossible de créer le dossier Drive pour jobPost ${post.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return this.jobPostRepository.findBy({ id: post.id }) as Promise<JobPost>;
  }

  // ── processPost ────────────────────────────────────────────────────────────

  async processPost(dto: CreateJobPostDto, userId: number): Promise<JobPost> {
    if (!dto.googleDriveFileId) {
      throw new BadRequestException('File ID missing');
    }
    try {
      const n8nData = await this.n8nWorkflowService.processJobPost(
        dto.googleDriveFileId,
      );
      return this.createPost(
        {
          googleDriveFileId: dto.googleDriveFileId,
          name: dto.name || n8nData.document_name || 'Unknown name',
          type: dto.type || 'application/vnd.google-apps.document',
          url:
            dto.url ||
            `https://docs.google.com/document/d/${n8nData.document_id}/edit`,
          googleDocId: n8nData.document_id,
          status: JobPostStatus.RAW,
        },
        userId,
      );
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadGatewayException(`Error processing job post: ${message}`);
    }
  }

  // ── uploadFromLocal ────────────────────────────────────────────────────────

  async uploadFromLocal(
    userId: number,
    file: Express.Multer.File,
  ): Promise<JobPost> {
    if (!file) throw new BadRequestException('Missing file');

    const folderId = this.configService.get<string>('DRIVE_FOLDER_JOB_POSTS_ID');
    if (!folderId) throw new BadRequestException('Drive folder not configured');

    const driveFile = await this.googleDriveService.uploadFile(userId, file, folderId);
    await this.googleDriveService.shareWithAll(userId, driveFile.id);

    let title: string | null = null;
    try {
      title = await this.helpers.extractTitleFromFile(
        userId,
        driveFile.id,
        driveFile.mimeType,
      );
      this.logger.log(`Titre extrait pour ${driveFile.id}: ${title}`);
    } catch (err: unknown) {
      this.logger.warn(
        `Impossible d'extraire le titre pour ${driveFile.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const fixedName = fixMulterFilename(driveFile.name);
    return this.createPost(
      {
        googleDriveFileId: driveFile.id,
        name: fixedName,
        type: driveFile.mimeType,
        url:
          driveFile.webViewLink ??
          `https://drive.google.com/file/d/${driveFile.id}/view`,
        status: JobPostStatus.RAW,
        company: this.helpers.extractCompanyFromName(fixedName),
        title: title ?? undefined,
      },
      userId,
    );
  }

  // ── getAll ─────────────────────────────────────────────────────────────────

  async getAll(
  page = 1,
  limit = 10,
  search?: string,
  status?: string,
  jobStatus?: string,
): Promise<PaginatedResult<JobPost>> {
  return this.jobPostRepository.findAll(page, limit, search, status, undefined, jobStatus);
}

  // ── getImportedFileIds ─────────────────────────────────────────────────────

  async getImportedFileIds(): Promise<string[]> {
    const { data } = await this.getAll(1, 9999);
    return data.map((post) => post.googleDriveFileId).filter(Boolean);
  }

  // ── findOne ────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<JobPost> {
    const post = await this.jobPostRepository.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    return post;
  }

  // ── getAllWithEvaluations ──────────────────────────────────────────────────

  async getAllWithEvaluations(
    page = 1,
    limit = 10,
    search?: string,
  ): Promise<PaginatedResult<JobPost>> {
    return this.jobPostRepository.findAll(page, limit, search, undefined, true);
  }

  // ── findByGoogleDriveFileId ───────────────────────────────────────────────

  async findByGoogleDriveFileId(
    googleDriveFileId: string,
  ): Promise<JobPost | null> {
    return this.jobPostRepository.findByGoogleDriveFileId(googleDriveFileId);
  }

  // ── deletePost ─────────────────────────────────────────────────────────────

  async deletePost(id: number, userId: number): Promise<{ action: 'deleted' }> {
    const post = await this.jobPostRepository.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);

    const filesToDelete = [
      ...new Set([post.googleDriveFileId, post.googleDocId].filter(Boolean)),
    ] as string[];

    await Promise.all(
      filesToDelete.map((fileId) =>
        this.googleDriveService
          .deleteFile(userId, fileId)
          .catch((err: unknown) =>
            this.logger.warn(
              `Impossible de supprimer ${fileId}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          ),
      ),
    );

    await this.jobPostRepository.deleteBy({ id });
    this.logger.log(`Job post ${id} supprimé (DB + Drive)`);
    return { action: 'deleted' };
  }

  // ── triggerUnification ─────────────────────────────────────────────────────

  async triggerUnification(
    id: number,
    userId: number,
  ): Promise<{ message: string }> {
    const post = await this.jobPostRepository.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);

    await this.jobPostRepository.updateStatus(id, JobPostStatus.PROCESSING);

    try {
      const responseUnknown: unknown =
        await this.n8nWorkflowService.processJobPost(post.googleDriveFileId);
      this.logger.log(`Réponse n8n brute : ${JSON.stringify(responseUnknown)}`);

      const response = responseUnknown as {
        document_id:        string;
        docx_id?:           string;
        company?:           string;
        date_demarrage?:    string;
        intitule_poste?:    string;
        requires_coding?:   boolean;
        job_post_criteria?: { // ← NOUVEAU
          intitulePoste?:                 string;
          competencesTechniquesRequises?: string[];
          competencesGeneralesRequises?:  string[];
          experienceMinimaleAnnees?:      number;
          formationRequise?:              string;
          languesRequises?:               string[];
          missionsprincipales?:           string[];
          certificationsRequises?:        string[];
        };
      };

      if (!response?.document_id) {
        throw new Error('n8n a retourné un document_id invalide ou manquant');
      }

      const unifiedUrl = `https://drive.google.com/file/d/${response.document_id}/view`;

      const startDate =
        response.date_demarrage ??
        (await this.helpers
          .extractStartDateFromPdf(userId, response.document_id)
          .catch((err: unknown) => {
            this.logger.warn(
              `extractStartDate échoué pour ${response.document_id}: ${err instanceof Error ? err.message : String(err)}`,
            );
            return null;
          }));

      const fileExists = await this.googleDriveService
        .downloadFile(userId, response.document_id, 'application/pdf')
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        throw new Error(
          `Fichier Drive introuvable pour document_id: ${response.document_id}`,
        );
      }

      await this.jobPostRepository.updateUnifie(id, {
        googleDocId:    response.document_id,
        unifiedDocxId:  response.docx_id,
        status:         JobPostStatus.UNIFIED,
        unifiedUrl,
        company:
          response.company ??
          this.helpers.extractCompanyFromName(post.name) ??
          undefined,
        startDate:      startDate ?? undefined,
        title:          response.intitule_poste,
        requiresCoding: response.requires_coding ?? undefined,
        hasQcm:         true,
      });

      this.logger.log(
        `Job post ${id} unified — company: ${response.company}, startDate: ${startDate}`,
      );

      // ── Sauvegarde des critères ─────────────────────────────────────────
      if (response.job_post_criteria) {
        try {
          await this.criteriaService.upsertFromN8n(
            id,
            response.job_post_criteria,
          );
          this.logger.log(`Critères sauvegardés pour job post ${id}`);
        } catch (err: unknown) {
          // Non bloquant : l'unification est déjà réussie
          this.logger.warn(
            `Sauvegarde critères échouée pour job post ${id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } else {
        this.logger.warn(
          `Aucun critère retourné par n8n pour job post ${id}`,
        );
      }
      // ───────────────────────────────────────────────────────────────────

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unification échouée pour job post ${id}: ${message}`);
      await this.jobPostRepository.updateStatus(id, JobPostStatus.ERROR);
      throw error;
    }

    return { message: 'Unification triggered successfully' };
  }

  // ── getCriteria ────────────────────────────────────────────────────────────

  async getCriteria(id: number): Promise<JobPostCriteria> { // ← NOUVEAU
    await this.findOne(id); // vérifie que la fiche existe
    return this.criteriaService.findByJobPostId(id);
  }

  // ── syncFromDrive ──────────────────────────────────────────────────────────

  async syncFromDrive(
    userId: number,
    rawFolderId: string,
    unifiedFolderId?: string,
  ) {
    return this.driveService.syncFromDrive(userId, rawFolderId, unifiedFolderId);
  }

  // ── listFiles ──────────────────────────────────────────────────────────────

  async listFiles(userId: number, folderId: string) {
    return this.driveService.listFiles(userId, folderId);
  }

  // ── downloadFile ───────────────────────────────────────────────────────────

  async downloadFile(
    userId: number,
    fileId: string,
    mimeType = 'application/pdf',
  ) {
    return this.driveService.downloadFile(userId, fileId, mimeType);
  }

  // ── shareAllExistingFiles ──────────────────────────────────────────────────

  async shareAllExistingFiles(userId: number): Promise<void> {
    return this.driveService.shareAllExistingFiles(userId);
  }

  // ── updateRequiresCoding ──────────────────────────────────────────────────

  async updateRequiresCoding(
    id: number,
    requiresCoding: boolean | null,
  ): Promise<JobPost> {
    return this.jobPostRepository.updateRequiresCoding(id, requiresCoding);
  }

  // ── updateHasQcm ──────────────────────────────────────────────────────────

  async updateHasQcm(id: number, hasQcm: boolean | null): Promise<JobPost> {
    return this.jobPostRepository.updateHasQcm(id, hasQcm);
  }

  // ── updateTitle ───────────────────────────────────────────────────────────

  async updateTitle(
    id: number,
    title: string,
    company: string,
  ): Promise<JobPost> {
    return this.jobPostRepository.updateTitle(id, title, company);
  }

  // ── duplicate ─────────────────────────────────────────────────────────────

  async duplicate(
    id: number,
    payload: {
      title: string;
      company: string;
      hasQcm: boolean;
      requiresCoding: boolean;
    },
    userId: number,
  ): Promise<JobPost> {
    const original = await this.jobPostRepository.findBy({ id });
    if (!original) throw new NotFoundException(`Post ${id} not found`);

    return this.createPost(
      {
        googleDriveFileId: original.googleDriveFileId,
        name:              original.name,
        type:              original.type,
        url:               original.url,
        googleDocId:       original.googleDocId,
        unifiedUrl:        original.unifiedUrl,
        status:            original.status,
        startDate:         original.startDate ?? undefined,
        title:             payload.title,
        company:           payload.company,
        hasQcm:            payload.hasQcm,
        requiresCoding:    payload.requiresCoding,
      },
      userId,
    );
  }

   async updateJobStatus(
    id: number,
    jobStatus: JobPostActivityStatus | null,
    linkedCandidateIds?: string[],
  ): Promise<JobPost> {
    const post = await this.jobPostRepository.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
 
    post.jobStatus = jobStatus;
 
    if (
      jobStatus === 'closed_with_hire' &&
      linkedCandidateIds !== undefined
    ) {
      post.linkedCandidateIds = linkedCandidateIds;
    } else {
      post.linkedCandidateIds = [];
    }
 
    return this.jobPostRepository.save(post);
  }
 
 async searchCandidatesForLinking(q?: string, ids?: string[]): Promise<CandidateSearchResult[]> {
  const manager = this.jobPostRepository['jobPost'].manager;

  // ── Recherche par IDs (réouverture du modal) ──────────────────────────
  if (ids?.length) {
    return manager
      .createQueryBuilder()
      .select([
        'c.id                AS id',
        'c.name              AS name',
        'c."firstName"       AS "firstName"',
        'c.email             AS email',
        'c."unifieDriveName" AS "unifieDriveName"',
        'c."unifieDriveLink" AS "unifieDriveLink"',
      ])
      .from('candidates', 'c')
      .where('c.id = ANY(:ids)', { ids })
      .getRawMany<CandidateSearchResult>();
  }

  // ── Recherche textuelle normale ───────────────────────────────────────
  const qb = manager
    .createQueryBuilder()
    .select([
      'c.id                AS id',
      'c.name              AS name',
      'c."firstName"       AS "firstName"',
      'c.email             AS email',
      'c."unifieDriveName" AS "unifieDriveName"',
      'c."unifieDriveLink" AS "unifieDriveLink"',
    ])
    .from('candidates', 'c')
    .where('c."unifieDriveId" IS NOT NULL')
    .orderBy('c."updatedAt"', 'DESC')
    .limit(20);

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    qb.andWhere(
      '(c.name ILIKE :term OR c."firstName" ILIKE :term OR c.email ILIKE :term)',
      { term },
    );
  }

  return qb.getRawMany<CandidateSearchResult>();
}
 
}