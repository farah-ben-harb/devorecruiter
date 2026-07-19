import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { id?: number; email?: string; roles?: string[] };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url } = request;
    const user = request.user;
    const userId = user?.id ?? 'anonymous';
    const userEmail = user?.email ?? 'anonymous';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(
          `[${method}] ${url} | user: ${userEmail} (id: ${userId}) | ${duration}ms`,
        );
      }),
    );
  }
}
