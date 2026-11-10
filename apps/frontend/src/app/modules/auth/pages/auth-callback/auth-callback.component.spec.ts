import { describe, expect, it, vi, afterEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthCallbackComponent } from './auth-callback.component';

describe('AuthCallbackComponent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges the HttpOnly refresh cookie instead of reading tokens from the URL', () => {
    const refreshToken = vi.fn().mockReturnValue(of({ access_token: 'access-token' }));
    const saveAccessToken = vi.fn();
    const authService = {
      refreshToken,
      saveAccessToken,
      getRoles: vi.fn().mockReturnValue(['ADMIN_RH']),
    };
    const router = { navigate: vi.fn() };
    const route = { queryParams: of({ token: 'url-token', refresh_token: 'url-refresh' }) };
    const replace = vi.fn();
    vi.stubGlobal('location', { replace });

    const component = new AuthCallbackComponent(
      route as never,
      authService as never,
      router as never,
    );

    component.ngOnInit();

    expect(refreshToken).toHaveBeenCalledOnce();
    expect(saveAccessToken).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/');
  });

  it('redirects to sign-in when the session cookie cannot be exchanged', () => {
    const authService = {
      refreshToken: vi.fn().mockReturnValue(throwError(() => new Error('session expired'))),
      getRoles: vi.fn(),
    };
    const router = { navigate: vi.fn() };
    const route = { queryParams: of({}) };

    const component = new AuthCallbackComponent(
      route as never,
      authService as never,
      router as never,
    );

    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['/signin'], {
      queryParams: { error: 'unauthorized' },
      replaceUrl: true,
    });
  });

  it('maps a rejected OAuth callback to sign-in without exchanging a session', () => {
    const refreshToken = vi.fn();
    const authService = {
      refreshToken,
      getRoles: vi.fn(),
    };
    const router = { navigate: vi.fn() };
    const route = { queryParams: of({ error: 'inactive' }) };

    const component = new AuthCallbackComponent(
      route as never,
      authService as never,
      router as never,
    );

    component.ngOnInit();

    expect(refreshToken).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/signin'], {
      queryParams: { error: 'inactive' },
    });
  });
});
