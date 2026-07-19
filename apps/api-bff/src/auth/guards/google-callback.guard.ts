import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface RequestWithAuthError {
  authError?: string;
}

@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleCallbackGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAuthError>();

    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (err) {
      this.logger.warn(`canActivate error: ${err}`);
      if (err instanceof Error) {
        req.authError = err.message;
      } else if (typeof err === 'string') {
        req.authError = err;
      }
      return true;
    }
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser | null {
    const req = context.switchToHttp().getRequest<RequestWithAuthError>();

    if (err) {
      this.logger.warn(`handleRequest error: ${err.message}`);
      req.authError = err instanceof Error ? err.message : String(err);
      return null;
    }

    if (!user) return null;
    return user as TUser;
  }
}
