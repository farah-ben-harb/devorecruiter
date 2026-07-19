import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { FindOptionsWhere } from 'typeorm';

//  Typage strict
type MockUsersService = {
  findBy: jest.Mock<Promise<User | null>, [FindOptionsWhere<User>]>;
};

type MockConfigService = {
  getOrThrow: jest.Mock<string, [string]>;
};

// Données mock
const mockUser: User = {
  id: 1,
  email: 'test@gmail.com',
  firstName: 'Test',
  lastName: 'User',
  picture: '',
  roles: [UserRole.CONSULTANT],
  isActivated: true,
  refreshToken: null,
  googleAccessToken: null,
  googleRefreshToken: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  lastLogin: new Date('2026-01-01T00:00:00.000Z'),
};

const mockUsersService: MockUsersService = {
  findBy: jest.fn<Promise<User | null>, [FindOptionsWhere<User>]>(),
};

const mockConfigService: MockConfigService = {
  getOrThrow: jest.fn<string, [string]>().mockReturnValue('mock_secret'),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should call configService.getOrThrow with JWT_SECRET', () => {
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('should return user with undefined googleAccessToken if not provided', async () => {
    mockUsersService.findBy.mockResolvedValueOnce(mockUser);

    const result = await strategy.validate({
      sub: 1,
      roles: ['CONSULTANT'],
    });

    expect(mockUsersService.findBy).toHaveBeenCalledWith({ id: 1 });

    expect(result).toEqual({
      ...mockUser,
      googleAccessToken: undefined,
    });
  });

  it('should include googleAccessToken from jwt payload when present', async () => {
    mockUsersService.findBy.mockResolvedValueOnce(mockUser);

    const result = await strategy.validate({
      sub: 1,
      roles: ['CONSULTANT'],
      googleAccessToken: 'google-token',
    });

    expect(result).toEqual({
      ...mockUser,
      googleAccessToken: 'google-token',
    });
  });

  it('should convert null googleAccessToken to undefined', async () => {
    mockUsersService.findBy.mockResolvedValueOnce(mockUser);

    const result = await strategy.validate({
      sub: 1,
      roles: ['CONSULTANT'],
      googleAccessToken: null,
    });

    expect(result.googleAccessToken).toBeUndefined();
  });

  it('should throw UnauthorizedException if user not found', async () => {
    mockUsersService.findBy.mockResolvedValueOnce(null);

    await expect(
      strategy.validate({ sub: 999, roles: ['CONSULTANT'] }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    mockUsersService.findBy.mockResolvedValueOnce({
      ...mockUser,
      isActivated: false,
    });

    await expect(
      strategy.validate({ sub: 1, roles: ['CONSULTANT'] }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw specific message if user is inactive', async () => {
    mockUsersService.findBy.mockResolvedValueOnce({
      ...mockUser,
      isActivated: false,
    });

    await expect(
      strategy.validate({ sub: 1, roles: ['CONSULTANT'] }),
    ).rejects.toThrow('Compte inactif');
  });
});
