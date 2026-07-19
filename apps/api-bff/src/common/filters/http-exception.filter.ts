import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erreur interne du serveur';
    const { message, error } = this.normalizeErrorPayload(
      errorResponse,
      status,
    );

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalizeErrorPayload(
    payload: string | object,
    status: number,
  ): { message: string | string[]; error: string } {
    if (typeof payload === 'string') {
      return { message: payload, error: HttpStatus[status] ?? 'Error' };
    }

    const response = payload as {
      message?: string | string[];
      error?: string;
    };

    return {
      message: response.message ?? 'Erreur interne du serveur',
      error: response.error ?? HttpStatus[status] ?? 'Error',
    };
  }
}
