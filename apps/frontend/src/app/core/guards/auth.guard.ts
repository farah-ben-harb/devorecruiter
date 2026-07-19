import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@modules/auth/services/auth.service';
import { environment } from '@env/environment';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  const refreshToken = authService.getStorageToken(environment.refreshTokenKey);
  if (!refreshToken) {
    return router.createUrlTree(['/signin']);
  }

  return authService.refreshToken().pipe(
    map(() => true),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/signin']));
    }),
  );
};
