import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '@nestjs/config';
import type { AuthRequest } from '../interfaces/auth.interface';
import type { Response } from 'express';

/* eslint-disable @typescript-eslint/unbound-method */
const mockAuthService = {
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('http://localhost:4200'),
  get: jest.fn((key: string) => {
    switch (key) {
      case 'NODE_ENV':
        return 'development';
      case 'AUTH_COOKIE_SAMESITE':
        return 'lax';
      case 'AUTH_COOKIE_SECURE':
        return undefined;
      default:
        return undefined;
    }
  }),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('refresh()', () => {
    it('should rotate the refresh cookie and return only the access token', async () => {
      const req = {
        user: { userId: 1, refreshToken: 'token' },
      } as unknown as AuthRequest;
      const res = { cookie: jest.fn() } as unknown as Response;

      mockAuthService.refreshToken.mockResolvedValue({
        access_token: 'new_token',
        refresh_token: 'new_refresh',
      });

      const result = await controller.refresh(req, res);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(1, 'token');
      expect(result).toEqual({ access_token: 'new_token' });
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new_refresh',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          path: '/auth/refresh',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
    });
  });

  describe('googleCallback()', () => {
    it('should set the refresh cookie and redirect without tokens in the URL', async () => {
      const req = {
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          picture: '',
          roles: ['CONSULTANT'],
        },
      } as unknown as AuthRequest;

      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      mockAuthService.login.mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });

      await controller.googleCallback(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/auth/refresh',
        }),
      );

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:4200/auth/callback',
      );
    });

    it('uses a safe generic error code for unexpected OAuth failures', async () => {
      const req = {
        authError: 'provider error containing sensitive details',
      } as unknown as AuthRequest;
      const res = { redirect: jest.fn() } as unknown as Response;

      await controller.googleCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:4200/auth/callback?error=unauthorized',
      );
    });

    it('marks the refresh cookie as secure in production', async () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'AUTH_COOKIE_SAMESITE') return 'lax';
        if (key === 'AUTH_COOKIE_SECURE') return true;
        return undefined;
      });

      const req = {
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          picture: '',
          roles: ['CONSULTANT'],
        },
      } as unknown as AuthRequest;
      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      mockAuthService.login.mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });

      await controller.googleCallback(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({ secure: true }),
      );
    });

    it('never includes tokens in the callback URL', async () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'AUTH_COOKIE_SAMESITE') return 'lax';
        if (key === 'AUTH_COOKIE_SECURE') return undefined;
        return undefined;
      });

      const req = {
        user: {
          id: 1,
          email: 'user@example.com',
          firstName: 'John',
          lastName: 'Doe',
          picture: '',
          roles: ['CONSULTANT'],
        },
      } as unknown as AuthRequest;

      const res = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      } as unknown as Response;

      mockAuthService.login.mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });

      await controller.googleCallback(req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:4200/auth/callback',
      );
    });
  });

  describe('logout()', () => {
    it('should call logout with user id', async () => {
      const req = {
        user: { id: 1 },
      } as unknown as AuthRequest;

      const res = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req, res);

      expect(mockAuthService.logout).toHaveBeenCalledWith(1);
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/auth/refresh' }),
      );
      expect(result).toEqual({ message: 'Déconnecté avec succès' });
    });
  });
});
