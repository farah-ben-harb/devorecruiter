import { Test, TestingModule } from '@nestjs/testing';
import { JwtRefreshStrategy } from '../strategies/jwt-refresh.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum';

type MockConfigService = {
  getOrThrow: jest.Mock<string, [string]>;
};

type JwtRefreshPayload = {
  sub: number;
  email: string;
  roles: string[];
};

type RequestWithCookies = Request & {
  cookies?: {
    refresh_token?: string;
  };
};

const mockConfigService: MockConfigService = {
  getOrThrow: jest
    .fn<string, [string]>()
    .mockReturnValue('mock_refresh_secret'),
};

const mockPayload: JwtRefreshPayload = {
  sub: 1,
  email: 'test@gmail.com',
  roles: [UserRole.CONSULTANT],
};

const buildRequest = (cookieToken?: string): Request => {
  const req: Partial<RequestWithCookies> = {
    headers: {},
  };

  if (cookieToken !== undefined) {
    req.cookies = { refresh_token: cookieToken };
  }

  return req as Request;
};

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtRefreshStrategy>(JwtRefreshStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should call configService.getOrThrow with JWT_REFRESH_SECRET', () => {
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
      'JWT_REFRESH_SECRET',
    );
  });

  // ─── validate ─────────────────────────────────────────────────────────────

  describe('validate()', () => {
    it('should return userId and refreshToken when the cookie is present', () => {
      const req = buildRequest('valid_refresh_token');

      const result = strategy.validate(req, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        refreshToken: 'valid_refresh_token',
      });
    });

    it('should throw UnauthorizedException if no refresh cookie is present', () => {
      const req = buildRequest();

      expect(() => strategy.validate(req, mockPayload)).toThrow(
        UnauthorizedException,
      );
    });

    it('should return correct userId from payload.sub', () => {
      const req = buildRequest('some_token');

      const result = strategy.validate(req, { ...mockPayload, sub: 42 });

      expect(result).toMatchObject({ userId: 42 });
    });

    it('should read refresh token from cookie when present', () => {
      const req = buildRequest('cookie_refresh_token');

      const result = strategy.validate(req, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        refreshToken: 'cookie_refresh_token',
      });
    });

    it('should reject an empty refresh cookie', () => {
      const req = buildRequest('');

      expect(() => strategy.validate(req, mockPayload)).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject a refresh token sent only in the authorization header', () => {
      const req = {
        headers: { authorization: 'Bearer header_refresh_token' },
      } as Request;

      expect(() => strategy.validate(req, mockPayload)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
