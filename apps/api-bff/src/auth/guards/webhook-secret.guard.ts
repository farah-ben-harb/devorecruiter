import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const secret = req.headers['x-webhook-secret'];
    const expected = this.config.get<string>('WEBHOOK_SECRET');

    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Webhook secret invalide');
    }

    return true;
  }
}
