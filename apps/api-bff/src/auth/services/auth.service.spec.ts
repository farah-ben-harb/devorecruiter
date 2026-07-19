import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../services/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { AuthError } from '../../common/enums/auth-error.enum';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUser = {
  id: 1,
  email: 'test@gmail.com',
  firstName: 'John',
  lastName: 'Doe',
  roles: [UserRole.CONSULTANT],
  isActivated: true,
  picture: '',
  refreshToken: null,
  googleAccessToken: null,
  googleRefreshToken: null,
  createdAt: new Date(),
  lastLogin: new Date(),
};

const mockUsersService = {
  findBy: jest.fn(),
  findByWithRefreshToken: jest.fn(),
  updateLastLogin: jest.fn().mockResolvedValue(undefined),
  updateGoogleAccessToken: jest.fn().mockResolvedValue(undefined),
  updateGoogleRefreshToken: jest.fn().mockResolvedValue(undefined),
  updateRefreshToken: jest.fn().mockResolvedValue(undefined),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock_token'),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('mock_secret'),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── validateGoogleUser ───────────────────────────────────────────────────

  describe('validateGoogleUser()', () => {
    it('should throw NOT_FOUND if user does not exist', async () => {
      mockUsersService.findBy.mockResolvedValue(null);

      await expect(
        service.validateGoogleUser('unknown@gmail.com', '', 'mock_token'),
      ).rejects.toThrow(AuthError.NOT_FOUND);
    });

    it('should throw INACTIVE if user is not activated', async () => {
      mockUsersService.findBy.mockResolvedValue({
        ...mockUser,
        isActivated: false,
      });

      await expect(
        service.validateGoogleUser('test@gmail.com', '', 'mock_token'),
      ).rejects.toThrow(AuthError.INACTIVE);
    });

    it('should return user with googleAccessToken if valid', async () => {
      mockUsersService.findBy.mockResolvedValue(mockUser);

      const result = await service.validateGoogleUser(
        'test@gmail.com',
        'pic.jpg',
        'mock_google_token',
      );

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        picture: 'pic.jpg',
        googleAccessToken: 'mock_google_token',
      });
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id,
        'pic.jpg',
      );
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('should return access_token and refresh_token', async () => {
      mockJwtService.signAsync.mockResolvedValue('mock_token');

      const result = await service.login({
        ...mockUser,
        googleAccessToken: undefined,
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });

  // ─── refreshToken ─────────────────────────────────────────────────────────

  describe('refreshToken()', () => {
    it('should throw ForbiddenException if user not found', async () => {
      mockUsersService.findByWithRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken(1, 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if refreshToken is null', async () => {
      mockUsersService.findByWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(service.refreshToken(1, 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException and revoke token if token does not match', async () => {
      const hash = await bcrypt.hash('correct_token', 10);
      mockUsersService.findByWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshToken: hash,
      });

      await expect(service.refreshToken(1, 'wrong_token')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(1, null);
    });

    it('should return new tokens if refresh token matches', async () => {
      const plainToken = 'valid_refresh_token';
      const hash = await bcrypt.hash(plainToken, 10);
      mockUsersService.findByWithRefreshToken.mockResolvedValue({
        ...mockUser,
        refreshToken: hash,
      });
      mockJwtService.signAsync.mockResolvedValue('new_token');

      const result = await service.refreshToken(1, plainToken);

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('should revoke refresh token', async () => {
      await service.logout(1);
      expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(1, null);
    });
  });
});
