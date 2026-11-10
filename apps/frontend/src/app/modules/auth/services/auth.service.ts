import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '@env/environment';
import { JwtPayload, AuthToken } from '../models/auth.model';
import { Role } from '@shared/constants/roles.constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private accessToken: string | null = null;

  saveToken(tokens: AuthToken): void {
    this.accessToken = tokens.access_token;
  }

  saveAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  getStorageToken(key: string): string | null {
    return key === environment.tokenKey ? this.accessToken : null;
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
    return this.http
      .post<AuthToken>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(tap((tokens) => this.saveToken(tokens)));
  }

  getGoogleAccessToken(): string | null {
    return this.getUser()?.googleAccessToken ?? null;
  }

  logout(): void {
    const token = this.accessToken;
    if (token) {
      this.http
        .post(
          `${environment.apiUrl}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` }, withCredentials: true },
        )
        .subscribe({ error: () => {} });
    }
    this.accessToken = null;
    this.router.navigate(['/signin']);
  }
}
