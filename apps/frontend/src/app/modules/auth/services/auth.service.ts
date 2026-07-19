import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { StorageService } from '@core/services/storage.service';
import { JwtPayload, AuthToken } from '../models/auth.model';
import { Role } from '@shared/constants/roles.constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  saveToken(tokens: AuthToken): void {
    this.storage.set(environment.tokenKey, tokens.access_token);
    if (tokens.refresh_token) {
      this.storage.set(environment.refreshTokenKey, tokens.refresh_token);
    }
  }

  saveAccessToken(accessToken: string): void {
    this.storage.set(environment.tokenKey, accessToken);
  }

  getStorageToken(key: string): string | null {
    return this.storage.get(key);
  }

  getUser(): JwtPayload | null {
    const token = this.getStorageToken(environment.tokenKey);
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])) as JwtPayload;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    const token = this.getStorageToken(environment.tokenKey);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload;
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getRoles(): Role[] {
    return this.getUser()?.roles ?? [];
  }

  refreshToken(): Observable<AuthToken> {
    const refreshToken = this.getStorageToken(environment.refreshTokenKey);
    const options = refreshToken
      ? { headers: { Authorization: `Bearer ${refreshToken}` }, withCredentials: true }
      : { withCredentials: true };

    return this.http
      .post<AuthToken>(`${environment.apiUrl}/auth/refresh`, {}, options)
      .pipe(tap((tokens) => this.saveToken(tokens)));
  }

  getGoogleAccessToken(): string | null {
    return this.getUser()?.googleAccessToken ?? null;
  }

  logout(): void {
    const token = this.getStorageToken(environment.tokenKey);
    if (token) {
      this.http
        .post(
          `${environment.apiUrl}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
        )
        .subscribe({ error: () => {} });
    }
    this.storage.remove(environment.tokenKey);
    this.storage.remove(environment.refreshTokenKey);
    this.router.navigate(['/signin']);
  }
}
