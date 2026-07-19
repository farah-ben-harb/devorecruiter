import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '@modules/auth/services/auth.service';
import { Role } from '@shared/constants/roles.constants';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data['roles'] as Role[] | undefined) ?? [];
  const userRoles = authService.getRoles();

  return userRoles.some((r) => allowedRoles.includes(r)) ? true : router.createUrlTree(['/']);
};
