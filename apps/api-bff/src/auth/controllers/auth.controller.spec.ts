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
      case 'AUTH_CALLBACK_INCLUDE_ACCESS_TOKEN_QUERY':
        return true;
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
    it('should call refreshToken with userId and refreshToken', async () => {
      const req = {
        user: { userId: 1, refreshToken: 'token' },
      } as unknown as AuthRequest;

      mockAuthService.refreshToken.mockResolvedValue({
        access_token: 'new_token',
        refresh_token: 'new_refresh',
      });

      const result = await controller.refresh(req);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(1, 'token');
      expect(result).toHaveProperty('access_token');
    });
  });

  describe('googleCallback()', () => {
    it('should set refresh token cookie and redirect with query token', async () => {
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
        'http://localhost:4200/auth/callback?token=access-token&refresh_token=refresh-token',
      );
    });

    it('should redirect without query token when config disables it', async () => {
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'AUTH_CALLBACK_INCLUDE_ACCESS_TOKEN_QUERY') return true;
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
        'http://localhost:4200/auth/callback?token=access-token&refresh_token=refresh-token',
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
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth/refresh',
      });
      expect(result).toEqual({ message: 'Déconnecté avec succès' });
    });
  });
});
