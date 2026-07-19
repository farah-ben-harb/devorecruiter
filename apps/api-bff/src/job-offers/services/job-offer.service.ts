import {
    Injectable,
    Logger,
    NotFoundException,
    BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { JobOfferRepository } from '../repositories/job-offer.repository';
import { JobOffer } from '../entities/job-offer.entity';
import { IAiJobOfferResponse } from '../interfaces/job-offer.interface';
import { GenerateJobOfferDto, UpdateJobOfferDto } from '../dtos/job-offer.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { JobPost, JobPostStatus } from '../../job-posts/entities/job-post.entity';
import { parsePdf } from '../../common/utils/pdf-parse.util';

@Injectable()
export class JobOfferService {
    private readonly logger = new Logger(JobOfferService.name);
    private readonly groqHttp: AxiosInstance;

    constructor(
        private readonly jobOfferRepo: JobOfferRepository,
        private readonly config: ConfigService,
        @InjectRepository(JobPost)
        private readonly jobPostRepo: Repository<JobPost>,        // ← ajouter
        private readonly googleDriveService: GoogleDriveService,
    ) {
        this.groqHttp = axios.create({
            baseURL: 'https://api.groq.com/openai/v1',
            timeout: 60_000,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config.get<string>('GROQ_API_KEY')}`,
            },
        });
    }

    // ── Appel Groq (llama3-8b-8192) ───────────────────────────
    private async callGroq(promptLibre: string): Promise<IAiJobOfferResponse> {
        const systemPrompt = `Tu es un expert RH spécialisé dans la rédaction d'offres d'emploi LinkedIn percutantes.
Tu dois générer une offre d'emploi complète et attractive en français à partir du prompt utilisateur.
Tu réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, sans balises markdown.
IMPORTANT : dans les valeurs string du JSON, les sauts de ligne doivent être écrits comme \\n (antislash + n), jamais comme de vrais retours à la ligne.
Le JSON doit respecter exactement cette structure :
{
  "titre": "string",
  "accroche": "string",
  "format_linkedin": "string avec \\n pour les sauts de ligne",
  "missions": ["string", "..."],
  "profil": ["string", "..."],
  "avantages": ["string", "..."],
  "hashtags": ["string", "..."],
  "mots_cles": ["string", "..."]
}`;

        const userPrompt = `Génère une offre d'emploi LinkedIn complète pour : ${promptLibre}`;

        try {
            this.logger.log(`Calling Groq llama-3.1-8b-instant — prompt: "${promptLibre}"`);

            const { data } = await this.groqHttp.post('/chat/completions', {
                model: 'llama-3.1-8b-instant',
                temperature: 0.7,
                max_tokens: 2048,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            });

            const rawContent: string = data.choices?.[0]?.message?.content ?? '';
            this.logger.log(`Groq raw response received`);

            // Extraire uniquement le bloc JSON (entre le premier { et le dernier })
            const firstBrace = rawContent.indexOf('{');
            const lastBrace = rawContent.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) {
                throw new BadGatewayException("Aucun JSON trouvé dans la réponse Groq.");
            }
            const extracted = rawContent.slice(firstBrace, lastBrace + 1);

            // Remplacer les vrais sauts de ligne à l'intérieur des strings JSON
            // On reconstruit caractère par caractère pour ne toucher qu'aux strings
            const sanitized = this.sanitizeJsonString(extracted);

            let parsed: IAiJobOfferResponse;
            try {
                parsed = JSON.parse(sanitized) as IAiJobOfferResponse;
            } catch {
                this.logger.error(`Groq JSON parse error — raw: ${extracted}`);
                throw new BadGatewayException(
                    "La réponse de Groq n'est pas un JSON valide. Réessayez.",
                );
            }

            // Validation minimale
            const required: (keyof IAiJobOfferResponse)[] = [
                'titre', 'accroche', 'format_linkedin',
                'missions', 'profil', 'avantages', 'hashtags', 'mots_cles',
            ];
            for (const field of required) {
                if (!parsed[field]) {
                    throw new BadGatewayException(`Champ manquant dans la réponse Groq : "${field}"`);
                }
            }

            this.logger.log(`Groq response parsed — titre: "${parsed.titre}"`);
            return parsed;

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const msg = error.response?.data?.error?.message ?? error.message;
                this.logger.error(`Groq HTTP error ${status}: ${msg}`);
                if (status === 401) throw new BadGatewayException('Clé GROQ_API_KEY invalide ou manquante.');
                if (status === 429) throw new BadGatewayException('Limite de taux Groq atteinte. Réessayez dans quelques secondes.');
            }
            if (error instanceof BadGatewayException) throw error;
            this.logger.error('Groq generation failed', String(error));
            throw new BadGatewayException('Le service Groq est indisponible. Vérifiez votre GROQ_API_KEY.');
        }
    }
    private sanitizeJsonString(raw: string): string {
        let result = '';
        let inString = false;
        let escaped = false;

        for (let i = 0; i < raw.length; i++) {
            const char = raw[i];

            if (escaped) {
                result += char;
                escaped = false;
                continue;
            }

            if (char === '\\' && inString) {
                result += char;
                escaped = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                result += char;
                continue;
            }

            if (inString && char === '\n') {
                result += '\\n';
                continue;
            }

            if (inString && char === '\r') {
                result += '\\r';
                continue;
            }

            result += char;
        }

        return result;
    }

    // ── 1. Générer + sauvegarder ──────────────────────────────
    async generate(dto: GenerateJobOfferDto, userId: number): Promise<JobOffer> {
        const aiResponse = await this.callGroq(dto.promptLibre);
        return this.jobOfferRepo.create({
            promptLibre: dto.promptLibre,
            titre: aiResponse.titre,
            accroche: aiResponse.accroche,
            formatLinkedin: aiResponse.format_linkedin,
            missions: aiResponse.missions,
            profil: aiResponse.profil,
            avantages: aiResponse.avantages,
            hashtags: aiResponse.hashtags,
            motsCles: aiResponse.mots_cles,
            userId,
        });
    }

    // ── 2. Lister toutes mes offres ───────────────────────────
    async findAll(userId: number): Promise<JobOffer[]> {
        return this.jobOfferRepo.findAll(userId);
    }

    // ── 3. Voir une offre ─────────────────────────────────────
    async findOne(id: string, userId: number): Promise<JobOffer> {
        const offer = await this.jobOfferRepo.findOne(id, userId);
        if (!offer) throw new NotFoundException(`Job offer #${id} not found`);
        return offer;
    }

    // ── 4. Modifier ───────────────────────────────────────────
    async update(id: string, userId: number, dto: UpdateJobOfferDto): Promise<JobOffer> {
        return this.jobOfferRepo.update(id, userId, dto);
    }

    // ── 5. Supprimer ──────────────────────────────────────────
    async remove(id: string, userId: number): Promise<{ message: string }> {
        await this.jobOfferRepo.delete(id, userId);
        return { message: `Job offer #${id} deleted successfully` };
    }

async generateFromJobPost(jobPostIds: number[], userId: number): Promise<JobOffer[]> {
  const results: JobOffer[] = [];

  for (const jobPostId of jobPostIds) {
    const jobPost = await this.jobPostRepo.findOne({ where: { id: jobPostId } });
    if (!jobPost || jobPost.status !== JobPostStatus.UNIFIED) {
      throw new NotFoundException(`Fiche de poste #${jobPostId} introuvable ou non unifiée.`);
    }

    let jobPostContent = `Titre du poste : ${jobPost.title ?? jobPost.name}\nEntreprise : ${jobPost.company ?? 'N/A'}`;

    if (jobPost.googleDocId) {
      try {
        const base64 = await this.googleDriveService.downloadFile(userId, jobPost.googleDocId, 'application/pdf');
        const { text } = await parsePdf(Buffer.from(base64, 'base64'));
        jobPostContent += `\n\nContenu complet de la fiche :\n${text}`;
      } catch (err) {
        this.logger.warn(`Impossible de lire le PDF de la fiche #${jobPostId}: ${err}`);
      }
    }

    const promptLibre = `Génère une offre LinkedIn attractive basée EXCLUSIVEMENT sur :\n${jobPostContent}`.trim();

    // Générer puis sauvegarder avec jobPostId
    const aiResponse = await this.callGroq(promptLibre);
    const offer = await this.jobOfferRepo.create({
      promptLibre,
      titre: aiResponse.titre,
      accroche: aiResponse.accroche,
      formatLinkedin: aiResponse.format_linkedin,
      missions: aiResponse.missions,
      profil: aiResponse.profil,
      avantages: aiResponse.avantages,
      hashtags: aiResponse.hashtags,
      motsCles: aiResponse.mots_cles,
      userId,
      jobPostId, 
    });
    results.push(offer);
  }

  return results;
}
}