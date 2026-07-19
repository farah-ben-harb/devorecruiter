import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';

type JwtPayload = {
  sub: number;
  roles: string[];
  googleAccessToken?: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findBy({ id: payload.sub });
    if (!user) throw new UnauthorizedException();
    if (!user.isActivated) throw new UnauthorizedException('Compte inactif');

    return {
      ...user,
      googleAccessToken: payload.googleAccessToken ?? undefined,
    };
  }
}
