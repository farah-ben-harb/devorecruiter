import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { UsersDetailModalComponent } from './users-detail-modal.component';
import type { User } from '../../models/user.model';

describe('UsersDetailModalComponent', () => {
  let component: UsersDetailModalComponent;

  const user: User = {
    id: 7,
    email: 'alice@gmail.com',
    firstName: 'Alice',
    lastName: 'Doe',
    picture: '',
    roles: ['ADMIN_RH'],
    isActivated: true,
    createdAt: '2026-03-15',
    lastLogin: '2026-04-17T11:30:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new UsersDetailModalComponent());
    component.user = user;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should expose role labels and badge classes from the role registry', () => {
    expect(component.getRoleLabel('ADMIN_RH')).toBe('Admin RH');
    expect(component.getRoleLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(component.getRoleBadgeClass('ADMIN_RH')).toBe('bg-red-100 text-red-800');
    expect(component.getRoleBadgeClass('UNKNOWN')).toBe('bg-gray-100 text-gray-700');
  });

  it('should return the user roles or an empty array', () => {
    expect(component.getUserRoles()).toEqual(['ADMIN_RH']);

    component.user = { ...user, roles: [] };
    expect(component.getUserRoles()).toEqual([]);
  });

  it('should format last login relative to the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-17T12:00:00.000Z'));

    expect(component.formatLastLogin('')).toBe('Jamais');
    expect(component.formatLastLogin('2026-04-17T11:30:00.000Z')).toBe('Il y a 30 min');
  });
});
