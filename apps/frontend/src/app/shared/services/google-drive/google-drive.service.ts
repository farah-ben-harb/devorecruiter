import { Injectable, inject } from '@angular/core';
import { from, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { DriveFile, GoogleDriveFilesResponse } from '@shared/models/shared.model';

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  private readonly authService = inject(AuthService);

  listFiles(folderId: string): Observable<DriveFile[]> {
    const token = this.getToken();
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size)`;

    return from(
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (!res.ok) throw new Error(`Drive API error ${res.status}`);
          return res.json() as Promise<GoogleDriveFilesResponse>;
        })
        .then((data) => (data.files ?? []) as DriveFile[]),
    );
  }

  downloadFile(fileId: string, mimeType: string): Observable<Blob> {
    const token = this.getToken();
    const isGoogleFile = mimeType?.startsWith(environment.googleMimePrefix);
    const url = isGoogleFile
      ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`
      : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    return from(
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((res) => {
        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
        return res.blob();
      }),
    );
  }

  private getToken(): string {
    const token = this.authService.getGoogleAccessToken();
    if (!token) throw new Error('Token Google introuvable');
    return token;
  }
}
