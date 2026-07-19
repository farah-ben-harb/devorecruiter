import { Component, Input, Output, EventEmitter, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AppIconComponent } from '../../../../core/icons/components/icon.component';
import { ASSIGNABLE_ROLES, EditUserPayload, RoleOption, User } from '../../models/user.model';

@Component({
  selector: 'app-users-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppIconComponent],
  templateUrl: './users-edit-form.component.html',
})
export class UsersEditFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) user!: User;
  @Input() assignableRoles: RoleOption[] = ASSIGNABLE_ROLES;

  @Output() submitted = new EventEmitter<EditUserPayload>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup = this.fb.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)],
    ],
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    isActivated: [true, Validators.required],
  });

  selectedRoles: string[] = [];

  ngOnChanges(): void {
    this.form.patchValue({
      email: this.user.email,
      firstName: this.user.firstName,
      lastName: this.user.lastName,
      isActivated: this.user.isActivated,
    });
    this.selectedRoles =
      Array.isArray(this.user.roles) && this.user.roles.length > 0
        ? [...this.user.roles]
        : ['TALENT_ACQUISITION'];
  }

  isRoleSelected(role: string): boolean {
    return this.selectedRoles.includes(role);
  }

  toggleRole(role: string): void {
    const idx = this.selectedRoles.indexOf(role);
    if (idx > -1) this.selectedRoles.splice(idx, 1);
    else this.selectedRoles.push(role);
  }

  submit(): void {
    if (this.form.invalid || this.selectedRoles.length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit({ ...this.form.value, roles: this.selectedRoles });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  getFieldError(field: string): string | null {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.invalid || (!ctrl.touched && !ctrl.dirty)) return null;
    if (ctrl.errors?.['required']) return 'Ce champ est requis';
    if (ctrl.errors?.['email']) return 'Email invalide';
    if (ctrl.errors?.['pattern']) return "L'email doit être une adresse @gmail.com";
    if (ctrl.errors?.['minlength'])
      return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères`;
    return 'Valeur invalide';
  }
}
