import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { ResumeStatus } from '../entities/candidate.entity';
import { CANDIDATE_REPOSITORY } from '../interfaces/candidate-repository.interface';
import type { ICandidateRepository } from '../interfaces/candidate-repository.interface';

@Injectable()
export class CandidateDriveService {
  private readonly logger = new Logger(CandidateDriveService.name);
  private isSyncing = false;

  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
    private readonly googleDriveService: GoogleDriveService,
    private readonly configService: ConfigService,
  ) {}

  private parseIdentityFromFilename(filename: string): {
    name?: string;
    firstName?: string;
  } {
    const base = filename.replace(/\.[^/.]+$/, '');
    const cleaned = base.replace(/_(brut|unifie)$/i, '');
    const parts = cleaned.split('_').filter(Boolean);
    if (parts.length >= 2) return { name: parts[0], firstName: parts[1] };
    this.logger.warn(`Impossible de parser l'identité depuis : ${filename}`);
    return {};
  }

  async syncFromDrive(
    userId: number,
  ): Promise<{ added: number; removed: number }> {
    if (this.isSyncing) {
      this.logger.warn('Sync candidates déjà en cours, ignoré');
      return { added: 0, removed: 0 };
    }

    const brutFolderId = this.configService.getOrThrow<string>(
      'DRIVE_FOLDER_CANDIDATES_CVS_BRUTS',
    );
    const unifieFolderId = this.configService.getOrThrow<string>(
      'DRIVE_FOLDER_CANDIDATES_CVS_UNIFIES',
    );

    this.isSyncing = true;
    let added = 0;
    let removed = 0;

    try {
      const [brutFiles, unifieFiles] = await Promise.all([
        this.googleDriveService.listFiles(userId, brutFolderId),
        this.googleDriveService.listFiles(userId, unifieFolderId),
      ]);

      const { data: existing } = await this.candidateRepo.findAll(1, 9999);
      const existingBrutIds = new Set(
        existing.map((c) => c.brutDriveId).filter(Boolean),
      );
      const existingUnifieIds = new Set(
        existing.map((c) => c.unifieDriveId).filter(Boolean),
      );
      const allBrutIds = new Set(brutFiles.map((f) => f.id));
      const allUnifieIds = new Set(unifieFiles.map((f) => f.id));

      // ── Sync CVs bruts ───────────────────────────────────────────────
      for (const file of brutFiles) {
        if (!existingBrutIds.has(file.id)) {
          const identity = this.parseIdentityFromFilename(file.name);
          await this.candidateRepo.create({
            brutDriveId: file.id,
            brutDriveName: file.name,
            brutDriveLink:
              file.webViewLink ??
              `https://drive.google.com/file/d/${file.id}/view`,
            status: ResumeStatus.PENDING,
            ...identity,
          });
          this.logger.log(`Nouveau candidat sync : ${file.name}`);
          added++;
        }

        await this.googleDriveService
          .shareWithAll(userId, file.id)
          .catch((err: unknown) =>
            this.logger.warn(
              `Share failed brut ${file.id}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );
      }

      // ── Sync CVs unifiés ─────────────────────────────────────────────
      for (const file of unifieFiles) {
        await this.googleDriveService
          .shareWithAll(userId, file.id)
          .catch((err: unknown) =>
            this.logger.warn(
              `Share failed unifie ${file.id}: ${err instanceof Error ? err.message : String(err)}`,
            ),
          );

        if (existingUnifieIds.has(file.id)) continue;

        const expectedBrutName = file.name.replace(
          /_unifie(\.[^/.]+)?$/,
          (_, ext: string) => `_brut${ext ?? ''}`,
        );

        const matching = existing.find(
          (c) =>
            c.brutDriveName?.toLowerCase() === expectedBrutName.toLowerCase(),
        );

        if (matching) {
          await this.candidateRepo.updateUnifie(matching.id, {
            unifieDriveId: file.id,
            unifieDriveName: file.name,
            unifieDriveLink:
              file.webViewLink ??
              `https://drive.google.com/file/d/${file.id}/view`,
            status: ResumeStatus.DONE,
          });
          this.logger.log(
            `CV unifié associé : ${file.name} → candidat ${matching.id}`,
          );
          added++;
        } else {
          this.logger.warn(
            `Unifié ignoré (aucun brut correspondant) : ${file.name}`,
          );
        }
      }

      // ── Nettoyage des entrées supprimées de Drive ─────────────────────
      for (const candidate of existing) {
        if (
          candidate.unifieDriveId &&
          !allUnifieIds.has(candidate.unifieDriveId)
        ) {
          candidate.unifieDriveId = '';
          candidate.unifieDriveName = '';
          candidate.unifieDriveLink = '';
          candidate.status = ResumeStatus.PENDING;
          await this.candidateRepo.save(candidate);
          this.logger.log(`Unifié nettoyé pour candidat ${candidate.id}`);
        }

        if (candidate.brutDriveId && !allBrutIds.has(candidate.brutDriveId)) {
          await this.candidateRepo.deleteBy({ id: candidate.id });
          this.logger.log(
            `Candidat ${candidate.id} supprimé (brut introuvable en Drive)`,
          );
          removed++;
        }
      }

      this.logger.log(
        `Sync candidates terminée : +${added} ajoutés, -${removed} supprimés`,
      );
      return { added, removed };
    } finally {
      this.isSyncing = false;
    }
  }
}
