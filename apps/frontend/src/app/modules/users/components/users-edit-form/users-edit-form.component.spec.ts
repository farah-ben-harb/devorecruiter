import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { UsersEditFormComponent } from './users-edit-form.component';
import type { User } from '../../models/user.model';

describe('UsersEditFormComponent', () => {
  let component: UsersEditFormComponent;

  const user: User = {
    id: 42,
    email: 'john.doe@gmail.com',
    firstName: 'John',
    lastName: 'Doe',
    picture: '',
    roles: ['CONSULTANT'],
    isActivated: true,
    createdAt: '2026-04-01',
    lastLogin: '2026-04-10',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReactiveFormsModule] });
    component = TestBed.runInInjectionContext(() => new UsersEditFormComponent());
    component.user = user;
    component.ngOnChanges();
  });

  it('should patch the form from the input user', () => {
    expect(component.form.value).toEqual({
      email: 'john.doe@gmail.com',
      firstName: 'John',
      lastName: 'Doe',
      isActivated: true,
    });
    expect(component.selectedRoles).toEqual(['CONSULTANT']);
  });

  it('should fall back to the default role when the user has no roles', () => {
    component.user = { ...user, roles: [] };
    component.ngOnChanges();

    expect(component.selectedRoles).toEqual(['TALENT_ACQUISITION']);
  });

  it('should toggle roles in and out of the selection', () => {
    component.toggleRole('TECHNICAL_REFERENT');
    expect(component.isRoleSelected('TECHNICAL_REFERENT')).toBe(true);

    component.toggleRole('TECHNICAL_REFERENT');
    expect(component.isRoleSelected('TECHNICAL_REFERENT')).toBe(false);
  });

  it('should emit submitted payload when the form is valid', () => {
    const submitSpy = vi.fn();
    component.submitted.subscribe(submitSpy);

    component.form.patchValue({
      email: 'jane.doe@gmail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      isActivated: false,
    });
    component.selectedRoles = ['ADMIN_RH'];

    component.submit();

    expect(submitSpy).toHaveBeenCalledWith({
      email: 'jane.doe@gmail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      isActivated: false,
      roles: ['ADMIN_RH'],
    });
  });

  it('should mark the form as touched when submission is invalid', () => {
    const markAllAsTouchedSpy = vi.spyOn(component.form, 'markAllAsTouched');
    const submitSpy = vi.fn();
    component.submitted.subscribe(submitSpy);

    component.selectedRoles = [];
    component.submit();

    expect(markAllAsTouchedSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('should emit cancelled on cancel', () => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.cancel();

    expect(cancelledSpy).toHaveBeenCalledTimes(1);
  });
});
