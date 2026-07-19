import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { BrowserUiService } from '@core/services/browser-ui.service';
import { AuthService } from '@modules/auth/services/auth.service';
import { ExportService } from '@app/shared/services/export/export.service';
import { ImportService } from '@app/shared/services/import/import.service';

import { AddUserPayload, EditUserPayload, User } from '../models/user.model';
import { UsersComponent } from './users.component';
import { UsersFacade } from '../state/users.facade';
import { Role } from '@shared/constants/roles.constants';

const mockUser: User = {
  id: 1,
  email: 'john.doe@gmail.com',
  firstName: 'John',
  lastName: 'Doe',
  picture: '',
  roles: ['CONSULTANT'],
  isActivated: true,
  createdAt: '2024-01-01',
  lastLogin: '2024-03-01T10:00:00Z',
};

describe('UsersComponent', () => {
  let component: UsersComponent;

  const facadeSpy = {
    init: vi.fn(),
    loadUsers: vi.fn(),
    goToPage: vi.fn(),
    applySort: vi.fn(),
    applyFilters: vi.fn(),
    submitAddUser: vi.fn(),
    updateUser: vi.fn(),
    toggleActivation: vi.fn(),
    deleteUser: vi.fn(),

    users: signal<User[]>([mockUser]),
    filteredUsers: signal<User[]>([mockUser]),
    paginatedUsers: signal<User[]>([mockUser]),
    loading: signal(false),
    addLoading: signal(false),
    errorMessage: signal<string | null>(null),
    successMessage: signal<string | null>(null),
    currentUserRole: signal<string[]>(['ADMIN_RH']),

    searchQuery: signal(''),
    filterRole: signal<string[]>([]),
    filterStatus: signal(''),
    currentPage: signal(1),
    totalPages: signal(1),
    sortColumn: signal(''),
    sortDirection: signal<'asc' | 'desc'>('asc'),
    pages: signal([1]),
  };

  const browserUiSpy = {
    setBodyOverflow: vi.fn(),
    confirm: vi.fn(),
  };

  const authServiceSpy = {
    getRoles: vi.fn().mockReturnValue(['ADMIN_RH']),
  };

  const exportServiceSpy = {
    exportUsersCsv: vi.fn(),
  };

  const importServiceSpy = {
    importUsers: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: UsersFacade, useValue: facadeSpy },
        { provide: BrowserUiService, useValue: browserUiSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ExportService, useValue: exportServiceSpy },
        { provide: ImportService, useValue: importServiceSpy },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new UsersComponent(new ElementRef(document.createElement('div'))),
    );
  });

  it('ngOnInit should initialize facade and lock body when open', () => {
    component.isOpen = true;
    component.ngOnInit();

    expect(facadeSpy.init).toHaveBeenCalled();
    expect(browserUiSpy.setBodyOverflow).toHaveBeenCalledWith('hidden');
  });

  it('ngOnChanges should update body overflow from isOpen', () => {
    component.isOpen = false;
    component.ngOnChanges();
    expect(browserUiSpy.setBodyOverflow).toHaveBeenCalledWith('unset');

    component.isOpen = true;
    component.ngOnChanges();
    expect(browserUiSpy.setBodyOverflow).toHaveBeenCalledWith('hidden');
  });

  it('toggleAddForm should toggle visibility', () => {
    expect(component.showAddForm).toBe(false);
    component.toggleAddForm();
    expect(component.showAddForm).toBe(true);
    component.toggleAddForm();
    expect(component.showAddForm).toBe(false);
  });

  it('onAddSubmitted should call facade and close form in callback', () => {
    const payload: AddUserPayload = {
      email: 'john.doe@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['CONSULTANT'],
      isActivated: true,
    };
    component.showAddForm = true;

    component.onAddSubmitted(payload);

    expect(facadeSpy.submitAddUser).toHaveBeenCalled();
    expect(facadeSpy.submitAddUser.mock.calls[0][0]).toMatchObject({
      email: 'john.doe@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      isActivated: true,
      roles: ['CONSULTANT'],
    });

    const onSuccess = facadeSpy.submitAddUser.mock.calls[0][1] as () => void;
    onSuccess();
    expect(component.showAddForm).toBe(false);
  });

  it('startEdit should set editing user and close row menu', () => {
    component.openMenuId = 42;
    component.startEdit(mockUser);

    expect(component.editingUserData?.id).toBe(1);
    expect(component.openMenuId).toBeNull();
  });

  it('onEditSubmitted should do nothing if no editing user', () => {
    const payload: EditUserPayload = {
      email: 'john.doe@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['TALENT_ACQUISITION'],
      isActivated: true,
    };

    component.onEditSubmitted(payload);
    expect(facadeSpy.updateUser).not.toHaveBeenCalled();
  });

  it('onEditSubmitted should call facade.updateUser and clear editing user in callback', () => {
    component.startEdit(mockUser);
    const payload: EditUserPayload = {
      email: 'john.doe@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: ['TALENT_ACQUISITION'],
      isActivated: true,
    };

    component.onEditSubmitted(payload);

    expect(facadeSpy.updateUser).toHaveBeenCalledWith(
      1,
      {
        email: 'john.doe@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        isActivated: true,
        roles: ['TALENT_ACQUISITION'],
      },
      expect.any(Function),
    );

    const onSuccess = facadeSpy.updateUser.mock.calls[0][2] as () => void;
    onSuccess();
    expect(component.editingUserData).toBeNull();
  });

  it('deleteUser should open delete modal and close row menu', () => {
    component.openMenuId = 99;
    component.deleteUser(mockUser);

    expect(component.pendingDeleteUser).toEqual(mockUser);
    expect(component.openMenuId).toBeNull();
    expect(facadeSpy.deleteUser).not.toHaveBeenCalled();
  });

  it('confirmDeleteUser should call facade and clear pending user', () => {
    component.pendingDeleteUser = mockUser;

    component.confirmDeleteUser();

    expect(facadeSpy.deleteUser).toHaveBeenCalledWith(mockUser);
    expect(component.pendingDeleteUser).toBeNull();
  });

  it('confirmDeleteUser should do nothing when no pending user', () => {
    component.pendingDeleteUser = null;

    component.confirmDeleteUser();

    expect(facadeSpy.deleteUser).not.toHaveBeenCalled();
  });

  it('cancelDeleteUser should clear pending user', () => {
    component.pendingDeleteUser = mockUser;

    component.cancelDeleteUser();

    expect(component.pendingDeleteUser).toBeNull();
  });

  it('helpers should use roles array and label mapping', () => {
    expect(component.getUserRoles(mockUser)).toEqual(['CONSULTANT']);
    expect(component.getRoleLabel('TALENT_ACQUISITION')).toBe('Recruteur');
    expect(component.getRoleBadgeClass('ADMIN_RH')).toBe('bg-red-100 text-red-800');
  });

  it('cancelEdit should clear editing user', () => {
    component.editingUserData = mockUser;
    component.cancelEdit();
    expect(component.editingUserData).toBeNull();
  });

  it('toggleMenu should toggle open menu id', () => {
    expect(component.openMenuId).toBeNull();
    const event = {
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: () => ({ bottom: 100, right: 200, left: 160, top: 80, width: 40 }),
      },
    } as unknown as MouseEvent;

    component.toggleMenu(1, event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.openMenuId).toBe(1);
    expect(component.menuPosition).not.toBeNull();
    expect(component.menuPosition?.top).toBe(104);
    expect(Number.isFinite(component.menuPosition?.left ?? NaN)).toBe(true);

    component.toggleMenu(1, event);
    expect(component.openMenuId).toBeNull();
  });

  it('toggleMenu should open different menu when another user is clicked', () => {
    const event = {
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: () => ({ bottom: 120, right: 300 }),
      },
    } as unknown as MouseEvent;

    component.toggleMenu(1, event);
    expect(component.openMenuId).toBe(1);

    component.toggleMenu(2, event);
    expect(component.openMenuId).toBe(2);
  });

  it('closeMenu should clear menu state', () => {
    component.openMenuId = 42;
    component.menuPosition = { top: 10, left: 20 };
    component.roleDropdownOpen = true;

    component.closeMenu();

    expect(component.openMenuId).toBeNull();
    expect(component.menuPosition).toBeNull();
    expect(component.roleDropdownOpen).toBe(true);
  });

  it('toggleFilterRole should add role to filter', () => {
    facadeSpy.filterRole.set([]);
    const event = new Event('click');
    vi.spyOn(event, 'stopPropagation');

    component.toggleFilterRole('CONSULTANT', event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(facadeSpy.filterRole()).toContain('CONSULTANT');
    expect(facadeSpy.applyFilters).toHaveBeenCalled();
  });

  it('toggleFilterRole should remove role from filter if already selected', () => {
    facadeSpy.filterRole.set(['CONSULTANT']);
    const event = new Event('click');

    component.toggleFilterRole('CONSULTANT', event);

    expect(facadeSpy.filterRole()).not.toContain('CONSULTANT');
    expect(facadeSpy.applyFilters).toHaveBeenCalled();
  });

  it('isFilterRoleSelected should return true if role is in filter', () => {
    facadeSpy.filterRole.set(['CONSULTANT', 'ADMIN_RH']);

    expect(component.isFilterRoleSelected('CONSULTANT')).toBe(true);
    expect(component.isFilterRoleSelected('TALENT_ACQUISITION')).toBe(false);
  });

  it('viewDetails should set selected user and close menu', () => {
    component.openMenuId = 42;

    component.viewDetails(mockUser);

    expect(component.selectedUser).toEqual(mockUser);
    expect(component.openMenuId).toBeNull();
  });

  it('closeDetails should clear selected user', () => {
    component.selectedUser = mockUser;

    component.closeDetails();

    expect(component.selectedUser).toBeNull();
  });

  it('isAdminRh should return true if user has ADMIN_RH role', () => {
    expect(component.isAdminRh(mockUser)).toBe(false);

    const adminUser: User = { ...mockUser, roles: ['ADMIN_RH' as Role] };
    expect(component.isAdminRh(adminUser)).toBe(true);
  });

  it('isAdminRh should handle missing roles', () => {
    const userWithoutRoles: User = { ...mockUser, roles: [] };
    expect(component.isAdminRh(userWithoutRoles)).toBe(false);
  });

  it('formatLastLogin should return "Jamais" for empty date', () => {
    expect(component.formatLastLogin('')).toBe('Jamais');
  });

  it('formatLastLogin should format recent logins in minutes', () => {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const formatted = component.formatLastLogin(tenMinutesAgo.toISOString());
    expect(formatted).toMatch(/Il y a \d+ min/);
  });

  it('formatLastLogin should format logins in hours', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const formatted = component.formatLastLogin(twoHoursAgo.toISOString());
    expect(formatted).toMatch(/Il y a \d+h/);
  });

  it('formatLastLogin should format old logins as date', () => {
    const formatted = component.formatLastLogin('2024-01-01T10:00:00Z');
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('onBackdropClick should emit close when not fullscreen', () => {
    component.isFullscreen = false;
    vi.spyOn(component.close, 'emit');

    component.onBackdropClick();

    expect(component.close.emit).toHaveBeenCalled();
  });

  it('onBackdropClick should not emit close when fullscreen', () => {
    component.isFullscreen = true;
    vi.spyOn(component.close, 'emit');

    component.onBackdropClick();

    expect(component.close.emit).not.toHaveBeenCalled();
  });

  it('onContentClick should stop propagation', () => {
    const event = new MouseEvent('click');
    vi.spyOn(event, 'stopPropagation');

    component.onContentClick(event);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('onEscape should emit close when isOpen is true', () => {
    component.isOpen = true;
    vi.spyOn(component.close, 'emit');

    component.onEscape();

    expect(component.close.emit).toHaveBeenCalled();
  });

  it('onEscape should not emit close when isOpen is false', () => {
    component.isOpen = false;
    vi.spyOn(component.close, 'emit');

    component.onEscape();

    expect(component.close.emit).not.toHaveBeenCalled();
  });

  it('toggleRoleDropdown should toggle role dropdown', () => {
    expect(component.roleDropdownOpen).toBe(false);
    const event = new MouseEvent('click');
    vi.spyOn(event, 'stopPropagation');

    component.toggleRoleDropdown(event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.roleDropdownOpen).toBe(true);

    component.toggleRoleDropdown(event);
    expect(component.roleDropdownOpen).toBe(false);
  });

  it('resetFilterRoles should clear filter and apply filters', () => {
    const event = new Event('click');
    vi.spyOn(event, 'stopPropagation');
    component.filterRole = ['CONSULTANT'];

    component.resetFilterRoles(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.filterRole).toEqual([]);
    expect(facadeSpy.applyFilters).toHaveBeenCalled();
  });

  it('ngOnDestroy should reset body overflow', () => {
    component.ngOnDestroy();
    expect(browserUiSpy.setBodyOverflow).toHaveBeenCalledWith('unset');
  });
});
