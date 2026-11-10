import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => JwtRefreshStrategy.extractRefreshToken(req),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: { sub: number; email: string; roles: string[] },
  ) {
    const refreshToken = JwtRefreshStrategy.extractRefreshToken(req);
    if (!refreshToken) throw new UnauthorizedException();

    return { userId: payload.sub, refreshToken };
  }

  private static extractRefreshToken(req: Request): string | null {
    const cookies = (req as { cookies?: unknown }).cookies;
    const refreshToken =
      cookies && typeof cookies === 'object'
        ? (cookies as { refresh_token?: unknown }).refresh_token
        : undefined;

    return typeof refreshToken === 'string' && refreshToken.length > 0
      ? refreshToken
      : null;
  }
}
