import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '@modules/auth/services/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

const mockRoute = {} as ActivatedRouteSnapshot;
const mockState = {} as RouterStateSnapshot;

describe('authGuard', () => {
  let authServiceSpy: {
    isLoggedIn: ReturnType<typeof vi.fn>;
    getStorageToken: ReturnType<typeof vi.fn>;
    refreshToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let routerSpy: { navigate: ReturnType<typeof vi.fn>; createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceSpy = {
      isLoggedIn: vi.fn(),
      getStorageToken: vi.fn().mockReturnValue(null),
      refreshToken: vi.fn().mockReturnValue(of({ access_token: 'access-token' })),
      logout: vi.fn(),
    };
    routerSpy = {
      navigate: vi.fn(),
      createUrlTree: vi.fn().mockReturnValue({ urlTree: '/signin' }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('should return true if user is logged in', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('refreshes the session cookie when the access token is not in memory', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(authServiceSpy.refreshToken).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should NOT call router.navigate directly', () => {
    authServiceSpy.isLoggedIn.mockReturnValue(false);
    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
