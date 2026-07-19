import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { JobPostStatus } from '../entities/job-post.entity';
import type { IJobPostRepository } from '../interfaces/job-post.interface';
import { Inject } from '@nestjs/common';
import { JOB_POST_REPOSITORY } from '../interfaces/job-post.interface';
import { JobPostHelpersService } from './job-posts-helpers.service';
import { GoogleDriveFilesResponse } from '../../common/interfaces/google-drive.interface';

@Injectable()
export class JobPostDriveService {
  private readonly logger = new Logger(JobPostDriveService.name);
  private isSyncing = false;
  constructor(
    @Inject(JOB_POST_REPOSITORY)
    private readonly jobPostRepository: IJobPostRepository,
    private readonly googleDriveService: GoogleDriveService,
    private readonly configService: ConfigService,
    private readonly helpers: JobPostHelpersService,
  ) {}

  async listFiles(
    userId: number,
    folderId: string,
  ): Promise<GoogleDriveFilesResponse['files']> {
    if (!userId) throw new BadRequestException('User missing');
    if (!folderId) throw new BadRequestException('Folder ID missing');
    try {
      return await this.googleDriveService.listFiles(userId, folderId);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadGatewayException(`Error retrieving files: ${message}`);
    }
  }

  async downloadFile(
    userId: number,
    fileId: string,
    mimeType = 'application/pdf',
  ): Promise<string> {
    if (!userId) throw new BadRequestException('User missing');
    let resolvedFileId = fileId;

    if (/^\d+$/.test(fileId)) {
      const post = await this.jobPostRepository.findBy({ id: Number(fileId) });
      if (!post) throw new BadRequestException(`Post ${fileId} not found`);
      resolvedFileId = post.googleDocId ?? post.googleDriveFileId;
      if (!resolvedFileId) {
        throw new BadRequestException(
          `No document Drive associated with job post ${fileId}`,
        );
      }
    }

    try {
      return await this.googleDriveService.downloadFile(
        userId,
        resolvedFileId,
        mimeType,
      );
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadGatewayException(`Error downloading file: ${message}`);
    }
  }

  async shareAllExistingFiles(userId: number): Promise<void> {
    const { data: posts } = await this.jobPostRepository.findAll(1, 9999);
    const fileIds = posts.flatMap((p) => [p.googleDriveFileId, p.googleDocId]);
    await this.googleDriveService.shareAllExistingFiles(userId, fileIds);
  }

  async syncFromDrive(
    userId: number,
    rawFolderId: string,
    unifiedFolderId?: string,
  ): Promise<{ added: number; removed: number }> {
    if (this.isSyncing) {
      this.logger.warn('Sync déjà en cours, ignoré');
      return { added: 0, removed: 0 };
    }

    this.isSyncing = true;

    try {
      const rawFiles = await this.googleDriveService.listFiles(
        userId,
        rawFolderId,
      );
      const unifiedFiles = unifiedFolderId
        ? await this.googleDriveService.listFiles(userId, unifiedFolderId)
        : [];

      const rawDriveIds = new Set(rawFiles.map((f) => f.id));
      const unifiedDriveIds = new Set(unifiedFiles.map((f) => f.id));
      const { data: existing } = await this.jobPostRepository.findAll(1, 9999);

      let added = 0;

      for (const file of rawFiles) {
        const alreadyInDb = existing.some(
          (p) => p.googleDriveFileId === file.id,
        );
        if (!alreadyInDb) {
          const title = await this.helpers
            .extractTitleFromFile(userId, file.id, file.mimeType)
            .catch(() => null);

          await this.jobPostRepository.create({
            googleDriveFileId: file.id,
            name: file.name,
            type: file.mimeType,
            url:
              file.webViewLink ??
              `https://drive.google.com/file/d/${file.id}/view`,
            status: JobPostStatus.RAW,
            company: this.helpers.extractCompanyFromName(file.name),
            title: title ?? undefined,
          });
          added++;
        }

        await this.googleDriveService
          .shareWithAll(userId, file.id)
          .catch((err: unknown) =>
            this.logger.warn(
              `Share failed for raw file ${file.id}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
      }

      await Promise.all(
        unifiedFiles.map(async (uFile) => {
          const existingPost = existing.find((p) => p.googleDocId === uFile.id);

          await this.googleDriveService
            .shareWithAll(userId, uFile.id)
            .catch((err: unknown) =>
              this.logger.warn(
                `Share failed for unified file ${uFile.id}: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );

          if (existingPost) return;

          const startDate = await this.helpers.extractStartDateFromPdf(
            userId,
            uFile.id,
          );
          const baseName = uFile.name
            .replace(/\.[^/.]+$/, '')
            .replace(/_unifié?$/i, '')
            .trim();

          const matchingRaw = existing.find(
            (p) =>
              p.name?.replace(/\.[^/.]+$/, '').toLowerCase() ===
              baseName.toLowerCase(),
          );

          if (matchingRaw) {
            await this.jobPostRepository.updateUnifie(matchingRaw.id, {
              googleDocId: uFile.id,
              status: JobPostStatus.UNIFIED,
              unifiedUrl: `https://drive.google.com/file/d/${uFile.id}/view`,
              startDate: startDate ?? undefined,
            });
            added++;
          } else {
            const title = await this.helpers
              .extractTitleFromFile(userId, uFile.id, uFile.mimeType)
              .catch(() => null);

            await this.jobPostRepository.create({
              googleDriveFileId: uFile.id,
              name: uFile.name,
              type: uFile.mimeType,
              url:
                uFile.webViewLink ??
                `https://drive.google.com/file/d/${uFile.id}/view`,
              googleDocId: uFile.id,
              unifiedUrl:
                uFile.webViewLink ??
                `https://drive.google.com/file/d/${uFile.id}/view`,
              status: JobPostStatus.UNIFIED,
              company: this.helpers.extractCompanyFromName(uFile.name),
              startDate,
              title: title ?? undefined,
            });
            added++;
          }
        }),
      );

      let removed = 0;
      for (const post of existing) {
        const rawGone =
          post.googleDriveFileId && !rawDriveIds.has(post.googleDriveFileId);
        const unifiedGone =
          unifiedFolderId &&
          post.googleDocId &&
          post.googleDocId !== post.googleDriveFileId &&
          !unifiedDriveIds.has(post.googleDocId);

        if (rawGone && unifiedGone) {
          await this.jobPostRepository.deleteBy({ id: post.id });
          removed++;
        } else if (rawGone && !post.googleDocId) {
          await this.jobPostRepository.deleteBy({ id: post.id });
          removed++;
        } else if (rawGone && post.googleDocId) {
          await this.googleDriveService
            .deleteFile(userId, post.googleDocId)
            .catch((err: unknown) =>
              this.logger.warn(
                `Impossible de supprimer ${post.googleDocId}: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
          await this.jobPostRepository.deleteBy({ id: post.id });
          removed++;
        } else if (unifiedGone) {
          if (post.googleDriveFileId) {
            await this.googleDriveService
              .deleteFile(userId, post.googleDriveFileId)
              .catch((err: unknown) =>
                this.logger.warn(
                  `Impossible de supprimer ${post.googleDriveFileId}: ${err instanceof Error ? err.message : String(err)}`,
                ),
              );
          }
          await this.jobPostRepository.deleteBy({ id: post.id });
          removed++;
        }
      }

      this.logger.log(`Drive sync: +${added} added, -${removed} removed`);
      return { added, removed };
    } finally {
      this.isSyncing = false;
    }
  }
}
