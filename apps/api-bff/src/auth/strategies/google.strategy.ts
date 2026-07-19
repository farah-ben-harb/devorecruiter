import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { AuthError } from '../../common/enums/auth-error.enum';
import { User } from '../../users/entities/user.entity';

export type GoogleAuthenticatedUser = User & { googleAccessToken: string };

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/drive'],
      passReqToCallback: false,
    });
  }
  override authorizationParams(
    options: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      ...options,
      access_type: 'offline',
    };
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    const picture = profile.photos?.[0]?.value ?? '';

    if (!email) {
      return done(new Error(AuthError.NO_EMAIL), false);
    }

    try {
      const user = await this.authService.validateGoogleUser(
        email,
        picture,
        accessToken,
        refreshToken,
      );

      const googleUser = {
        ...user,
        googleAccessToken: accessToken,
      } as GoogleAuthenticatedUser;

      done(null, googleUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Auth échouée pour ${email} : ${message}`);
      done(new Error(message), false);
    }
  }
}
