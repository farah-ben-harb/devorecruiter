import { Injectable, Logger } from '@nestjs/common';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { parsePdf } from '../../common/utils/pdf-parse.util';
import { GroqService } from './groq.service';
import axios from 'axios';
import * as mammoth from 'mammoth';

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
];

const TITLE_PROMPT =
  "Extrais UNIQUEMENT l'intitulé du poste (titre du job). " +
  "Retourne SEULEMENT 2 à 5 mots, rien d'autre. " +
  'Ignore les tableaux, les IDs, les descriptions, les numéros. ' +
  "Cherche uniquement le nom du poste comme : 'Dev Backend Sénior', 'Lead Developer', 'Chef de Projet'. " +
  'Ne retourne jamais une phrase complète, jamais un tableau, jamais une description. ' +
  'Si tu trouves plusieurs postes, retourne uniquement le premier titre. ' +
  'Si tu ne trouves pas, réponds NULL.';

const DOCX_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.google-apps.document',
];

const TEXT_MIME_TYPES = ['text/plain', 'text/csv'];
@Injectable()
export class JobPostHelpersService {
  private readonly logger = new Logger(JobPostHelpersService.name);

  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly groqService: GroqService,
  ) {}

  extractCompanyFromName(fileName: string): string | null {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const cleaned = baseName
      .replace(/^fiche([_\s-]*de[_\s-]*poste)?[_\s-]*/i, '')
      .replace(/[_\s-]*(fiche([_\s-]*de[_\s-]*poste)?|poste)$/i, '')
      .replace(/\(\d+\)/g, '')
      .replace(/\b\d+\b/g, '')
      .replace(/[_-]/g, ' ')
      .trim();
    return cleaned || null;
  }

  async extractStartDateFromPdf(
    userId: number,
    fileId: string,
  ): Promise<string | null> {
    try {
      const base64 = await this.googleDriveService.downloadFile(
        userId,
        fileId,
        'application/pdf',
      );

      if (!base64) return null;

      const buffer = Buffer.from(base64, 'base64');
      const header = buffer.slice(0, 4).toString('ascii');
      if (header !== '%PDF') return null;

      const { text } = await parsePdf(buffer);

      const patterns = [
        /date\s*de\s*d[eé]marrage\s*souhait[eé]e?\s*[:-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
        /date\s*de\s*d[eé]marrage\s*[:-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
        /d[eé]marrage\s*souhait[eé]e?\s*[:-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
        /d[eé]marrage\s*[:-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
        /d[eé]but\s*[:-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          this.logger.log(`Date extraite du PDF ${fileId}: ${match[1]}`);
          return match[1];
        }
      }

      this.logger.warn(`Aucune date trouvée dans le PDF ${fileId}`);
      return null;
    } catch (err) {
      this.logger.warn(
        `Erreur lecture PDF ${fileId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async extractTitleFromFile(
    userId: number,
    fileId: string,
    mimeType?: string,
  ): Promise<string | null> {
    try {
      // Cas 1 : image → Groq Vision directement
      if (mimeType && IMAGE_MIME_TYPES.includes(mimeType)) {
        this.logger.log(
          `Fichier image détecté (${mimeType}), utilisation Groq Vision`,
        );
        const base64 = await this.googleDriveService.downloadFile(
          userId,
          fileId,
          mimeType,
        );
        if (!base64) return null;
        return await this.groqService.extractFromImage(base64, mimeType);
      }

      // Cas 2 : DOCX → lire le binaire brut et extraire le texte avec mammoth
      if (mimeType && DOCX_MIME_TYPES.includes(mimeType)) {
        this.logger.log(
          `Fichier DOCX détecté (${mimeType}), lecture binaire + mammoth`,
        );
        try {
          // Télécharger le binaire brut via alt=media
          const accessToken =
            await this.googleDriveService.getValidAccessToken(userId);
          const { data } = await axios.get<ArrayBuffer>(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              responseType: 'arraybuffer',
            },
          );
          const buffer = Buffer.from(data);
          const result = await mammoth.extractRawText({ buffer });
          const text = result.value?.trim() ?? '';
          if (text.length >= 20) {
            return await this.groqService.extractFromText(text, TITLE_PROMPT);
          }
        } catch (err) {
          this.logger.warn(
            `Mammoth échoué pour ${fileId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        return null;
      }

      if (mimeType && TEXT_MIME_TYPES.includes(mimeType)) {
        this.logger.log(`Fichier texte détecté (${mimeType}), lecture directe`);
        try {
          const accessToken =
            await this.googleDriveService.getValidAccessToken(userId);
          const { data } = await axios.get<ArrayBuffer>(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              responseType: 'arraybuffer',
            },
          );
          const text = Buffer.from(data).toString('utf-8').trim();
          if (text.length >= 20) {
            return await this.groqService.extractFromText(text, TITLE_PROMPT);
          }
        } catch (err) {
          this.logger.warn(
            `Lecture texte échouée pour ${fileId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        return null;
      }

      // Cas 3 : PDF ou fallback → télécharger en PDF puis parser
      const base64 = await this.googleDriveService.downloadFile(
        userId,
        fileId,
        'application/pdf',
      );
      if (!base64) return null;

      const buffer = Buffer.from(base64, 'base64');
      const header = buffer.slice(0, 4).toString('ascii');

      if (header === '%PDF') {
        const { text } = await parsePdf(buffer);
        const trimmed = text?.trim() ?? '';

        if (trimmed.length >= 50) {
          return await this.groqService.extractFromText(trimmed, TITLE_PROMPT);
        }

        // PDF scanné → Groq Vision
        this.logger.log(
          `PDF scanné détecté pour ${fileId}, utilisation Groq Vision`,
        );
        return await this.groqService.extractFromImage(base64, 'image/jpeg');
      }

      this.logger.warn(
        `Format non reconnu pour ${fileId}, extraction impossible`,
      );
      return null;
    } catch (err) {
      this.logger.warn(
        `Erreur extraction titre ${fileId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
