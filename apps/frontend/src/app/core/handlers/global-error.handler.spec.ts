import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { GlobalErrorHandler } from './global-error.handler';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    handler = new GlobalErrorHandler();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('handleError()', () => {
    it('should handle HttpErrorResponse with console.warn', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });
      handler.handleError(error);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[GlobalErrorHandler] HTTP error:',
        500,
        expect.any(String),
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle standard Error with message and stack', () => {
      const error = new Error('Something went wrong');
      handler.handleError(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GlobalErrorHandler] Runtime error:',
        'Something went wrong',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('should handle TypeError with message and stack', () => {
      const error = new TypeError('Cannot read property');
      handler.handleError(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GlobalErrorHandler] Runtime error:',
        'Cannot read property',
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('should handle unknown error', () => {
      handler.handleError('unexpected string error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[GlobalErrorHandler] Unknown error:',
        'unexpected string error',
      );
    });

    it('should handle null error gracefully', () => {
      expect(() => handler.handleError(null)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('[GlobalErrorHandler] Unknown error:', null);
    });
  });
});
