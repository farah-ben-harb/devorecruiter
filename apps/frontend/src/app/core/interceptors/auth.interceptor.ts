import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from '@modules/auth/services/auth.service';

// État partagé entre toutes les instances de l'intercepteur
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const token = authService.getStorageToken(environment.tokenKey);

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true', // ← ajoute ça
        },
      })
    : req.clone({
        setHeaders: {
          'ngrok-skip-browser-warning': 'true', // ← aussi pour les requêtes sans token
        },
      });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ne pas intercepter les erreurs des routes d'auth
      const isAuthRoute = req.url.includes('/auth/refresh') || req.url.includes('/auth/logout');

      if (error.status !== 401 || isAuthRoute) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        // ⏳ Un refresh est déjà en cours → attendre le nouveau token
        return refreshTokenSubject.pipe(
          filter((token) => token !== null),
          take(1),
          switchMap((newToken) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
          ),
        );
      }

      isRefreshing = true;
      refreshTokenSubject.next(null);

      return authService.refreshToken().pipe(
        switchMap((tokens) => {
          isRefreshing = false;
          refreshTokenSubject.next(tokens.access_token);

          return next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access_token}` },
            }),
          );
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          refreshTokenSubject.next(null);
          authService.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
