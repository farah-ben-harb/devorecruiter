import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { isAllowedOrigin } from '../../common/http/origin.util';

@Injectable()
export class CsrfOriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const requestOrigin = this.getRequestOrigin(request);

    // Non-browser clients may not send Origin or Referer. Browser requests do.
    if (!requestOrigin) return true;

    const configuredOrigins = this.configService
      .getOrThrow<string>('CORS_ORIGIN')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';

    if (!isAllowedOrigin(requestOrigin, configuredOrigins, isDevelopment)) {
      throw new ForbiddenException('Origine de requête non autorisée');
    }

    return true;
  }

  private getRequestOrigin(request: Request): string | null {
    const origin = this.getHeader(request.headers.origin);
    if (origin) return origin;

    const referer = this.getHeader(request.headers.referer);
    if (!referer) return null;

    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  private getHeader(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }
}
