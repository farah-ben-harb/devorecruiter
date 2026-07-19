import { Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { PassThrough } from 'node:stream';
import { User } from '../../users/entities/user.entity';
import { JobPost } from '../../job-posts/entities/job-post.entity';
import { Candidate } from '../../candidates/entities/candidate.entity';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly googleDriveService: GoogleDriveService;

  constructor(googleDriveService: GoogleDriveService) {
    this.googleDriveService = googleDriveService;
  }

  // ─── Buffer Excel sans cast dangereux ─────────────────────────────────────

  private async workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
    const ab = await workbook.xlsx.writeBuffer();
    return Buffer.from(ab);
  }

  // ─── Sanitize nom de fichier/dossier ──────────────────────────────────────

  private sanitize(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80);
  }

  // ─── Style header Excel commun ────────────────────────────────────────────

  private styleHeader(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2001A' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
    });
    row.height = 24;
  }

  private stripeRow(row: ExcelJS.Row, index: number): void {
    if (index % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      });
    }
  }

  // ─── USERS → Excel ────────────────────────────────────────────────────────

  async exportUsersToExcel(users: User[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'DevoRecruiter';
    wb.created = new Date();

    const sheet = wb.addWorksheet('Utilisateurs');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'fisrtName', key: 'firstName', width: 18 },
      { header: 'lastName', key: 'lastName', width: 18 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'roles', key: 'roles', width: 35 },
      { header: 'isActivated', key: 'isActivated', width: 12 },
      { header: 'lastLogin', key: 'lastLogin', width: 22 },
      { header: 'createdAt', key: 'createdAt', width: 22 },
    ];

    this.styleHeader(sheet.getRow(1));

    users.forEach((u, i) => {
      const row = sheet.addRow({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        roles: Array.isArray(u.roles) ? u.roles.join(', ') : String(u.roles),
        isActivated: u.isActivated ? 'Actif' : 'Inactif',
        lastLogin: u.lastLogin
          ? new Date(u.lastLogin).toLocaleString('fr-FR')
          : 'Jamais',
        createdAt: u.createdAt
          ? new Date(u.createdAt).toLocaleString('fr-FR')
          : '',
      });
      this.stripeRow(row, i);
      row.getCell('isActivated').font = {
        color: { argb: u.isActivated ? 'FF16A34A' : 'FF9CA3AF' },
        bold: true,
      };
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'H1' };
    return this.workbookToBuffer(wb);
  }

  // ─── JOB POSTS → Excel ────────────────────────────────────────────────────

  async exportJobPostsToExcel(jobPosts: JobPost[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'DevoRecruiter';
    wb.created = new Date();

    const sheet = wb.addWorksheet('Fiches de poste');
    sheet.columns = [
      { header: 'id', key: 'id', width: 8 },
      { header: 'name', key: 'name', width: 35 },
      { header: 'title', key: 'title', width: 30 },
      { header: 'company', key: 'company', width: 25 },
      { header: 'status', key: 'status', width: 14 },
      { header: 'startDate', key: 'startDate', width: 18 },
      { header: 'url', key: 'url', width: 45 },
      { header: 'unifiedUrl', key: 'unifiedUrl', width: 45 },
      { header: 'createdAt', key: 'createdAt', width: 22 },
    ];

    this.styleHeader(sheet.getRow(1));

    const statusColors: Record<string, string> = {
      raw: 'FF3B82F6',
      processing: 'FFF59E0B',
      unified: 'FF16A34A',
      error: 'FFEF4444',
    };

    jobPosts.forEach((p, i) => {
      const row = sheet.addRow({
        id: p.id,
        name: p.name,
        title: p.title ?? '',
        company: p.company ?? '',
        status: p.status,
        startDate: p.startDate ?? '',
        url: p.url ?? '',
        unifiedUrl: p.unifiedUrl ?? '',
        createdAt: p.createdAt
          ? new Date(p.createdAt).toLocaleString('fr-FR')
          : '',
      });
      this.stripeRow(row, i);

      row.getCell('status').font = {
        color: { argb: statusColors[p.status] ?? 'FF6B7280' },
        bold: true,
      };

      if (p.url) {
        const c = row.getCell('url');
        c.value = { text: p.url, hyperlink: p.url };
        c.font = { color: { argb: 'FF2563EB' }, underline: true };
      }
      if (p.unifiedUrl) {
        const c = row.getCell('unifiedUrl');
        c.value = { text: p.unifiedUrl, hyperlink: p.unifiedUrl };
        c.font = { color: { argb: 'FF16A34A' }, underline: true };
      }
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'I1' };
    return this.workbookToBuffer(wb);
  }

  // ─── CANDIDATES → Excel ───────────────────────────────────────────────────

  async exportCandidatesToExcel(candidates: Candidate[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'DevoRecruiter';
    wb.created = new Date();

    const sheet = wb.addWorksheet('Candidats');
    sheet.columns = [
      { header: 'id', key: 'id', width: 38 },
      { header: 'name', key: 'name', width: 18 },
      { header: 'firstName', key: 'firstName', width: 18 },
      { header: 'email', key: 'email', width: 30 },
      { header: 'status', key: 'status', width: 14 },
      { header: 'brutDriveLink', key: 'brutDriveLink', width: 45 },
      { header: 'unifieDriveLink', key: 'unifieDriveLink', width: 45 },
      { header: 'createdAt', key: 'createdAt', width: 22 },
    ];

    this.styleHeader(sheet.getRow(1));

    const statusColors: Record<string, string> = {
      pending: 'FF6B7280',
      processing: 'FFF59E0B',
      done: 'FF16A34A',
      error: 'FFEF4444',
    };

    candidates.forEach((c, i) => {
      const row = sheet.addRow({
        id: c.id,
        name: c.name ?? '',
        firstName: c.firstName ?? '',
        email: c.email ?? '',
        status: c.status,
        brutDriveLink: c.brutDriveLink ?? '',
        unifieDriveLink: c.unifieDriveLink ?? '',
        createdAt: c.createdAt
          ? new Date(c.createdAt).toLocaleString('fr-FR')
          : '',
      });
      this.stripeRow(row, i);

      row.getCell('status').font = {
        color: { argb: statusColors[c.status] ?? 'FF6B7280' },
        bold: true,
      };

      if (c.brutDriveLink) {
        const cell = row.getCell('brutDriveLink');
        cell.value = { text: c.brutDriveLink, hyperlink: c.brutDriveLink };
        cell.font = { color: { argb: 'FF2563EB' }, underline: true };
      }
      if (c.unifieDriveLink) {
        const cell = row.getCell('unifieDriveLink');
        cell.value = { text: c.unifieDriveLink, hyperlink: c.unifieDriveLink };
        cell.font = { color: { argb: 'FF16A34A' }, underline: true };
      }
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: 'A1', to: 'H1' };
    return this.workbookToBuffer(wb);
  }

  // ─── JOB POSTS → ZIP ─────────────────────────────────────────────────────

  async exportJobPostsToZip(
    jobPosts: JobPost[],
    userId: number,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const output = new PassThrough();
      const chunks: Buffer[] = [];

      output.on('data', (chunk: Buffer) => chunks.push(chunk));
      output.on('end', () => resolve(Buffer.concat(chunks)));
      output.on('error', (err: Error) => reject(err));

      const arc = archiver('zip', { zlib: { level: 6 } });
      arc.on('error', (err: Error) => reject(err));
      arc.pipe(output);

      const run = async (): Promise<void> => {
        await Promise.all(
          jobPosts.map(async (post) => {
            const folder = this.sanitize(
              `${post.id}_${post.title ?? post.name}`,
            );

            await Promise.all([
              post.googleDriveFileId
                ? this.googleDriveService
                    .downloadFile(
                      userId,
                      post.googleDriveFileId,
                      'application/pdf',
                    )
                    .then((b64) =>
                      arc.append(Buffer.from(b64, 'base64'), {
                        name: `${folder}/${this.sanitize(post.name)}_brut.pdf`,
                      }),
                    )
                    .catch((err: unknown) =>
                      this.logger.warn(
                        `ZIP brut ${post.googleDriveFileId}: ${err instanceof Error ? err.message : String(err)}`,
                      ),
                    )
                : Promise.resolve(),

              post.googleDocId
                ? this.googleDriveService
                    .downloadFile(userId, post.googleDocId, 'application/pdf')
                    .then((b64) =>
                      arc.append(Buffer.from(b64, 'base64'), {
                        name: `${folder}/${this.sanitize(post.title ?? post.name)}_unifie.pdf`,
                      }),
                    )
                    .catch((err: unknown) =>
                      this.logger.warn(
                        `ZIP unifié ${post.googleDocId}: ${err instanceof Error ? err.message : String(err)}`,
                      ),
                    )
                : Promise.resolve(),
            ]);
          }),
        );

        await arc.finalize();
      };

      run().catch((err: unknown) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
  }

  // ─── CANDIDATES → ZIP ────────────────────────────────────────────────────

  async exportCandidatesToZip(
    candidates: Candidate[],
    userId: number,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const output = new PassThrough();
      const chunks: Buffer[] = [];

      output.on('data', (chunk: Buffer) => chunks.push(chunk));
      output.on('end', () => resolve(Buffer.concat(chunks)));
      output.on('error', (err: Error) => reject(err));

      const arc = archiver('zip', { zlib: { level: 6 } });
      arc.on('error', (err: Error) => reject(err));
      arc.pipe(output);

      const run = async (): Promise<void> => {
        await Promise.all(
          candidates.map(async (c) => {
            const display =
              [c.name, c.firstName].filter(Boolean).join('_') || c.id;
            const folder = this.sanitize(display);

            await Promise.all([
              c.brutDriveId
                ? this.googleDriveService
                    .downloadFile(userId, c.brutDriveId)
                    .then((b64) =>
                      arc.append(Buffer.from(b64, 'base64'), {
                        name: `${folder}/${this.sanitize(c.brutDriveName ?? display)}_brut.pdf`,
                      }),
                    )
                    .catch((err: unknown) =>
                      this.logger.warn(
                        `ZIP brut ${c.brutDriveId}: ${err instanceof Error ? err.message : String(err)}`,
                      ),
                    )
                : Promise.resolve(),

              c.unifieDriveId
                ? this.googleDriveService
                    .downloadFile(userId, c.unifieDriveId)
                    .then((b64) =>
                      arc.append(Buffer.from(b64, 'base64'), {
                        name: `${folder}/${this.sanitize(c.unifieDriveName ?? display)}_unifie.pdf`,
                      }),
                    )
                    .catch((err: unknown) =>
                      this.logger.warn(
                        `ZIP unifié ${c.unifieDriveId}: ${err instanceof Error ? err.message : String(err)}`,
                      ),
                    )
                : Promise.resolve(),
            ]);
          }),
        );

        await arc.finalize();
      };

      run().catch((err: unknown) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      );
    });
  }
}
