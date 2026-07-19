import { Role } from '@shared/constants/roles.constants';

export interface JwtPayload {
  sub: number;
  email: string;
  roles: Role[];
  firstName: string;
  lastName: string;
  picture: string;
  exp: number;
  googleAccessToken?: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token?: string;
}
