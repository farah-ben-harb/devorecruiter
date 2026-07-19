import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { UsersAddFormComponent } from './users-add-form.component';

describe('UsersAddFormComponent', () => {
  let component: UsersAddFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReactiveFormsModule] });
    component = TestBed.runInInjectionContext(() => new UsersAddFormComponent());
    component.ngOnInit();
  });

  it('should initialize the form and keep no role selected', () => {
    expect(component.form.get('isActivated')?.value).toBe(true);
    expect(component.selectedRoles).toEqual([]);
    expect(component.isRoleSelected('ADMIN_RH')).toBe(false);
  });

  it('should toggle roles in and out of the selection', () => {
    component.toggleRole('CONSULTANT');
    expect(component.isRoleSelected('CONSULTANT')).toBe(true);

    component.toggleRole('CONSULTANT');
    expect(component.isRoleSelected('CONSULTANT')).toBe(false);
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
    component.selectedRoles = ['CONSULTANT'];

    component.submit();

    expect(submitSpy).toHaveBeenCalledWith({
      email: 'jane.doe@gmail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      isActivated: false,
      roles: ['CONSULTANT'],
    });
  });

  it('should mark the form as touched when submission is invalid', () => {
    const markAllAsTouchedSpy = vi.spyOn(component.form, 'markAllAsTouched');
    const submitSpy = vi.fn();
    component.submitted.subscribe(submitSpy);

    component.submit();

    expect(markAllAsTouchedSpy).toHaveBeenCalledTimes(1);
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('should reset the form and emit cancelled on cancel', () => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.form.patchValue({
      email: 'jane.doe@gmail.com',
      firstName: 'Jane',
      lastName: 'Doe',
      isActivated: false,
    });
    component.selectedRoles = ['CONSULTANT'];

    component.cancel();

    expect(component.form.get('isActivated')?.value).toBe(true);
    expect(component.selectedRoles).toEqual([]);
    expect(cancelledSpy).toHaveBeenCalledTimes(1);
  });

  it('should resolve field errors for invalid controls', () => {
    const emailControl = component.form.get('email');
    emailControl?.setValue('invalid-email');
    emailControl?.markAsTouched();

    expect(component.getFieldError('email')).toBe('Email invalide');
  });
});
