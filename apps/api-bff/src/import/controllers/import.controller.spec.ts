import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ImportController } from './import.controller';
import { ImportService } from '../services/import.service';
import { UsersService } from '../../users/services/users.service';
import { UserRole } from '../../common/enums/user-role.enum';

const mockImportService = () => ({
  parseUsersFromExcel: jest.fn(),
});

const mockUsersService = () => ({
  createUser: jest.fn(),
});

describe('ImportController', () => {
  let controller: ImportController;
  let importService: jest.Mocked<ReturnType<typeof mockImportService>>;
  let usersService: jest.Mocked<ReturnType<typeof mockUsersService>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [
        { provide: ImportService, useFactory: mockImportService },
        { provide: UsersService, useFactory: mockUsersService },
      ],
    }).compile();

    controller = module.get(ImportController);
    importService = module.get(ImportService);
    usersService = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('throws when file is missing', async () => {
    await expect(controller.importUsers(undefined as never)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('imports valid users and counts ignored rows', async () => {
    importService.parseUsersFromExcel.mockResolvedValue({
      valid: [
        {
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Martin',
          roles: [UserRole.ADMIN_RH],
          isActivated: true,
        },
        {
          email: 'bob@example.com',
          firstName: 'Bob',
          lastName: 'Dupont',
          roles: [UserRole.CONSULTANT],
          isActivated: false,
        },
      ],
      errors: ['Ligne 3 : prénom manquant'],
    });
    usersService.createUser.mockResolvedValue(undefined as never);

    const result = await controller.importUsers({
      buffer: Buffer.from('xlsx'),
    } as Express.Multer.File);

    expect(importService.parseUsersFromExcel).toHaveBeenCalledWith(
      expect.any(Buffer),
    );
    expect(usersService.createUser).toHaveBeenNthCalledWith(1, {
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      roles: [UserRole.ADMIN_RH],
      isActivated: true,
    });
    expect(usersService.createUser).toHaveBeenNthCalledWith(2, {
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Dupont',
      roles: [UserRole.CONSULTANT],
      isActivated: false,
    });
    expect(result).toEqual({
      added: 2,
      ignored: 0,
      errors: ['Ligne 3 : prénom manquant'],
    });
  });

  it('increments ignored when createUser fails', async () => {
    importService.parseUsersFromExcel.mockResolvedValue({
      valid: [
        {
          email: 'alice@example.com',
          firstName: 'Alice',
          lastName: 'Martin',
          roles: [UserRole.ADMIN_RH],
          isActivated: true,
        },
      ],
      errors: [],
    });
    usersService.createUser.mockRejectedValueOnce(new Error('duplicate'));

    const result = await controller.importUsers({
      buffer: Buffer.from('xlsx'),
    } as Express.Multer.File);

    expect(result).toEqual({ added: 0, ignored: 1, errors: [] });
  });
});
