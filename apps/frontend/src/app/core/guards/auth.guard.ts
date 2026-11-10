import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@modules/auth/services/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return authService.refreshToken().pipe(
    map(() => true),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/signin']));
    }),
  );
};
