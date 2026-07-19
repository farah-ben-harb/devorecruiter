import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import { UsersService } from '../../users/services/users.service';
import { GoogleDriveFilesResponse } from '../interfaces/google-drive.interface';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

// Durée de vie du cache token : 50 minutes (les tokens Google expirent après 60 min)
const TOKEN_CACHE_TTL_MS = 50 * 60 * 1000;

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  // ✅ FIX 1 : Cache en mémoire pour éviter la vérification HTTP à chaque requête
  private readonly tokenCache = new Map<number, CachedToken>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Token Management ────────────────────────────────────────────────────────

  /**
   * Retourne un access token valide pour l'utilisateur.
   * ✅ Utilise un cache en mémoire → aucun appel HTTP si le token est encore frais.
   */
  async getValidAccessToken(userId: number): Promise<string> {
    // 1. Vérifier le cache d'abord (aucun appel réseau)
    const cached = this.tokenCache.get(userId);
    if (cached && Date.now() < cached.expiresAt) {
      this.logger.debug(`Token servi depuis le cache pour user ${userId}`);
      return cached.token;
    }

    // 2. Récupérer le token stocké en base
    const current = await this.usersService.getGoogleAccessToken(userId);

    if (current) {
      // Mettre en cache sans vérification HTTP
      this.tokenCache.set(userId, {
        token: current,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
      });
      return current;
    }

    // 3. Token absent → rafraîchir via refresh_token
    this.logger.warn(`Token absent pour user ${userId}, rafraîchissement...`);
    return this.refreshToken(userId);
  }

  /**
   * Invalide le cache et force un rafraîchissement du token.
   * Appelé automatiquement en cas d'erreur 401 depuis les autres méthodes.
   */
  private async refreshToken(userId: number): Promise<string> {
    const refreshToken = await this.usersService.getGoogleRefreshToken(userId);
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Session Google expirée, veuillez vous reconnecter',
      );
    }

    const { data } = await firstValueFrom(
      this.httpService.post<{ access_token: string }>(
        'https://oauth2.googleapis.com/token',
        {
          client_id: this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.getOrThrow<string>(
            'GOOGLE_CLIENT_SECRET',
          ),
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        },
      ),
    );

    // Mettre en cache le nouveau token
    this.tokenCache.set(userId, {
      token: data.access_token,
      expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });

    await this.usersService.updateGoogleAccessToken(userId, data.access_token);
    this.logger.log(
      `Token Google rafraîchi et mis en cache pour user ${userId}`,
    );
    return data.access_token;
  }

  /**
   * Invalide le cache pour un utilisateur (ex: lors du logout).
   */
  invalidateTokenCache(userId: number): void {
    this.tokenCache.delete(userId);
    this.logger.log(`Cache token invalidé pour user ${userId}`);
  }

  /**
   * Gère les erreurs 401 en invalidant le cache et en retentant avec un token frais.
   * Évite de devoir dupliquer cette logique dans chaque méthode.
   */
  private async withTokenRetry<T>(
    userId: number,
    fn: (token: string) => Promise<T>,
  ): Promise<T> {
    const token = await this.getValidAccessToken(userId);
    try {
      return await fn(token);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        this.logger.warn(
          `401 reçu pour user ${userId}, invalidation du cache et retry...`,
        );
        this.tokenCache.delete(userId);
        const freshToken = await this.refreshToken(userId);
        return fn(freshToken);
      }
      throw error;
    }
  }

  // ─── Opérations Drive ────────────────────────────────────────────────────────

  async uploadFile(
    userId: number,
    file: Express.Multer.File,
    folderId: string,
  ): Promise<DriveFile> {
    return this.withTokenRetry(userId, async (accessToken) => {
      const metadata = JSON.stringify({
        name: file.originalname,
        parents: [folderId],
      });

      const formData = new FormData();
      formData.append(
        'metadata',
        new Blob([metadata], { type: 'application/json' }),
      );
      formData.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
      );

      const { data } = await axios.post<DriveFile>(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink&supportsAllDrives=true',
        formData,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      this.logger.log(`Fichier uploadé : ${data.name} (${data.id})`);
      return data;
    });
  }

  async listFiles(userId: number, folderId: string): Promise<DriveFile[]> {
    return this.withTokenRetry(userId, async (accessToken) => {
      const query = `'${folderId}' in parents and trashed = false`;

      const { data } = await axios.get<GoogleDriveFilesResponse>(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      this.logger.log(`listFiles — ${data.files.length} fichiers trouvés`);
      return data.files;
    });
  }

  async downloadFile(
    userId: number,
    fileId: string,
    mimeType = 'application/pdf',
  ): Promise<string> {
    return this.withTokenRetry(userId, async (accessToken) => {
      try {
        const { data } = await axios.get<ArrayBuffer>(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${mimeType}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'arraybuffer',
          },
        );
        this.logger.log(`Export réussi pour ${fileId}`);
        return Buffer.from(data).toString('base64');
      } catch (error) {
        this.logger.warn(
          `Export échoué pour ${fileId}, tentative alt=media...`,
        );

        if (axios.isAxiosError(error)) {
          this.logger.warn(`Status: ${error.response?.status}`);

          if (
            error.response?.status === 400 ||
            error.response?.status === 403 ||
            error.response?.status === 404
          ) {
            try {
              const { data } = await axios.get<ArrayBuffer>(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                  responseType: 'arraybuffer',
                },
              );
              this.logger.log(`alt=media réussi pour ${fileId}`);
              return Buffer.from(data).toString('base64');
            } catch (fallbackError) {
              this.logger.error(`alt=media aussi échoué : ${fallbackError}`);
              throw fallbackError;
            }
          }
        }
        throw error;
      }
    });
  }

  async deleteFile(userId: number, fileId: string): Promise<void> {
    if (!fileId) return;

    return this.withTokenRetry(userId, async (accessToken) => {
      try {
        await axios({
          method: 'delete',
          url: `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        this.logger.log(`Fichier supprimé : ${fileId}`);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          this.logger.warn(`Fichier ${fileId} déjà supprimé ou introuvable`);
          return;
        }
        throw error;
      }
    });
  }

  async shareFileWithUser(
    userId: number,
    fileId: string,
    emailToShareWith: string,
  ): Promise<void> {
    return this.withTokenRetry(userId, async (accessToken) => {
      try {
        await axios.post(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
          { role: 'writer', type: 'user', emailAddress: emailToShareWith },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        this.logger.log(`Fichier ${fileId} partagé avec ${emailToShareWith}`);
      } catch (error) {
        this.logger.warn(
          `Impossible de partager ${fileId} avec ${emailToShareWith} : ${error}`,
        );
      }
    });
  }

  /**
   * ✅ FIX 2 : Accepte un tableau d'emails pré-chargés pour éviter
   * une requête DB répétée pour chaque fichier lors de la sync.
   * Si `emails` n'est pas fourni, ils sont récupérés depuis la base.
   */
  async shareWithAll(
    userId: number,
    fileId: string,
    emails?: string[],
  ): Promise<void> {
    const otherEmails =
      emails ?? (await this.usersService.getAllEmailsExcept(userId));

    // ✅ Partage en parallèle (était séquentiel dans certains cas d'appel)
    await Promise.all(
      otherEmails.map((email) =>
        this.shareFileWithUser(userId, fileId, email).catch((err: unknown) =>
          this.logger.warn(
            `Share failed for ${fileId} with ${email}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        ),
      ),
    );
  }

  async shareAllExistingFiles(
    userId: number,
    fileIds: (string | null | undefined)[],
  ): Promise<void> {
    // ✅ Récupérer les emails une seule fois pour tous les fichiers
    const otherEmails = await this.usersService.getAllEmailsExcept(userId);

    await Promise.all(
      fileIds
        .filter((id): id is string => !!id)
        .map((fileId) => this.shareWithAll(userId, fileId, otherEmails)),
    );

    this.logger.log('Partage terminé pour tous les fichiers');
  }

  async createFolder(
    userId: number,
    folderName: string,
    parentFolderId: string,
  ): Promise<DriveFile> {
    return this.withTokenRetry(userId, async (accessToken) => {
      const { data } = await axios.post<DriveFile>(
        'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,mimeType,webViewLink',
        {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      this.logger.log(`Dossier créé : ${data.name} (${data.id})`);
      return data;
    });
  }
}
