import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

// ── Types ──────────────────────────────────────────────────────────────────

import {
  GroqMessage,
  GroqMessageContentPart,
  GroqChoice,
  GroqResponse,
  GroqRequestBody,
} from '../interfaces/groq.interface';

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly visionModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('GROQ_API_KEY')!;
    this.model =
      this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
    this.visionModel =
      this.configService.get<string>('GROQ_VISION_MODEL') ||
      'meta-llama/llama-4-scout-17b-16e-instruct';
  }

  // ── Core call (texte) ────────────────────────────────────────────────────

  private async callGroq(prompt: string): Promise<GroqResponse | null> {
    try {
      const body: GroqRequestBody = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      };

      const response = await firstValueFrom(
        this.httpService.post<GroqResponse>(
          'https://api.groq.com/openai/v1/chat/completions',
          body,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Groq API error', error);
      return null;
    }
  }

  // ── Core call vision (image) ─────────────────────────────────────────────

  private async callGroqVision(
    base64: string,
    mimeType: string,
    textPrompt: string,
  ): Promise<GroqResponse | null> {
    try {
      const body: GroqRequestBody = {
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              {
                type: 'text',
                text: textPrompt,
              },
            ],
          },
        ],
        temperature: 0.2,
      };

      const response = await firstValueFrom(
        this.httpService.post<GroqResponse>(
          'https://api.groq.com/openai/v1/chat/completions',
          body,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Groq Vision API error', error);
      return null;
    }
  }

  // ── Extract content ──────────────────────────────────────────────────────

  private extractContent(data: GroqResponse | null): string | null {
    if (!data?.choices?.length) return null;
    const content = data.choices[0]?.message?.content;
    return content?.trim() ?? null;
  }

  // ── Public methods ───────────────────────────────────────────────────────

  async extractFromText(text: string, prompt?: string): Promise<string | null> {
    if (!text?.trim()) return null;

    const finalPrompt = prompt
      ? `${prompt}\n\nTexte:\n${text}`
      : `Extract the job title from this text:\n${text}`;

    const data = await this.callGroq(finalPrompt);
    return this.extractContent(data);
  }

  async extractFromImage(
    base64: string,
    mimeType?: string,
  ): Promise<string | null> {
    if (!base64) return null;

    const mime = mimeType ?? 'image/jpeg';
    this.logger.log(`Extraction titre via Groq Vision (${mime})`);

    const TITLE_PROMPT =
      "Extrais UNIQUEMENT l'intitulé du poste (titre du job). " +
      "Retourne SEULEMENT 2 à 5 mots, rien d'autre. " +
      'Ignore les tableaux, les IDs, les descriptions, les numéros. ' +
      "Cherche uniquement le nom du poste comme : 'Dev Backend Sénior', 'Lead Developer', 'Chef de Projet'. " +
      'Ne retourne jamais une phrase complète. ' +
      'Si tu trouves plusieurs postes, retourne uniquement le premier titre. ' +
      'Si tu ne trouves pas, réponds NULL.';

    const data = await this.callGroqVision(base64, mime, TITLE_PROMPT);
    return this.extractContent(data);
  }

  async extractStructured<T>(prompt: string): Promise<T | null> {
    const data = await this.callGroq(prompt);
    const content = this.extractContent(data);
    if (!content) return null;

    try {
      return JSON.parse(content) as T;
    } catch {
      this.logger.warn('Invalid JSON from Groq');
      return null;
    }
  }
}
