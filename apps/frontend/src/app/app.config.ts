import { ApplicationConfig, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';
import { provideMarkdown } from 'ngx-markdown';
import { HttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideMarkdown({ loader: HttpClient }),
    provideZonelessChangeDetection(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
