import {
  Injectable,
  Logger,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/services/users.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthToken } from '../interfaces/auth.interface';
import { AuthError } from '../../common/enums/auth-error.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async validateGoogleUser(
    email: string,
    picture: string,
    googleAccessToken: string,
    googleRefreshToken?: string,
  ): Promise<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    roles: UserRole[];
    isActivated: boolean;
    googleAccessToken?: string;
  }> {
    const user = await this.usersService.findBy({ email });

    if (!user) {
      throw new UnauthorizedException(AuthError.NOT_FOUND);
    }

    if (!user.isActivated) {
      throw new ForbiddenException(AuthError.INACTIVE);
    }

    await this.usersService.updateLastLogin(user.id, picture);
    await this.usersService.updateGoogleAccessToken(user.id, googleAccessToken);
    if (googleRefreshToken) {
      await this.usersService.updateGoogleRefreshToken(
        user.id,
        googleRefreshToken,
      );
    }

    return { ...user, picture, googleAccessToken };
  }

  async login(user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    roles: UserRole[];
    googleAccessToken?: string;
  }): Promise<AuthToken> {
    this.logger.log(`Login réussi : ${user.email}`);

    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture ?? '',
      googleAccessToken: user.googleAccessToken ?? null,
    };

    return this.generateToken(user.id, payload);
  }

  async refreshToken(userId: number, refreshToken: string): Promise<AuthToken> {
    const user = await this.usersService.findByWithRefreshToken({ id: userId });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Accès refusé');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!tokenMatches) {
      await this.usersService.updateRefreshToken(userId, null);
      this.logger.warn(`Token reuse détecté pour user ${userId}`);
      throw new ForbiddenException('Accès refusé — token compromis');
    }

    const payload: Record<string, unknown> = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.firstName,
      lastName: user.lastName,
      picture: user.picture ?? '',
      googleAccessToken: user.googleAccessToken ?? null,
    };

    return this.generateToken(user.id, payload);
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
    this.logger.log(`User ${userId} déconnecté`);
  }

  private async generateToken(
    userId: number,
    payload: Record<string, unknown>,
  ): Promise<AuthToken> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '24h',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    const hash = await bcrypt.hash(refresh_token, 10);
    await this.usersService.updateRefreshToken(userId, hash);

    return { access_token, refresh_token };
  }
}
