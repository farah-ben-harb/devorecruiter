import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

export type GoogleAuthenticatedUser = User & { googleAccessToken: string };

export interface RefreshUser {
  userId: number;
  refreshToken: string;
}

export interface AuthRequest extends Request {
  authError?: string;
  user?: GoogleAuthenticatedUser | RefreshUser;
}

export interface AuthToken {
  access_token: string;
  refresh_token: string;
}
