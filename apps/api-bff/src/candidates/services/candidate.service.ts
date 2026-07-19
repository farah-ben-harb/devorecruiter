import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import { Candidate, ResumeStatus } from '../entities/candidate.entity';
import type { ICandidateRepository, ResumeListItem } from '../interfaces/candidate-repository.interface';
import { CANDIDATE_REPOSITORY } from '../interfaces/candidate-repository.interface';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { N8nWorkflowService } from '../../common/workflows/n8n-workflow.service';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
import * as path from 'path';
import { UsersService } from '../../users/services/users.service';
import { parsePdf } from '../../common/utils/pdf-parse.util';



@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);

  constructor(
    @Inject(CANDIDATE_REPOSITORY)
    private readonly candidateRepo: ICandidateRepository,
    private readonly googleDriveService: GoogleDriveService,
    private readonly n8nWorkflowService: N8nWorkflowService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Utilitaires ────────────────────────────────────────────────────────────

  private async extraireTexte(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.pdf') {
      const result = await parsePdf(file.buffer);
      return result.text.slice(0, 3000);
    }

    if (ext === '.doc' || ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value.slice(0, 3000);
    }

    throw new Error('Format non supporté');
  }

  private async extraireIdentite(
    texteCV: string,
  ): Promise<{ name: string; firstName: string }> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY') ?? '';

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'user',
              content: `Extrais le name de famille et prénom du candidat depuis ce CV.
Réponds UNIQUEMENT en JSON valide sans backticks.
Format : {"name":"...","firstName":"..."}

CV:
${texteCV}`,
            },
          ],
          temperature: 0,
        }),
      },
    );

    const data = (await response.json()) as {
      choices?: Array<{ message: { content: string } }>;
      error?: { message: string };
    };

    if (data.error) throw new Error(`Groq API error: ${data.error.message}`);
    if (!data.choices?.length) throw new Error('Groq: aucun résultat');

    const raw = data.choices[0].message.content.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as { name: string; firstName: string };
  }

  private normaliser(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Parse l'identité depuis le nom de fichier Drive.
   * Convention attendue : "nom_prenom_brut.ext" ou "nom_prenom_unifie.ext"
   * Retourne { name, firstName } si parsable, sinon {}.
   */
  private parseIdentityFromFilename(filename: string): {
    name?: string;
    firstName?: string;
  } {
    // Retire l'extension (.pdf, .docx, …)
    const base = filename.replace(/\.[^/.]+$/, '');
    // Retire le suffixe _brut ou _unifie
    const cleaned = base.replace(/_(brut|unifie)$/i, '');
    const parts = cleaned.split('_').filter(Boolean);

    if (parts.length >= 2) {
      return {
        name: parts[0],
        firstName: parts[1],
      };
    }

    this.logger.warn(
      `Impossible de parser l'identité depuis le nom de fichier : ${filename}`,
    );
    return {};
  }

  // ─── Upload manuel ──────────────────────────────────────────────────────────

  async uploadResumeBrut(
    userId: number,
    file: Express.Multer.File,
    folderId: string,
  ): Promise<Candidate> {
    const texte = await this.extraireTexte(file);
    const { name, firstName } = await this.extraireIdentite(texte);
    this.logger.log(`Identité extraite : ${name} ${firstName}`);

    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${this.normaliser(name)}_${this.normaliser(firstName)}_brut${ext}`;
    file.originalname = fileName;

    const driveFile = await this.googleDriveService.uploadFile(
      userId,
      file,
      folderId,
    );

    const otherEmails = await this.usersService.getAllEmailsExcept(userId);
    await Promise.all(
      otherEmails.map((email) =>
        this.googleDriveService.shareFileWithUser(userId, driveFile.id, email),
      ),
    );

    return this.candidateRepo.create({
      name,
      firstName,
      brutDriveId: driveFile.id,
      brutDriveName: driveFile.name,
      brutDriveLink: driveFile.webViewLink ?? '',
      status: ResumeStatus.PENDING,
    });
  }

  // ─── Lecture ─────────────────────────────────────────────────────────────────

  async findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Candidate>> {
    return this.candidateRepo.findAll(page, limit);
  }

  async listResumes(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ResumeListItem>> {
    const { data, meta } = await this.candidateRepo.findAll(page, limit);
    const results: ResumeListItem[] = [];

    for (const c of data) {
      if (c.unifieDriveId) {
        results.push({
          id: c.id,
          name: c.unifieDriveName || 'CV unifié',
          driveLink: c.unifieDriveLink ?? '',
          driveId: c.unifieDriveId,
          type: 'unifie',
          createdAt: c.updatedAt,
          status: c.status,
          hasUnifie: true,
          brutDriveLink: c.brutDriveLink || undefined,
          email: c.email ?? null, // ← ajouter
          githubUsername: c.githubUsername ?? null,
          hasMissingFields: !c.githubUsername || !c.email,
        });
      } else if (c.brutDriveId) {
        results.push({
          id: c.id,
          name: c.brutDriveName || 'CV brut',
          driveLink: c.brutDriveLink ?? '',
          driveId: c.brutDriveId,
          type: 'brut',
          createdAt: c.createdAt,
          status: c.status,
          hasUnifie: false,
          email: c.email ?? null,
          githubUsername: c.githubUsername ?? null,
        });
      }
    }

    return { data: results, meta };
  }

  async listDriveFiles(userId: number, folderId: string): Promise<unknown> {
    return this.googleDriveService.listFiles(userId, folderId);
  }

  // ─── Suppression ─────────────────────────────────────────────────────────────

  async deleteResume(
    userId: number,
    id: string,
    type: 'brut' | 'unifie',
  ): Promise<void> {
    const candidate = await this.candidateRepo.findBy({ id });
    if (!candidate) throw new NotFoundException(`Candidat ${id} introuvable`);

    if (type === 'brut' && candidate.brutDriveId) {
      await this.googleDriveService.deleteFile(userId, candidate.brutDriveId);
      candidate.brutDriveId = '';
      candidate.brutDriveName = '';
      candidate.brutDriveLink = '';
    }

    if (type === 'unifie') {
      if (candidate.unifieDriveId) {
        await this.googleDriveService.deleteFile(
          userId,
          candidate.unifieDriveId,
        );
        candidate.unifieDriveId = '';
        candidate.unifieDriveName = '';
        candidate.unifieDriveLink = '';
      }

      if (candidate.brutDriveId) {
        await this.googleDriveService.deleteFile(userId, candidate.brutDriveId);
        candidate.brutDriveId = '';
        candidate.brutDriveName = '';
        candidate.brutDriveLink = '';
      }
    }

    if (!candidate.brutDriveId && !candidate.unifieDriveId) {
      await this.candidateRepo.deleteBy({ id });
    } else {
      await this.candidateRepo.save(candidate);
    }
  }

  // ─── Unification ─────────────────────────────────────────────────────────────

  async triggerUnification(id: string): Promise<{ message: string }> {
    const candidate = await this.candidateRepo.findBy({ id });
    if (!candidate) throw new NotFoundException(`Candidat ${id} introuvable`);

    if (!candidate.brutDriveId) {
      throw new BadRequestException(
        `Impossible de lancer l'unification: CV brut absent pour ${id}`,
      );
    }

    // ── FIX : reconstruire l'identité depuis le nom de fichier si absente ──────
    if ((!candidate.name || !candidate.firstName) && candidate.brutDriveName) {
      const identity = this.parseIdentityFromFilename(candidate.brutDriveName);

      if (identity.name && identity.firstName) {
        candidate.name = identity.name;
        candidate.firstName = identity.firstName;
        await this.candidateRepo.save(candidate);
        this.logger.log(
          `Identité reconstruite pour ${id} depuis le nom de fichier : ${identity.name} ${identity.firstName}`,
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────────

    if (!candidate.name || !candidate.firstName) {
      const missing = [
        !candidate.name && 'name',
        !candidate.firstName && 'firstName',
      ]
        .filter(Boolean)
        .join(', ');
      throw new BadRequestException(
        `Impossible de lancer l'unification: identité incomplète pour ${id} — champs manquants : ${missing}`,
      );
    }

    await this.candidateRepo.updateStatus(id, ResumeStatus.PROCESSING);

    try {
      const response =
        await this.n8nWorkflowService.triggerCandidateUnification(
          id,
          candidate.brutDriveId,
          candidate.name,
          candidate.firstName,
        );

      await this.candidateRepo.updateUnifie(id, {
        unifieDriveId: response.document_id,
        unifieDriveName: response.document_name,
        unifieDriveLink: response.document_url ?? '',
        status: ResumeStatus.DONE,
        email: response.email ?? null,
        githubUsername: response.github_username ?? null,
      });

      this.logger.log(`CV unifié enregistré pour le candidat ${id}`);
    } catch (error) {
      await this.candidateRepo.updateStatus(id, ResumeStatus.ERROR);
      this.logger.error(`Unification échouée pour ${id}`, error);
      throw error;
    }

    return { message: 'Unification déclenchée avec succès' };
  }

  // ─── Sync Drive ───────────────────────────────────────────────────────────────

  async syncFromDrive(
    userId: number,
    brutFolderId: string,
    unifieFolderId: string,
  ): Promise<number> {
    const { data: existing } = await this.candidateRepo.findAll(1, 9999);
    const existingBrutIds = new Set(
      existing.map((c) => c.brutDriveId).filter(Boolean),
    );
    const existingUnifieIds = new Set(
      existing.map((c) => c.unifieDriveId).filter(Boolean),
    );

    let count = 0;

    // ─── Sync CVs bruts ───────────────────────────────────────────────────────
    const brutFiles = await this.googleDriveService.listFiles(
      userId,
      brutFolderId,
    );

    for (const file of brutFiles) {
      if (!existingBrutIds.has(file.id)) {
        // FIX : extraire l'identité depuis le nom de fichier (convention nom_prenom_brut.ext)
        const identity = this.parseIdentityFromFilename(file.name);

        await this.candidateRepo.create({
          brutDriveId: file.id,
          brutDriveName: file.name,
          brutDriveLink:
            file.webViewLink ??
            `https://drive.google.com/file/d/${file.id}/view`,
          status: ResumeStatus.PENDING,
          ...identity, // { name?, firstName? }
        });

        this.logger.log(
          `Nouveau candidat sync : ${file.name}` +
            (identity.name
              ? ` → identité: ${identity.name} ${identity.firstName}`
              : ' → identité non parsée (name/firstName vides)'),
        );
        count++;
      }

      await this.googleDriveService
        .shareWithAll(userId, file.id)
        .catch((err: unknown) =>
          this.logger.warn(
            `Share failed during sync for brut file ${file.id}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
    }

    // ─── Sync CVs unifiés ─────────────────────────────────────────────────────
    const unifieFiles = await this.googleDriveService.listFiles(
      userId,
      unifieFolderId,
    );

    for (const file of unifieFiles) {
      await this.googleDriveService
        .shareWithAll(userId, file.id)
        .catch((err: unknown) =>
          this.logger.warn(
            `Share failed during sync for unifie file ${file.id}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );

      if (!existingUnifieIds.has(file.id)) {
        const expectedBrutName = file.name.replace(
          /_unifie(\.[^/.]+)?$/,
          (_, ext) => `_brut${ext ?? ''}`,
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
          count++;
        } else {
          this.logger.warn(
            `Unifié ignoré (aucun brut correspondant) : ${file.name}`,
          );
        }
      }
    }

    // ─── Nettoyage des entrées supprimées de Drive ────────────────────────────
    const allBrutIds = new Set(brutFiles.map((f) => f.id));
    const allUnifieIds = new Set(unifieFiles.map((f) => f.id));

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
        this.logger.log(`Candidat ${candidate.id} supprimé (brut introuvable)`);
      }
    }

    // ─── Patch : reconstruire les liens et associations manquants ─────────────
    const { data: allCandidates } = await this.candidateRepo.findAll(1, 9999);

    for (const candidate of allCandidates) {
      let dirty = false;

      if (candidate.brutDriveId && !candidate.brutDriveLink) {
        candidate.brutDriveLink = `https://drive.google.com/file/d/${candidate.brutDriveId}/view`;
        dirty = true;
        this.logger.log(`brutDriveLink reconstruit pour ${candidate.id}`);
      }

      if (candidate.unifieDriveId && !candidate.unifieDriveLink) {
        candidate.unifieDriveLink = `https://drive.google.com/file/d/${candidate.unifieDriveId}/view`;
        dirty = true;
        this.logger.log(`unifieDriveLink reconstruit pour ${candidate.id}`);
      }

      // FIX : reconstruire l'identité manquante depuis le nom de fichier
      if (
        (!candidate.name || !candidate.firstName) &&
        candidate.brutDriveName
      ) {
        const identity = this.parseIdentityFromFilename(
          candidate.brutDriveName,
        );
        if (identity.name && identity.firstName) {
          candidate.name = identity.name;
          candidate.firstName = identity.firstName;
          dirty = true;
          this.logger.log(
            `Identité patchée pour ${candidate.id} : ${identity.name} ${identity.firstName}`,
          );
        }
      }

      if (
        candidate.unifieDriveId &&
        !candidate.brutDriveId &&
        candidate.unifieDriveName
      ) {
        const expectedBrutName = candidate.unifieDriveName.replace(
          /_unifie(\.[^/.]+)?$/,
          (_, ext) => `_brut${ext ?? ''}`,
        );

        const matchingBrut = brutFiles.find(
          (f) => f.name.toLowerCase() === expectedBrutName.toLowerCase(),
        );

        if (matchingBrut) {
          candidate.brutDriveId = matchingBrut.id;
          candidate.brutDriveName = matchingBrut.name;
          candidate.brutDriveLink =
            matchingBrut.webViewLink ??
            `https://drive.google.com/file/d/${matchingBrut.id}/view`;
          dirty = true;
          this.logger.log(
            `Brut retrouvé et associé pour candidat ${candidate.id} : ${matchingBrut.name}`,
          );
        }
      }

      if (dirty) await this.candidateRepo.save(candidate);
    }

    this.logger.log(`Sync Drive terminée : ${count} nouveaux fichiers`);
    return count;
  }

  async updateFields(
    id: string,
    fields: { githubUsername?: string; email?: string },
  ): Promise<Candidate> {
    const candidate = await this.candidateRepo.findBy({ id });
    if (!candidate) throw new NotFoundException(`Candidat ${id} introuvable`);
    if (fields.githubUsername !== undefined)
      candidate.githubUsername = fields.githubUsername;
    if (fields.email !== undefined) candidate.email = fields.email;
    return this.candidateRepo.save(candidate);
  }

  async downloadFile(userId: number, fileId: string): Promise<string> {
    return this.googleDriveService.downloadFile(userId, fileId);
  }
  async createCandidate(data: Partial<Candidate>): Promise<Candidate> {
    return this.candidateRepo.create({
      name: data.name ?? null,
      firstName: data.firstName ?? null,
      email: data.email ?? null,
      status: data.status ?? ResumeStatus.PENDING,
      brutDriveLink: data.brutDriveLink ?? null,
      brutDriveId: data.brutDriveId ?? null,
      brutDriveName: data.brutDriveName ?? null,
      unifieDriveLink: data.unifieDriveLink ?? null,
      unifieDriveId: data.unifieDriveId ?? null,
      unifieDriveName: data.unifieDriveName ?? null,
    });
  }
}
