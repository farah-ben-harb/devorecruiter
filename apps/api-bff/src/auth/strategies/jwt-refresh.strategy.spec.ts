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

const buildRequest = (params?: {
  headerToken?: string;
  rawAuthorization?: string;
  cookieToken?: string;
}): Request => {
  const authorization =
    params?.rawAuthorization ??
    (params?.headerToken !== undefined
      ? `Bearer ${params.headerToken}`
      : undefined);

  const req: Partial<RequestWithCookies> = {
    headers: {
      authorization,
    },
  };

  if (params?.cookieToken !== undefined) {
    req.cookies = { refresh_token: params.cookieToken };
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
    it('should return userId and refreshToken if token is present', () => {
      const req = buildRequest({ headerToken: 'valid_refresh_token' });

      const result = strategy.validate(req, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        refreshToken: 'valid_refresh_token',
      });
    });

    it('should throw UnauthorizedException if no authorization header', () => {
      const req = buildRequest();

      expect(() => strategy.validate(req, mockPayload)).toThrow(
        UnauthorizedException,
      );
    });

    it('should extract token correctly after removing Bearer prefix', () => {
      const req = buildRequest({ headerToken: 'my_token_123' });

      const result = strategy.validate(req, mockPayload);

      expect(result).toMatchObject({ refreshToken: 'my_token_123' });
    });

    it('should return correct userId from payload.sub', () => {
      const req = buildRequest({ headerToken: 'some_token' });

      const result = strategy.validate(req, { ...mockPayload, sub: 42 });

      expect(result).toMatchObject({ userId: 42 });
    });

    it('should read refresh token from cookie when present', () => {
      const req = buildRequest({ cookieToken: 'cookie_refresh_token' });

      const result = strategy.validate(req, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        refreshToken: 'cookie_refresh_token',
      });
    });

    it('should prioritize cookie token over authorization header', () => {
      const req = buildRequest({
        cookieToken: 'cookie_refresh_token',
        headerToken: 'header_refresh_token',
      });

      const result = strategy.validate(req, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        refreshToken: 'cookie_refresh_token',
      });
    });

    it('should fallback to authorization header when cookie token is empty', () => {
      const req = buildRequest({
        cookieToken: '',
        headerToken: 'header_refresh_token',
      });

      const result = strategy.validate(req, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        refreshToken: 'header_refresh_token',
      });
    });

    it('should throw UnauthorizedException when token is an empty Bearer value', () => {
      const req = buildRequest({ rawAuthorization: 'Bearer ' });

      expect(() => strategy.validate(req, mockPayload)).toThrow(
        UnauthorizedException,
      );
    });

    it('should keep raw authorization value when Bearer prefix is absent', () => {
      const req = buildRequest({ rawAuthorization: 'raw_refresh_token' });

      const result = strategy.validate(req, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        refreshToken: 'raw_refresh_token',
      });
    });
  });
});
