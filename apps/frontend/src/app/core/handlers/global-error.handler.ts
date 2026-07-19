import { ErrorHandler, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      // Erreurs HTTP — déjà gérées par l'interceptor, on log seulement
      console.warn('[GlobalErrorHandler] HTTP error:', error.status, error.message);
      return;
    }

    if (error instanceof Error) {
      // Erreurs JS runtime (TypeError, ReferenceError, etc.)
      console.error('[GlobalErrorHandler] Runtime error:', error.message);
      console.error(error.stack);
      return;
    }

    // Erreurs inconnues
    console.error('[GlobalErrorHandler] Unknown error:', error);
  }
}
