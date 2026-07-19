import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../../modules/auth/services/auth.service';
import { StorageService } from '../services/storage.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let storageSpy: StorageService;
  let authServiceSpy: Partial<AuthService>;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    storageSpy = new StorageService();
    localStorage.clear();

    routerSpy = { navigate: vi.fn() };

    authServiceSpy = {
      getStorageToken: vi.fn().mockReturnValue('fake-token'),
      refreshToken: vi.fn(),
      logout: vi.fn(),
      saveToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StorageService, useValue: storageSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should add Authorization header to requests', () => {
    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-token');
    req.flush({});
  });

  it('should not add Authorization header if no token', () => {
    (authServiceSpy.getStorageToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    http.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });
});
