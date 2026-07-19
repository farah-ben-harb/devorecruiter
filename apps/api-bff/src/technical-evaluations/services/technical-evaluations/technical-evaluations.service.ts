import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TechnicalEvaluation,
  EvaluationStatus,
} from '../../entities/technical-evaluations/technical-evaluations.entity';
import { TECHNICAL_EVALUATION_REPOSITORY } from '../../interfaces/technical-evaluations/technical-evaluations.interface';
import type { ITechnicalEvaluationRepository } from '../../interfaces/technical-evaluations/technical-evaluations.interface';
import {
  CreateTechnicalEvaluationDto,
  UpdateTechnicalEvaluationDto,
  RegenerateTechnicalEvaluationDto,
  ApproveEvaluationDto,
} from '../../dtos/technical-evaluations/technical-evaluations.dto';
import { GoogleDriveService } from '../../../common/google-drive/google-drive.service';
import { JobPost } from '../../../job-posts/entities/job-post.entity';
import { parsePdf } from '../../../common/utils/pdf-parse.util';
import {
  buildGeneratePrompt,
  buildRegeneratePrompt,
  extractNameFromHtml,        // ── NOUVEAU
} from '../../prompts/technical-evaluation.prompt';
import { GithubService } from '../github/github.service';
import { OpenRouterResponse } from '../../interfaces/candidate-code-evaluation/candidate-code-evaluation.interface';
import { Readable } from 'stream';
import { QuizTechnicalEvaluationService } from '../quiz-technical-evaluations/quiz-technical-evaluations.service';
import { PdfGeneratorService } from '../pdfs-generator/pdf-generator.service';
import { EvaluationNotificationService } from '../evaluations-notifications/evaluation-notification.service';

@Injectable()
export class TechnicalEvaluationService {
  private readonly logger = new Logger(TechnicalEvaluationService.name);
  private readonly groqApiKey: string;

  constructor(
    @Inject(TECHNICAL_EVALUATION_REPOSITORY)
    private readonly repo: ITechnicalEvaluationRepository,
    @InjectRepository(JobPost)
    private readonly jobPostRepo: Repository<JobPost>,
    private readonly googleDriveService: GoogleDriveService,
    private readonly configService: ConfigService,
    private readonly githubService: GithubService,
    private readonly quizService: QuizTechnicalEvaluationService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly notificationService: EvaluationNotificationService,
  ) {
    this.groqApiKey = this.configService.getOrThrow<string>('GROQ_API_KEY');
  }

  // ── Generation ────────────────────────────────────────────────────────────

  async generate(userId: number, dto: CreateTechnicalEvaluationDto): Promise<TechnicalEvaluation> {
    const jobPost = await this.getJobPost(dto.jobPostId);
    await this.ensureEvaluationsFolder(userId, jobPost);
    const version = await this.nextMajorVersion(dto.jobPostId);
    const jobPostContent = await this.buildJobPostContent(userId, jobPost);

    if (dto.mode === 'quiz') {
      if (!jobPost.hasQcm) {
        throw new BadRequestException('Ce poste ne possède pas de QCM');
      }
      this.logger.log(`JobPost ${dto.jobPostId} → QUIZ (hasQcm=${jobPost.hasQcm})`);
      const quizEval = await this.quizService.generateQuiz(
        userId, jobPost, dto, jobPostContent, version, this.groqApiKey,
        // pas de nom hérité lors d'une première génération
      );
      this.notificationService.notifyReferents(quizEval, jobPost).catch((e) =>
        this.logger.error(`Notification quiz échouée: ${e.message}`),
      );
      return quizEval;
    }

    if (!jobPost.requiresCoding) {
      throw new BadRequestException('Ce poste ne nécessite pas de codage');
    }
    this.logger.log(`JobPost ${dto.jobPostId} → CODING TEST (requiresCoding=${jobPost.requiresCoding})`);
    return this.generateCodingKata(userId, jobPost, dto, jobPostContent, version);
  }

  async findAll(userId: number, jobPostId: number, mode?: 'coding' | 'quiz'): Promise<TechnicalEvaluation[]> {
    await this.syncFromDrive(userId, jobPostId);
    const all = await this.repo.findAll(jobPostId);

    if (mode === 'quiz') {
      return all.filter((e) => e.quizContent !== null && e.quizContent !== undefined);
    }

    if (mode === 'coding') {
      return all.filter((e) => e.quizContent === null || e.quizContent === undefined);
    }

    return all;
  }

  async findById(id: number): Promise<TechnicalEvaluation> {
    const evaluation = await this.repo.findById(id);
    if (!evaluation) throw new NotFoundException('Évaluation introuvable');
    return evaluation;
  }

