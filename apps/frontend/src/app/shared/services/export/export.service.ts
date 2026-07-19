import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/export`;

  private getDateSuffix(): string {
    return new Date().toISOString().split('T')[0];
  }

  private download(url: string, filename: string): void {
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(objectUrl);
      },
      error: (err: unknown) => {
        console.error('Erreur export :', err);
      },
    });
  }

  // ─── Utilisateurs ─────────────────────────────────────────────────────────

  exportUsersExcel(): void {
    this.download(`${this.apiUrl}/users`, `utilisateurs_${this.getDateSuffix()}.xlsx`);
  }

  // ─── Fiches de poste ──────────────────────────────────────────────────────

  exportJobPostsExcel(): void {
    this.download(`${this.apiUrl}/job-posts/excel`, `fiches_poste_${this.getDateSuffix()}.xlsx`);
  }

  exportJobPostsZip(): void {
    this.download(`${this.apiUrl}/job-posts/zip`, `fiches_poste_${this.getDateSuffix()}.zip`);
  }

  // ─── Candidats ────────────────────────────────────────────────────────────

  exportCandidatesExcel(): void {
    this.download(`${this.apiUrl}/candidates/excel`, `candidats_${this.getDateSuffix()}.xlsx`);
  }

  exportCandidatesZip(): void {
    this.download(`${this.apiUrl}/candidates/zip`, `candidats_${this.getDateSuffix()}.zip`);
  }
}
