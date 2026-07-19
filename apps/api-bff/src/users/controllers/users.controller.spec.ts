import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaginateQueryDto } from '../../common/dtos/paginate-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import type { Request } from 'express';

const mockUser: User = {
  id: 1,
  email: 'test@gmail.com',
  firstName: 'John',
  lastName: 'Doe',
  roles: [UserRole.CONSULTANT],
  isActivated: true,
  picture: 'admin.jpg',
  refreshToken: null,
  googleAccessToken: null,
  googleRefreshToken: null,
  createdAt: new Date(),
  lastLogin: new Date(),
};

const mockOtherUser: User = {
  id: 2,
  email: 'other@gmail.com',
  firstName: 'Jane',
  lastName: 'Smith',
  roles: [UserRole.CONSULTANT],
  isActivated: true,
  picture: 'user.jpg',
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

const mockUsersService = {
  findAll: jest.fn().mockResolvedValue(mockPaginatedResult),
  createUser: jest.fn().mockResolvedValue(mockUser),
  update: jest
    .fn()
    .mockResolvedValue({ ...mockUser, roles: [UserRole.ADMIN_RH] }),
  updateActivation: jest
    .fn()
    .mockResolvedValue({ ...mockUser, isActivated: false }),
  deleteUser: jest.fn().mockResolvedValue(undefined),
};

type RequestWithUser = Request & { user: User };

const mockRequest = (userId: number): RequestWithUser =>
  ({
    user: { ...mockUser, id: userId },
  }) as RequestWithUser;

const buildRequest = (user: User): RequestWithUser =>
  ({
    user,
  }) as RequestWithUser;

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll()', () => {
    it('should return paginated result', async () => {
      mockUsersService.findAll.mockResolvedValue(mockPaginatedResult);

      const query: PaginateQueryDto = { page: 1, limit: 10 };
      const result = await controller.findAll(query);

      expect(mockUsersService.findAll).toHaveBeenCalledWith(
        query.page,
        query.limit,
      );
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('createUser()', () => {
    it('should create and return a user', async () => {
      const dto = {
        email: 'new@gmail.com',
        firstName: 'Jane',
        lastName: 'Doe',
        roles: [UserRole.CONSULTANT],
        isActivated: true,
      };

      mockUsersService.createUser.mockResolvedValue(mockOtherUser);

      const result = await controller.createUser(dto);

      expect(mockUsersService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockOtherUser);
    });
  });

  describe('updateUser()', () => {
    it('should update another user', async () => {
      const req = mockRequest(99);
      const dto = {
        email: 'updated@gmail.com',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: [UserRole.ADMIN_RH],
        isActivated: true,
      };

      const result = await controller.updateUser(1, dto, req);

      expect(result.roles).toContain(UserRole.ADMIN_RH);
      expect(mockUsersService.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw BadRequestException if updating own account', () => {
      const req = mockRequest(1);
      const dto = {
        email: 'updated@gmail.com',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: [UserRole.ADMIN_RH],
        isActivated: true,
      };

      expect(() => controller.updateUser(1, dto, req)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateActivation()', () => {
    it('should deactivate another user', async () => {
      const req = mockRequest(99);
      const dto = { isActivated: false };

      const result = await controller.updateActivation(1, dto, req);

      expect(result.isActivated).toBe(false);
      expect(mockUsersService.updateActivation).toHaveBeenCalledWith(1, false);
    });

    it('should throw BadRequestException if deactivating own account', () => {
      const req = mockRequest(1);
      const dto = { isActivated: false };

      expect(() => controller.updateActivation(1, dto, req)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('deleteUser()', () => {
    it('should delete another user', async () => {
      mockUsersService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser(mockOtherUser.id, buildRequest(mockUser));

      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(
        mockOtherUser.id,
      );
    });

    it('should throw BadRequestException when deleting own account', () => {
      expect(() =>
        controller.deleteUser(mockUser.id, buildRequest(mockUser)),
      ).toThrow(BadRequestException);

      expect(mockUsersService.deleteUser).not.toHaveBeenCalled();
    });
  });
});
