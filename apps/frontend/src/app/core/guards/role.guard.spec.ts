import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from '@modules/auth/services/auth.service';

const mockState = {} as RouterStateSnapshot;

const makeRoute = (roles: string[]): ActivatedRouteSnapshot =>
  ({ data: { roles } }) as unknown as ActivatedRouteSnapshot;

describe('roleGuard', () => {
  let authServiceSpy: { getRoles: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn>; createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceSpy = { getRoles: vi.fn() };
    routerSpy = {
      navigate: vi.fn(),
      createUrlTree: vi.fn().mockReturnValue({ urlTree: '/' }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('should return true if user role is allowed', () => {
    authServiceSpy.getRoles.mockReturnValue(['ADMIN_RH']);
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(makeRoute(['ADMIN_RH', 'CONSULTANT']), mockState),
    );
    expect(result).toBe(true);
  });

  it('should return UrlTree to / if user role is NOT allowed', () => {
    authServiceSpy.getRoles.mockReturnValue(['CONSULTANT']);
    TestBed.runInInjectionContext(() => roleGuard(makeRoute(['ADMIN_RH']), mockState));
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should return UrlTree if user has no role', () => {
    authServiceSpy.getRoles.mockReturnValue([]);
    TestBed.runInInjectionContext(() => roleGuard(makeRoute(['ADMIN_RH']), mockState));
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('should NOT call router.navigate directly', () => {
    authServiceSpy.getRoles.mockReturnValue(['CONSULTANT']);
    TestBed.runInInjectionContext(() => roleGuard(makeRoute(['ADMIN_RH']), mockState));
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should handle empty roles array', () => {
    authServiceSpy.getRoles.mockReturnValue(['ADMIN_RH']);
    TestBed.runInInjectionContext(() => roleGuard(makeRoute([]), mockState));
    expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
