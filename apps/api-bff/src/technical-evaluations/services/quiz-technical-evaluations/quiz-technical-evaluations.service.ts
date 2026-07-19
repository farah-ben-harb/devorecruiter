import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject } from '@nestjs/common';
import {
  TechnicalEvaluation,
  EvaluationStatus,
} from '../../entities/technical-evaluations/technical-evaluations.entity';
import { TECHNICAL_EVALUATION_REPOSITORY } from '../../interfaces/technical-evaluations/technical-evaluations.interface';
import type { ITechnicalEvaluationRepository } from '../../interfaces/technical-evaluations/technical-evaluations.interface';
import { CreateTechnicalEvaluationDto } from '../../dtos/technical-evaluations/technical-evaluations.dto';
import { GoogleDriveService } from '../../../common/google-drive/google-drive.service';
import { JobPost } from '../../../job-posts/entities/job-post.entity';
import {
  QuizData,
  QuizQuestionPublic,
  QuizAnswerKey,
  buildQuizPdfTemplate,
} from '../../templates/quiz-evaluation.template';
import { buildQuizPrompt } from '../../prompts/quiz-evaluation.prompt';
import { OpenRouterResponse } from '../../interfaces/candidate-code-evaluation/candidate-code-evaluation.interface';
import { Readable } from 'stream';
import { PdfGeneratorService } from '../pdfs-generator/pdf-generator.service';

@Injectable()
export class QuizTechnicalEvaluationService {
  private readonly logger = new Logger(QuizTechnicalEvaluationService.name);

  constructor(
    @Inject(TECHNICAL_EVALUATION_REPOSITORY)
    private readonly repo: ITechnicalEvaluationRepository,
    private readonly googleDriveService: GoogleDriveService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  async generateQuiz(
    userId: number,
    jobPost: JobPost,
    dto: CreateTechnicalEvaluationDto,
    jobPostContent: string,
    version: string,
    groqApiKey: string,
    // ── NOUVEAU : nom hérité d'une évaluation parente (régénération) ──────────
    inheritedName?: string | null,
  ): Promise<TechnicalEvaluation> {
    this.logger.log(`Génération quiz v${version} pour jobPost ${dto.jobPostId}...`);

    const quizData = await this.buildQuizData(jobPostContent, groqApiKey);
    const { quizForCandidate, quizAnswerKey } = this.splitQuizData(quizData);

    // Le nom est soit hérité (régénération), soit le titre généré par l'IA
    const evaluationName = inheritedName ?? quizData.title ?? null;

    const html = buildQuizPdfTemplate(
      quizData.title,
      quizData.description,
      quizData.questions,
      version,
    );

    this.logger.log('Génération PDF quiz...');
    const pdfBuffer = await this.pdfGenerator.generateFromRawHtml(html);

    this.logger.log('Upload quiz PDF sur Drive...');
    const fileName = `quiz_${jobPost.name}_v${version}_${Date.now()}.pdf`;
    const driveFile = await this.uploadPdf(userId, pdfBuffer, fileName, jobPost.evaluationsFolderId!);
    const driveUrl = driveFile.webViewLink ?? `https://drive.google.com/file/d/${driveFile.id}/view`;

    return this.repo.create({
      jobPostId: dto.jobPostId,
      title: `${quizData.title}_v${version}`,
      // ── NOUVEAU ──────────────────────────────────────────────────────────────
      name: evaluationName,
      // ─────────────────────────────────────────────────────────────────────────
      status: dto.status ?? EvaluationStatus.PENDING,
      version,
      index: await this.nextIndex(dto.jobPostId),
      driveFileId: driveFile.id,
      driveFileUrl: driveUrl,
      pdfUrl: driveUrl,
      htmlContent: html,
      quizContent: JSON.stringify(quizForCandidate),
      quizAnswerKey: JSON.stringify(quizAnswerKey),
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async buildQuizData(jobPostContent: string, apiKey: string): Promise<QuizData> {
    const raw = await this.callOpenRouter(buildQuizPrompt(jobPostContent), apiKey);
    return JSON.parse(raw) as QuizData;
  }

  private splitQuizData(quizData: QuizData): {
    quizForCandidate: QuizQuestionPublic[];
    quizAnswerKey: QuizAnswerKey[];
  } {
    const quizForCandidate: QuizQuestionPublic[] = quizData.questions.map(
      ({ correct_answer, explanation, ...rest }) => rest,
    );
    const quizAnswerKey: QuizAnswerKey[] = quizData.questions.map((q) => ({
      id: q.id,
      question: q.question,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      domain: q.domain,
      difficulty: q.difficulty,
    }));
    return { quizForCandidate, quizAnswerKey };
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

  private async callOpenRouter(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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
      this.logger.error('Groq réponse JSON incomplète:', cleaned.slice(-300));
      throw new Error('Groq a retourné une réponse JSON incomplète. Réessayez.');
    }

    return cleaned.slice(firstBrace, lastBrace + 1);
  }

  private async nextIndex(jobPostId: number): Promise<number> {
    const evaluations = await this.repo.findAll(jobPostId);
    return evaluations.length + 1;
  }
}