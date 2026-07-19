import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { UsersFacade } from './users.facade';
import { UsersService } from '../services/users.service';
import { AuthService } from '@modules/auth/services/auth.service';
import { ROLES } from '@shared/constants/roles.constants';
import type { User, AddUserDto, PaginatedResult } from '../models/user.model';

describe('UsersFacade', () => {
  let facade: UsersFacade;

  let usersServiceMock: {
    getAll: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateActivation: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  let authServiceMock: { getRoles: ReturnType<typeof vi.fn> };

  const user1: User = {
    id: 1,
    email: 'alice@gmail.com',
    firstName: 'Alice',
    lastName: 'Doe',
    picture: '',
    roles: [ROLES.ADMIN_RH],
    isActivated: true,
    createdAt: '2026-01-01',
    lastLogin: '2026-01-10',
  };

  const user2: User = {
    id: 2,
    email: 'bob@gmail.com',
    firstName: 'Bob',
    lastName: 'Smith',
    picture: '',
    roles: [ROLES.CONSULTANT],
    isActivated: false,
    createdAt: '2026-01-02',
    lastLogin: '2026-01-11',
  };

  beforeEach(() => {
    usersServiceMock = {
      getAll: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      updateActivation: vi.fn(),
      delete: vi.fn(),
    };
    authServiceMock = {
      getRoles: vi.fn().mockReturnValue([ROLES.ADMIN_RH]),
    };

    TestBed.configureTestingModule({
      providers: [
        UsersFacade,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });
    facade = TestBed.inject(UsersFacade);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('init() loads users and sets currentUserRole', () => {
    const response: PaginatedResult = {
      data: [user1, user2],
      meta: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    };

    usersServiceMock.getAll.mockReturnValue(of(response));

    facade.init();

    expect(authServiceMock.getRoles).toHaveBeenCalledTimes(1);
    expect(usersServiceMock.getAll).toHaveBeenCalledTimes(1);
    expect(facade.currentUserRole()).toEqual([ROLES.ADMIN_RH]);
    expect(facade.users()).toEqual([user1, user2]);
    expect(facade.filteredUsers()).toEqual([user2]);
    expect(facade.paginatedUsers()).toEqual([user2]);
    expect(facade.loading()).toBe(false);
    expect(facade.totalPages()).toBe(1);
  });

  it('applyFilters() filters by search, role and activation', () => {
    facade.users.set([user1, user2]);

    facade.searchQuery.set('bob');
    facade.filterRole.set([ROLES.CONSULTANT]);
    facade.filterStatus.set('inactif');

    facade.applyFilters();

    expect(facade.filteredUsers()).toEqual([user2]);
  });

  it('submitAddUser() updates list and shows success message', () => {
    vi.useFakeTimers();

    const dto: AddUserDto = {
      email: 'new@gmail.com',
      firstName: 'New',
      lastName: 'User',
      roles: [ROLES.TALENT_ACQUISITION],
      isActivated: true,
    };

    const newUser: User = {
      id: 3,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      picture: '',
      roles: dto.roles,
      isActivated: dto.isActivated,
      createdAt: '2026-01-03',
      lastLogin: '2026-01-12',
    };

    usersServiceMock.add.mockReturnValue(of(newUser));
    const onSuccess = vi.fn();

    facade.users.set([user1]);
    facade.submitAddUser(dto, onSuccess);

    expect(usersServiceMock.add).toHaveBeenCalledWith(dto);
    expect(facade.users()[0]).toEqual(newUser);
    expect(facade.successMessage()).toContain('ajouté');
    expect(facade.addLoading()).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);
    expect(facade.successMessage()).toBeNull();
  });
});
