import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import type { CookieOptions, Response } from 'express';
import { GoogleCallbackGuard } from '../guards/google-callback.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CsrfOriginGuard } from '../guards/csrf-origin.guard';
import type {
  AuthToken,
  AuthRequest,
  GoogleAuthenticatedUser,
  RefreshUser,
} from '../interfaces/auth.interface';
import { User } from '../../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Redirection vers la page de connexion Google OAuth2',
  })
  @ApiResponse({ status: 302, description: 'Redirection vers Google OAuth2.' })
  googleLogin(): void {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  @ApiOperation({ summary: 'Callback Google OAuth2 après authentification' })
  @ApiResponse({
    status: 302,
    description: 'Redirection vers le frontend après création de session.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirection vers le frontend avec une erreur.',
  })
  async googleCallback(
    @Req() req: AuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    if (!req.user) {
      const callbackErrors = new Set(['inactive', 'not_found', 'not_devoteam']);
      const authError = req.authError;
      const message =
        authError && callbackErrors.has(authError) ? authError : 'unauthorized';
      this.logger.warn(`Auth échouée : ${message}`);
      res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(message)}`,
      );
      return;
    }

    const { refresh_token } = await this.authService.login(
      req.user as GoogleAuthenticatedUser,
    );
    res.cookie('refresh_token', refresh_token, this.getRefreshCookieOptions());
    res.redirect(`${frontendUrl}/auth/callback`);
  }

  @Post('refresh')
  @UseGuards(CsrfOriginGuard, AuthGuard('jwt-refresh'))
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Rafraîchir le token JWT via le refresh token (cookie)',
  })
  @ApiResponse({
    status: 201,
    description: 'Nouveau token JWT retourné.',
    schema: { example: { access_token: 'jwt-access-token-example' } },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalide ou expiré.',
  })
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Pick<AuthToken, 'access_token'>> {
    const { userId, refreshToken } = req.user as RefreshUser;
    const tokens = await this.authService.refreshToken(userId, refreshToken);
    res.cookie(
      'refresh_token',
      tokens.refresh_token,
      this.getRefreshCookieOptions(),
    );
    return { access_token: tokens.access_token };
  }

  @Post('logout')
  @UseGuards(CsrfOriginGuard, JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: "Déconnecter l'utilisateur et invalider le refresh token",
  })
  @ApiResponse({
    status: 201,
    description: 'Déconnexion réussie.',
    schema: { example: { message: 'Déconnecté avec succès' } },
  })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const user = req.user as User;
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token', this.getRefreshCookieOptions());
    return { message: 'Déconnecté avec succès' };
  }

  private getRefreshCookieOptions(): CookieOptions {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const configuredSecure =
      this.configService.get<boolean>('AUTH_COOKIE_SECURE');
    const sameSite =
      this.configService.get<'lax' | 'strict' | 'none'>(
        'AUTH_COOKIE_SAMESITE',
      ) ?? 'lax';

    return {
      httpOnly: true,
      secure: configuredSecure ?? isProduction,
      sameSite,
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}
