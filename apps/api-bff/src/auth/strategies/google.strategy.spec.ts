import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from '../services/auth.service';
import { AuthError } from '../../common/enums/auth-error.enum';
import type { Profile, VerifyCallback } from 'passport-google-oauth20';
import type { GoogleAuthenticatedUser } from './google.strategy';
import { UserRole } from '../../common/enums/user-role.enum';

// Mock propre de passport strategy
jest.mock('passport-google-oauth20', () => ({
  Strategy: class {
    constructor(options: Record<string, string | string[]>) {
      void options;
    }
  },
}));

type MockConfigService = {
  getOrThrow: jest.Mock<string, [string]>;
};

const mockConfigService: MockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const config: Record<string, string> = {
      GOOGLE_CLIENT_ID: 'mock-client-id',
      GOOGLE_CLIENT_SECRET: 'mock-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/auth/google/callback',
    };

    const value = config[key];
    if (!value) {
      throw new Error(`Missing config key: ${key}`);
    }

    return value;
  }),
};

type MockAuthService = {
  validateGoogleUser: jest.Mock;
};

const mockAuthService: MockAuthService = {
  validateGoogleUser: jest.fn(),
};

// Helpers
const buildProfile = (overrides?: Partial<Profile>): Profile => ({
  id: 'google-id-123',
  displayName: 'Test User',
  emails: [{ value: 'test@example.com', verified: true }],
  photos: [{ value: 'https://example.com/photo.jpg' }],
  provider: 'google',
  profileUrl: 'https://example.com/profile',
  _raw: '',
  _json: {} as Profile['_json'],
  ...overrides,
});

const buildMockUser = (
  overrides?: Partial<Omit<GoogleAuthenticatedUser, 'googleAccessToken'>>,
): Omit<GoogleAuthenticatedUser, 'googleAccessToken'> => ({
  id: 1,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  picture: 'https://example.com/photo.jpg',
  roles: [UserRole.TALENT_ACQUISITION],
  isActivated: true,
  refreshToken: null,
  googleRefreshToken: null,
  createdAt: new Date(),
  lastLogin: new Date(),
  ...overrides,
});

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should call configService.getOrThrow for required keys', () => {
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
        'GOOGLE_CLIENT_ID',
      );
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
        'GOOGLE_CLIENT_SECRET',
      );
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
        'GOOGLE_CALLBACK_URL',
      );
    });
  });

  describe('authorizationParams', () => {
    it('should add access_type offline', () => {
      const result = strategy.authorizationParams({});
      expect(result).toEqual({ access_type: 'offline' });
    });
  });

  describe('validate', () => {
    const accessToken = 'mock-access-token';
    const refreshToken = 'mock-refresh-token';

    it('should call done with authenticated user on success', async () => {
      const profile = buildProfile();
      const done: VerifyCallback = jest.fn();

      const mockUser = buildMockUser();
      mockAuthService.validateGoogleUser.mockResolvedValueOnce(mockUser);

      await strategy.validate(accessToken, refreshToken, profile, done);

      expect(mockAuthService.validateGoogleUser).toHaveBeenCalledWith(
        'test@example.com',
        'https://example.com/photo.jpg',
        accessToken,
        refreshToken,
      );

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          ...mockUser,
          googleAccessToken: accessToken,
        }),
      );
    });

    it('should use empty string for picture if photos missing', async () => {
      const profile = buildProfile({ photos: undefined });
      const done: VerifyCallback = jest.fn();

      const mockUser = buildMockUser({ picture: '' });
      mockAuthService.validateGoogleUser.mockResolvedValueOnce(mockUser);

      await strategy.validate(accessToken, refreshToken, profile, done);

      expect(mockAuthService.validateGoogleUser).toHaveBeenCalledWith(
        'test@example.com',
        '',
        accessToken,
        refreshToken,
      );
    });

    it('should call done with NO_EMAIL error if emails missing', async () => {
      const profile = buildProfile({ emails: undefined });
      const done: VerifyCallback = jest.fn();

      await strategy.validate(accessToken, refreshToken, profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: AuthError.NO_EMAIL,
        }),
        false,
      );

      expect(mockAuthService.validateGoogleUser).not.toHaveBeenCalled();
    });

    it('should call done with NO_EMAIL error if emails empty', async () => {
      const profile = buildProfile({ emails: [] });
      const done: VerifyCallback = jest.fn();

      await strategy.validate(accessToken, refreshToken, profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: AuthError.NO_EMAIL,
        }),
        false,
      );

      expect(mockAuthService.validateGoogleUser).not.toHaveBeenCalled();
    });

    it('should call done with error message if authService throws', async () => {
      const profile = buildProfile();
      const done: VerifyCallback = jest.fn();

      mockAuthService.validateGoogleUser.mockRejectedValueOnce(
        new Error('User not allowed'),
      );

      await strategy.validate(accessToken, refreshToken, profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not allowed',
        }),
        false,
      );
    });

    it('should attach googleAccessToken to authenticated user', async () => {
      const profile = buildProfile();
      const done: VerifyCallback = jest.fn();

      const mockUser = buildMockUser();
      mockAuthService.validateGoogleUser.mockResolvedValueOnce(mockUser);

      await strategy.validate('special-token', refreshToken, profile, done);

      expect(done).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          googleAccessToken: 'special-token',
        }),
      );
    });
  });
});
