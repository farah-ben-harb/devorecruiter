import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    console.log('🔥 WEBHOOK GUARD EXECUTED');

    console.log('=== WEBHOOK DEBUG ===');
console.log('HEADER RAW:', req.headers['x-webhook-secret']);
console.log('HEADER TYPE:', typeof req.headers['x-webhook-secret']);
console.log('EXPECTED:', this.config.get('WEBHOOK_SECRET'));
console.log('MATCH:', req.headers['x-webhook-secret'] === this.config.get('WEBHOOK_SECRET'));

    const secret = req.headers['x-webhook-secret'];
    const expected = this.config.get<string>('WEBHOOK_SECRET');

    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Webhook secret invalide');
    }

    return true;
  }
}