  async update(id: number, dto: UpdateTechnicalEvaluationDto): Promise<TechnicalEvaluation> {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(userId: number, id: number): Promise<void> {
    const evaluation = await this.findById(id);

    if (evaluation.driveFileId) {
      await this.googleDriveService.deleteFile(userId, evaluation.driveFileId);
    }

    await this.repo.delete(id);
    await this.reorderIndexes(evaluation.jobPostId);
  }

  private async reorderIndexes(jobPostId: number): Promise<void> {
    const evaluations = await this.repo.findAll(jobPostId);
    const sorted = evaluations.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    for (let i = 0; i < sorted.length; i++) {
      const expectedIndex = i + 1;
      if (sorted[i].index !== expectedIndex) {
        await this.repo.update(sorted[i].id, { index: expectedIndex });
      }
    }

    this.logger.log(`Réindexation terminée pour jobPost ${jobPostId}`);
  }

  async approve(id: number, dto: ApproveEvaluationDto): Promise<TechnicalEvaluation> {
    await this.findById(id);
    return this.repo.update(id, { status: dto.status as EvaluationStatus });
  }

  async findAllByJobPost(jobPostId: number): Promise<TechnicalEvaluation[]> {
    return this.repo.findAll(jobPostId);
  }

  // ── Regenerate ────────────────────────────────────────────────────────────

  async regenerate(userId: number, dto: RegenerateTechnicalEvaluationDto): Promise<TechnicalEvaluation> {
    const existing = await this.findById(dto.evaluationId);
    const jobPost = await this.getJobPost(dto.jobPostId);
    await this.ensureEvaluationsFolder(userId, jobPost);

    const changeType = await this.detectChangeType(dto.prompt);
    const newVersion = this.bumpVersion(existing.version, changeType);
    const jobPostContent = await this.buildJobPostContent(userId, jobPost);

    // ── Le nom est hérité de l'évaluation d'origine ───────────────────────────
    const inheritedName = existing.name ?? null;

    this.logger.log(`Régénération v${newVersion} pour jobPost ${dto.jobPostId}...`);
    const htmlContent = await this.callOpenRouter(buildRegeneratePrompt(jobPostContent, dto.prompt));
    const pdfBuffer = await this.pdfGenerator.generateFromHtml(htmlContent, newVersion);

    const fileName = `evaluation_${jobPost.name}_v${newVersion}_${Date.now()}.pdf`;
    const driveFile = await this.uploadPdf(userId, pdfBuffer, fileName, jobPost.evaluationsFolderId!);
    const driveUrl = driveFile.webViewLink ?? `https://drive.google.com/file/d/${driveFile.id}/view`;

    const regenEval = await this.repo.create({
      jobPostId: dto.jobPostId,
      title: `${jobPost.title}_v${newVersion}`,
      // ── NOUVEAU : on hérite du nom d'origine ──────────────────────────────
      name: inheritedName,
      // ─────────────────────────────────────────────────────────────────────
      status: EvaluationStatus.PENDING,
      version: newVersion,
      index: await this.nextIndex(dto.jobPostId),
      driveFileId: driveFile.id,
      driveFileUrl: driveUrl,
      pdfUrl: driveUrl,
      htmlContent,
    });
    this.notificationService.notifyReferents(regenEval, jobPost).catch((e) =>
      this.logger.error(`Notification régénération échouée: ${e.message}`),
    );
    return regenEval;
  }

  // ── Manual content update ─────────────────────────────────────────────────

  async updateContent(
    userId: number,
    id: number,
    payload: {
      htmlContent?: string;
      quizContent?: string;
      quizAnswerKey?: string;
      changeType?: 'minor' | 'major';
      isQuiz?: boolean;
    },
  ): Promise<TechnicalEvaluation> {
    const existing = await this.findById(id);
    const jobPost = await this.getJobPost(existing.jobPostId);
    const changeType = payload.changeType ?? 'minor';
    const newVersion = this.bumpVersion(existing.version, changeType);

    // ── Le nom est toujours hérité lors d'une modification manuelle ───────────
    const inheritedName = existing.name ?? null;

    this.logger.log(`Modification manuelle → v${newVersion} pour jobPost ${existing.jobPostId}`);

    if (payload.isQuiz) {
      return this.repo.create({
        jobPostId: existing.jobPostId,
        title: `${jobPost.title}_v${newVersion}`,
        // ── NOUVEAU ────────────────────────────────────────────────────────────
        name: inheritedName,
        // ───────────────────────────────────────────────────────────────────────
        status: EvaluationStatus.PENDING,
        version: newVersion,
        index: await this.nextIndex(existing.jobPostId),
        htmlContent: existing.htmlContent,
        quizContent: payload.quizContent ?? null,
        quizAnswerKey: payload.quizAnswerKey ?? null,
        driveFileId: null,
        driveFileUrl: null,
        pdfUrl: null,
      });
    }

    const htmlContent = payload.htmlContent ?? '';
    const pdfBuffer = await this.pdfGenerator.generateFromHtml(htmlContent, newVersion);

    const fileName = `evaluation_${jobPost.name}_v${newVersion}_${Date.now()}.pdf`;
    const driveFile = await this.uploadPdf(userId, pdfBuffer, fileName, jobPost.evaluationsFolderId!);
    const driveUrl = driveFile.webViewLink ?? `https://drive.google.com/file/d/${driveFile.id}/view`;

    return this.repo.create({
      jobPostId: existing.jobPostId,
      title: `${jobPost.title}_v${newVersion}`,
      // ── NOUVEAU ──────────────────────────────────────────────────────────────
      name: inheritedName,
      // ─────────────────────────────────────────────────────────────────────────
      status: EvaluationStatus.PENDING,
      version: newVersion,
      index: await this.nextIndex(existing.jobPostId),
      htmlContent,
      driveFileId: driveFile.id,
      driveFileUrl: driveUrl,
      pdfUrl: driveUrl,
      quizContent: null,
      quizAnswerKey: null,
    });
  }

  // ── GitHub ────────────────────────────────────────────────────────────────

  async createGitRepo(id: number): Promise<TechnicalEvaluation> {
    const evaluation = await this.findById(id);
    if (evaluation.gitRepoUrl) return evaluation;

    const jobPost = await this.getJobPost(evaluation.jobPostId);
    const gitRepoUrl = await this.githubService.createRepo(
      `${jobPost.title}-v${evaluation.version}`,
      `Évaluation technique — ${jobPost.name} v${evaluation.version}`,
    );
    return this.repo.update(id, { gitRepoUrl });
  }

  // ── Drive sync ────────────────────────────────────────────────────────────

  async syncFromDrive(userId: number, jobPostId: number): Promise<{ added: number; removed: number }> {
    const jobPost = await this.getJobPost(jobPostId);
    if (!jobPost.evaluationsFolderId) {
      this.logger.warn(`JobPost ${jobPostId} n'a pas de dossier Drive associé`);
      return { added: 0, removed: 0 };
    }

    const [driveFiles, existingEvaluations] = await Promise.all([
      this.googleDriveService.listFiles(userId, jobPost.evaluationsFolderId),
      this.repo.findAll(jobPostId),
    ]);

    const driveFileIds = new Set(driveFiles.map((f) => f.id));
    const dbDriveIds = new Set(existingEvaluations.map((e) => e.driveFileId).filter(Boolean));

    let added = 0;
    let removed = 0;

    for (const file of driveFiles) {
      if (!dbDriveIds.has(file.id)) {
        const versionMatch = file.name.match(/v(\d+\.\d+\.\d+)/);
        await this.repo.create({
          jobPostId,
          title: file.name.replace(/\.pdf$/, ''),
          // Pas de name extrait depuis Drive (fichier externe)
          name: null,
          version: versionMatch ? versionMatch[1] : '1.0.0',
          index: await this.nextIndex(jobPostId),
          driveFileId: file.id,
          driveFileUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
          status: EvaluationStatus.PENDING,
        });
        this.logger.log(`Sync Drive→BD : fichier ajouté ${file.id}`);
        added++;
      }
    }

    for (const evaluation of existingEvaluations) {
      if (evaluation.driveFileId && !driveFileIds.has(evaluation.driveFileId)) {
        await this.repo.delete(evaluation.id);
        this.logger.log(`Sync BD→Drive : évaluation supprimée id=${evaluation.id}`);
        removed++;
      }
    }

    this.logger.log(`Sync terminée pour jobPost ${jobPostId} : ${added} ajoutés, ${removed} supprimés`);
    return { added, removed };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async generateCodingKata(
    userId: number,
    jobPost: JobPost,
    dto: CreateTechnicalEvaluationDto,
    jobPostContent: string,
    version: string,
  ): Promise<TechnicalEvaluation> {
    this.logger.log(`Génération kata v${version} pour jobPost ${dto.jobPostId}...`);
    const htmlContent = await this.callOpenRouter(buildGeneratePrompt(jobPostContent));

    // ── NOUVEAU : extraire le nom depuis le <h1> du HTML généré ──────────────
    const evaluationName = extractNameFromHtml(htmlContent);
    // ─────────────────────────────────────────────────────────────────────────

    const pdfBuffer = await this.pdfGenerator.generateFromHtml(htmlContent, version);

    const fileName = `evaluation_${jobPost.name}_v${version}_${Date.now()}.pdf`;
    const driveFile = await this.uploadPdf(userId, pdfBuffer, fileName, jobPost.evaluationsFolderId!);
    const driveUrl = driveFile.webViewLink ?? `https://drive.google.com/file/d/${driveFile.id}/view`;

    const kataEval = await this.repo.create({
      jobPostId: dto.jobPostId,
      title: `${jobPost.title}_v${version}`,
      // ── NOUVEAU ──────────────────────────────────────────────────────────────
      name: evaluationName,
      // ─────────────────────────────────────────────────────────────────────────
      status: dto.status ?? EvaluationStatus.PENDING,
      version,
      index: await this.nextIndex(dto.jobPostId),
      driveFileId: driveFile.id,
      driveFileUrl: driveUrl,
      pdfUrl: driveUrl,
      htmlContent,
      quizContent: null,
      quizAnswerKey: null,
    });
    this.notificationService.notifyReferents(kataEval, jobPost).catch((e) =>
      this.logger.error(`Notification kata échouée: ${e.message}`),
    );
    return kataEval;
  }

  private async getJobPost(jobPostId: number): Promise<JobPost> {
    const jobPost = await this.jobPostRepo.findOne({ where: { id: jobPostId } });
    if (!jobPost) throw new NotFoundException('Fiche de poste introuvable');
    return jobPost;
  }

  private async ensureEvaluationsFolder(userId: number, jobPost: JobPost): Promise<void> {
    if (jobPost.evaluationsFolderId) return;
    const parentFolderId = this.configService.getOrThrow<string>('DRIVE_FOLDER_EVALUATIONS_ID');
    const folder = await this.googleDriveService.createFolder(userId, `evaluations_${jobPost.name}`, parentFolderId);
    await this.jobPostRepo.update(jobPost.id, { evaluationsFolderId: folder.id });
    jobPost.evaluationsFolderId = folder.id;
  }

  private async buildJobPostContent(userId: number, jobPost: JobPost): Promise<string> {
    let content = `Nom du poste: ${jobPost.name}\nEntreprise: ${jobPost.company ?? 'N/A'}`;
    if (jobPost.googleDocId) {
      try {
        const base64 = await this.googleDriveService.downloadFile(userId, jobPost.googleDocId, 'application/pdf');
        const { text } = await parsePdf(Buffer.from(base64, 'base64'));
        content += `\n\nContenu complet de la fiche de poste:\n${text}`;
        this.logger.log(`Contenu PDF extrait pour jobPost ${jobPost.id}`);
      } catch (err) {
        this.logger.warn(`Impossible de lire le PDF ${jobPost.googleDocId}: ${err}`);
      }
    }
    return content;
  }

  private async detectChangeType(hrInstructions: string): Promise<'minor' | 'major'> {
    const prompt = `
Tu es un expert RH technique. Analyse ces instructions de modification d'une évaluation technique :

"${hrInstructions}"

Réponds UNIQUEMENT par "major" ou "minor" selon ces critères :
- "major" : changement de domaine métier, de framework, de user stories complètes, refonte globale
- "minor" : ajustement de texte, précision de critères, ajout d'un bonus, correction mineure

Un seul mot, rien d'autre.
    `.trim();
    const text = await this.callOpenRouter(prompt);
    return text.trim().toLowerCase().startsWith('major') ? 'major' : 'minor';
  }

  private bumpVersion(version: string, changeType: 'minor' | 'major'): string {
    const [major = 1, minor = 0, patch = 0] = version.split('.').map(Number);
    return changeType === 'major' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
  }

  private async nextMajorVersion(jobPostId: number): Promise<string> {
    const evaluations = await this.repo.findAll(jobPostId);
    const maxMajor = evaluations.reduce((max, ev) => Math.max(max, parseInt(ev.version.split('.')[0], 10)), 0);
    return `${maxMajor + 1}.0.0`;
  }

  private async nextIndex(jobPostId: number): Promise<number> {
    const evaluations = await this.repo.findAll(jobPostId);
    return evaluations.length + 1;
  }

  private async uploadPdf(userId: number, pdfBuffer: Buffer, fileName: string, folderId: string) {
    const fakeFile: Express.Multer.File = {
      buffer: pdfBuffer,
      originalname: fileName,
      mimetype: 'application/pdf',
      fieldname: 'file',
      encoding: '7bit',
      size: pdfBuffer.length,
      stream: new Readable(),
      destination: '',
      filename: fileName,
      path: '',
    };
    return this.googleDriveService.uploadFile(userId, fakeFile, folderId);
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 8000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = (await response.json()) as OpenRouterResponse;

    if (!response.ok || !data.choices?.length) {
      this.logger.error('Groq error response:', JSON.stringify(data, null, 2));
      throw new Error(
        `Groq API error: ${(data as any).error?.message ?? JSON.stringify(data)}`,
      );
    }

    const content = data.choices[0].message.content;
    const cleaned = content.replace(/```json|```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      return cleaned;
    }

    return cleaned.slice(firstBrace, lastBrace + 1);
  }
}