import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

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

const mockQueryBuilder = {
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(mockUser),
};

const mockOrm = {
  findOne: jest.fn().mockResolvedValue(mockUser),
  findAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
  create: jest.fn().mockReturnValue(mockUser),
  save: jest.fn().mockResolvedValue(mockUser),
  update: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

describe('UsersRepository', () => {
  let repository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: getRepositoryToken(User), useValue: mockOrm },
      ],
    }).compile();

    repository = module.get<UsersRepository>(UsersRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAll()', () => {
    it('should return paginated result', async () => {
      mockOrm.findAndCount.mockResolvedValue([[mockUser], 1]);
      const result = await repository.findAll(1, 10);
      expect(mockOrm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(result.data).toEqual([mockUser]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      mockOrm.findAndCount.mockResolvedValue([[mockUser], 25]);
      const result = await repository.findAll(1, 10);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should skip correct number of records for page 3', async () => {
      mockOrm.findAndCount.mockResolvedValue([[mockUser], 1]);
      await repository.findAll(3, 10);
      expect(mockOrm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findBy()', () => {
    it('should return user by id', async () => {
      mockOrm.findOne.mockResolvedValue(mockUser);
      const result = await repository.findBy({ id: 1 });
      expect(result).toEqual(mockUser);
      expect(mockOrm.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return user by email', async () => {
      mockOrm.findOne.mockResolvedValue(mockUser);
      const result = await repository.findBy({ email: 'test@gmail.com' });
      expect(result).toEqual(mockUser);
      expect(mockOrm.findOne).toHaveBeenCalledWith({
        where: { email: 'test@gmail.com' },
      });
    });

    it('should return null if user not found', async () => {
      mockOrm.findOne.mockResolvedValue(null);
      const result = await repository.findBy({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('findByWithRefreshToken()', () => {
    it('should return user with refreshToken selected', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      const result = await repository.findByWithRefreshToken({ id: 1 });
      expect(result).toEqual(mockUser);
      expect(mockOrm.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'user.refreshToken',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return null if user not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await repository.findByWithRefreshToken({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('findByWithGoogleToken()', () => {
    it('should return user with googleAccessToken selected', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockUser);
      const result = await repository.findByWithGoogleToken({ id: 1 });
      expect(result).toEqual(mockUser);
      expect(mockOrm.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'user.googleAccessToken',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return null if user not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await repository.findByWithGoogleToken({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('findOrCreate()', () => {
    const data = {
      email: 'new@gmail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      picture: '',
      roles: [UserRole.CONSULTANT],
      isActivated: true,
    };

    it('should create new user if not exists', async () => {
      mockOrm.findOne.mockResolvedValue(null);
      mockOrm.create.mockReturnValue({ ...mockUser, email: data.email });
      mockOrm.save.mockResolvedValue({ ...mockUser, email: data.email });

      const result = await repository.findOrCreate(data);
      expect(mockOrm.create).toHaveBeenCalled();
      expect(mockOrm.save).toHaveBeenCalled();
      expect(result.email).toBe(data.email);
    });

    it('should update picture and lastLogin if user exists', async () => {
      mockOrm.findOne.mockResolvedValue({ ...mockUser });
      mockOrm.save.mockResolvedValue({ ...mockUser, picture: 'new_pic.jpg' });

      await repository.findOrCreate({ ...data, picture: 'new_pic.jpg' });
      expect(mockOrm.create).not.toHaveBeenCalled();
      expect(mockOrm.save).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('should update user', async () => {
      mockOrm.findOne.mockResolvedValue({ ...mockUser });
      mockOrm.save.mockResolvedValue({
        ...mockUser,
        roles: [UserRole.ADMIN_RH],
      });

      const updateDto = {
        email: 'updated@gmail.com',
        firstName: 'Jane',
        lastName: 'Smith',
        roles: [UserRole.ADMIN_RH],
        isActivated: true,
      };
      const result = await repository.update(1, updateDto);
      expect(result.roles).toContain(UserRole.ADMIN_RH);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockOrm.findOne.mockResolvedValue(null);
      await expect(
        repository.update(999, {
          email: 'test@gmail.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: [UserRole.ADMIN_RH],
          isActivated: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateActivation()', () => {
    it('should deactivate user', async () => {
      mockOrm.findOne.mockResolvedValue({ ...mockUser });
      mockOrm.save.mockResolvedValue({ ...mockUser, isActivated: false });

      const result = await repository.updateActivation(1, false);
      expect(result.isActivated).toBe(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockOrm.findOne.mockResolvedValue(null);
      await expect(repository.updateActivation(999, false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRefreshToken()', () => {
    it('should update refresh token hash', async () => {
      await repository.updateRefreshToken(1, 'hash');
      expect(mockOrm.update).toHaveBeenCalledWith(1, { refreshToken: 'hash' });
    });

    it('should set refresh token to null on logout', async () => {
      await repository.updateRefreshToken(1, null);
      expect(mockOrm.update).toHaveBeenCalledWith(1, { refreshToken: null });
    });
  });

  describe('updateLastLogin()', () => {
    it('should update lastLogin and picture', async () => {
      await repository.updateLastLogin(1, 'pic.jpg');
      expect(mockOrm.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ picture: 'pic.jpg' }),
      );
      const callArg = (
        mockOrm.update.mock.calls[0] as [
          number,
          { lastLogin: Date; picture: string },
        ]
      )[1];
      expect(callArg.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('updateGoogleAccessToken()', () => {
    it('should update google access token', async () => {
      await repository.updateGoogleAccessToken(1, 'access_token_xyz');
      expect(mockOrm.update).toHaveBeenCalledWith(1, {
        googleAccessToken: 'access_token_xyz',
      });
    });
  });

  describe('updateGoogleRefreshToken()', () => {
    it('should update google refresh token', async () => {
      await repository.updateGoogleRefreshToken(1, 'refresh_token_xyz');
      expect(mockOrm.update).toHaveBeenCalledWith(1, {
        googleRefreshToken: 'refresh_token_xyz',
      });
    });

    it('should set google refresh token to null', async () => {
      await repository.updateGoogleRefreshToken(1, null);
      expect(mockOrm.update).toHaveBeenCalledWith(1, {
        googleRefreshToken: null,
      });
    });
  });

  describe('deleteBy()', () => {
    it('should delete user', async () => {
      mockOrm.findOne.mockResolvedValue(mockUser);
      await repository.deleteBy({ id: 1 });
      expect(mockOrm.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockOrm.findOne.mockResolvedValue(null);
      await expect(repository.deleteBy({ id: 999 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
