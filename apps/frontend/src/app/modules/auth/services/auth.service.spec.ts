import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { JwtPayload, AuthToken } from '../models/auth.model';
import { StorageService } from '@core/services/storage.service';
import { environment } from '@env/environment';

const makePayload = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  sub: 1,
  email: 'test@test.com',
  roles: ['ADMIN_RH'],
  firstName: 'Test',
  lastName: 'User',
  picture: '',
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

const makeToken = (payload: Partial<JwtPayload> = {}): string => {
  const encoded = btoa(JSON.stringify(makePayload(payload)));
  return `header.${encoded}.signature`;
};

describe('AuthService', () => {
  let service: AuthService;
  let storageSpy: StorageService;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let httpSpy: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storageSpy = new StorageService();
    routerSpy = { navigate: vi.fn() };
    httpSpy = { post: vi.fn() };

    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: StorageService, useValue: storageSpy },
        { provide: Router, useValue: routerSpy },
        { provide: HttpClient, useValue: httpSpy },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  describe('saveToken()', () => {
    it('should store access_token and refresh_token when both are provided', () => {
      const tokens: AuthToken = {
        access_token: 'acc',
        refresh_token: 'ref',
      };
      service.saveToken(tokens);
      expect(storageSpy.get(environment.tokenKey)).toBe('acc');
      expect(storageSpy.get(environment.refreshTokenKey)).toBe('ref');
    });

    it('should store only access_token when refresh_token is missing', () => {
      const tokens: AuthToken = { access_token: 'acc' };
      service.saveToken(tokens);
      expect(storageSpy.get(environment.tokenKey)).toBe('acc');
      expect(storageSpy.get(environment.refreshTokenKey)).toBeNull();
    });
  });

  describe('saveAccessToken()', () => {
    it('should store only access token', () => {
      service.saveAccessToken('only-access');
      expect(storageSpy.get(environment.tokenKey)).toBe('only-access');
      expect(storageSpy.get(environment.refreshTokenKey)).toBeNull();
    });
  });

  describe('getUser()', () => {
    it('should decode and return JWT payload', () => {
      const token = makeToken({ email: 'hello@test.com' });
      storageSpy.set(environment.tokenKey, token);
      const user = service.getUser();
      expect(user?.email).toBe('hello@test.com');
      expect(user?.roles).toEqual(['ADMIN_RH']);
    });

    it('should return null if no token', () => {
      expect(service.getUser()).toBeNull();
    });

    it('should return null if token is malformed', () => {
      storageSpy.set(environment.tokenKey, 'not.a.token');
      expect(service.getUser()).toBeNull();
    });
  });

  // --- isLoggedIn ---
  describe('isLoggedIn()', () => {
    it('should return true for a valid non-expired token', () => {
      storageSpy.set(environment.tokenKey, makeToken());
      expect(service.isLoggedIn()).toBe(true);
    });

    it('should return false for an expired token', () => {
      const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 });
      storageSpy.set(environment.tokenKey, token);
      expect(service.isLoggedIn()).toBe(false);
    });

    it('should return false if no token', () => {
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  // --- getRoles ---
  describe('getRoles()', () => {
    it('should return roles from token', () => {
      storageSpy.set(environment.tokenKey, makeToken({ roles: ['CONSULTANT'] }));
      expect(service.getRoles()).toEqual(['CONSULTANT']);
    });

    it('should return empty array if no token', () => {
      expect(service.getRoles()).toEqual([]);
    });
  });

  // --- logout ---
  describe('logout()', () => {
    it('should remove tokens from storage', () => {
      storageSpy.set(environment.tokenKey, 'acc');
      storageSpy.set(environment.refreshTokenKey, 'ref');
      httpSpy.post.mockReturnValue({ subscribe: vi.fn() });

      service.logout();

      expect(storageSpy.get(environment.tokenKey)).toBeNull();
      expect(storageSpy.get(environment.refreshTokenKey)).toBeNull();
    });

    it('should navigate to /signin after logout', () => {
      httpSpy.post.mockReturnValue({ subscribe: vi.fn() });
      service.logout();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/signin']);
    });
  });
});
