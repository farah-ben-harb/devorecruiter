import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/import`;

  // ─── Utilisateurs ─────────────────────────────────────────────────────────

  importUsers(file: File): Observable<{ added: number; ignored: number; errors: string[] }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ added: number; ignored: number; errors: string[] }>(
      `${this.apiUrl}/users`,
      form,
    );
  }
}
