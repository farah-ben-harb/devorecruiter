import { UnauthorizedException } from '@nestjs/common';
import type {
  AuthRequest,
  GoogleAuthenticatedUser,
} from '../../auth/interfaces/auth.interface';

export const getGoogleAuthenticatedUser = (
  req: AuthRequest,
): GoogleAuthenticatedUser | undefined => {
  const user = req.user as GoogleAuthenticatedUser | undefined;
  if (!user?.id) {
    return undefined;
  }
  return user;
};

export const requireGoogleAuthenticatedUser = (
  req: AuthRequest,
): GoogleAuthenticatedUser => {
  const user = getGoogleAuthenticatedUser(req);
  if (!user?.googleAccessToken) {
    throw new UnauthorizedException('Non authentifie');
  }
  return user;
};

export const hasGoogleAccessToken = (req: AuthRequest): boolean =>
  Boolean(getGoogleAuthenticatedUser(req)?.googleAccessToken);

export const requireGoogleAccessToken = (
  req: AuthRequest,
  createError: () => Error = () => new UnauthorizedException('Non authentifie'),
): GoogleAuthenticatedUser => {
  const user = getGoogleAuthenticatedUser(req);
  if (!user?.googleAccessToken) {
    throw createError();
  }
  return user;
};
