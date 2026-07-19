import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { USERS_REPOSITORY } from '../interfaces/users-repository.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { User } from '../entities/user.entity';

const mockUser: User = {
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

const mockPaginatedResult: PaginatedResult<User> = {
  data: [mockUser],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockUsersRepository = {
  findAll: jest.fn().mockResolvedValue(mockPaginatedResult),
  findBy: jest.fn().mockResolvedValue(mockUser),
  findByWithRefreshToken: jest.fn().mockResolvedValue(mockUser),
  findOrCreate: jest.fn().mockResolvedValue(mockUser),
  create: jest.fn().mockResolvedValue(mockUser),
  update: jest
    .fn()
    .mockResolvedValue({ ...mockUser, roles: [UserRole.ADMIN_RH] }),
  updateActivation: jest
    .fn()
    .mockResolvedValue({ ...mockUser, isActivated: false }),
  updateRefreshToken: jest.fn().mockResolvedValue(undefined),
  updateLastLogin: jest.fn().mockResolvedValue(undefined),
  deleteBy: jest.fn().mockResolvedValue(undefined),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USERS_REPOSITORY, useValue: mockUsersRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return paginated result', async () => {
      mockUsersRepository.findAll.mockResolvedValue(mockPaginatedResult);
      const result = await service.findAll(1, 10);
      expect(result.data).toEqual([mockUser]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(mockUsersRepository.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  // ─── findBy ───────────────────────────────────────────────────────────────

  describe('findBy()', () => {
    it('should return user by id', async () => {
      mockUsersRepository.findBy.mockResolvedValue(mockUser);
      const result = await service.findBy({ id: 1 });
      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return user by email', async () => {
      mockUsersRepository.findBy.mockResolvedValue(mockUser);
      const result = await service.findBy({ email: 'test@gmail.com' });
      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findBy).toHaveBeenCalledWith({
        email: 'test@gmail.com',
      });
    });

    it('should return null if user not found', async () => {
      mockUsersRepository.findBy.mockResolvedValue(null);
      const result = await service.findBy({ id: 999 });
      expect(result).toBeNull();
    });
  });

  // ─── findByWithRefreshToken ───────────────────────────────────────────────

  describe('findByWithRefreshToken()', () => {
    it('should return user with refresh token', async () => {
      mockUsersRepository.findByWithRefreshToken.mockResolvedValue(mockUser);
      const result = await service.findByWithRefreshToken({ id: 1 });
      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findByWithRefreshToken).toHaveBeenCalledWith({
        id: 1,
      });
    });
  });

  // ─── createUser ───────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('should create user if email not exists', async () => {
      mockUsersRepository.findBy.mockResolvedValue(null);
      mockUsersRepository.create.mockResolvedValue(mockUser);

      const result = await service.createUser({
        email: 'new@gmail.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roles: [UserRole.CONSULTANT],
        isActivated: true,
      });

      expect(mockUsersRepository.findBy).toHaveBeenCalledWith({
        email: 'new@gmail.com',
      });
      expect(mockUsersRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersRepository.findBy.mockResolvedValue(mockUser);

      await expect(
        service.createUser({
          email: 'test@gmail.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: [UserRole.CONSULTANT],
          isActivated: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update user', async () => {
      const updateDto = {
        email: 'updated@gmail.com',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: [UserRole.ADMIN_RH],
        isActivated: true,
      };
      const result = await service.update(1, updateDto);
      expect(result.roles).toContain(UserRole.ADMIN_RH);
      expect(mockUsersRepository.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  // ─── updateActivation ─────────────────────────────────────────────────────

  describe('updateActivation()', () => {
    it('should deactivate user', async () => {
      const result = await service.updateActivation(1, false);
      expect(result.isActivated).toBe(false);
    });
  });

  // ─── updateRefreshToken ───────────────────────────────────────────────────

  describe('updateRefreshToken()', () => {
    it('should call repository with null on logout', async () => {
      await service.updateRefreshToken(1, null);
      expect(mockUsersRepository.updateRefreshToken).toHaveBeenCalledWith(
        1,
        null,
      );
    });
  });

  // ─── deleteUser ───────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('should call repository deleteBy', async () => {
      await service.deleteUser(1);
      expect(mockUsersRepository.deleteBy).toHaveBeenCalledWith({ id: 1 });
    });
  });
});
