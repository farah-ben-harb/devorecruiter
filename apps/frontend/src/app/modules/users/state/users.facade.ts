import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@modules/auth/services/auth.service';
import { Role, ROLES } from '@shared/constants/roles.constants';
import { AddUserDto, RoleOption, UpdateUserDto, User } from '../models/user.model';
import { UsersService } from '../services/users.service';

// ── Constantes rôles ─────────────────────────────────────────────────────────

export const ALL_ROLES: RoleOption[] = [
  { value: 'ADMIN_RH', label: 'Admin RH', badgeClass: 'bg-red-100 text-red-800' },
  { value: 'TALENT_ACQUISITION', label: 'Recruteur', badgeClass: 'bg-blue-100 text-blue-700' },
  { value: 'CONSULTANT', label: 'Consultant', badgeClass: 'bg-green-100 text-green-700' },
  {
    value: 'TECHNICAL_REFERENT',
    label: 'Référent Technique',
    badgeClass: 'bg-purple-100 text-purple-700',
  },
];

export const ASSIGNABLE_ROLES: RoleOption[] = ALL_ROLES.filter((r) => r.value !== 'ADMIN_RH');

@Injectable()
export class UsersFacade {
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);

  readonly users = signal<User[]>([]);
  readonly filteredUsers = signal<User[]>([]);
  readonly loading = signal(true);
  readonly addLoading = signal(false);
  readonly updateLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly currentUserRole = signal<Role[]>([]);

  readonly searchQuery = signal('');
  readonly filterRole = signal<string[]>([]);
  readonly filterStatus = signal('');
  readonly sortColumn = signal('');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(10);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.itemsPerPage())),
  );

  readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  readonly defaultRole = ROLES.TALENT_ACQUISITION;
  readonly paginatedUsers = computed(() => {
    const page = this.currentPage();
    const limit = this.itemsPerPage();
    return this.filteredUsers().slice((page - 1) * limit, page * limit);
  });
  init(): void {
    this.currentUserRole.set(this.authService.getRoles());
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.usersService.getAll().subscribe({
      next: (result) => {
        this.users.set(result.data);
        this.applyFilters(false);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showError('Impossible de charger les utilisateurs. Veuillez réessayer.');
      },
    });
  }

  submitAddUser(dto: AddUserDto, onSuccess: () => void): void {
    this.addLoading.set(true);
    this.usersService.add(dto).subscribe({
      next: (newUser) => {
        this.users.set([newUser, ...this.users()]);
        this.applyFilters();
        this.showSuccess(`${newUser.firstName} ${newUser.lastName} ajouté avec succès.`);
        this.addLoading.set(false);
        onSuccess();
      },
      error: (err: { status: number }) => {
        this.addLoading.set(false);
        this.showError(
          err.status === 409
            ? 'Un utilisateur avec cet email existe déjà.'
            : "Impossible d'ajouter l'utilisateur. Veuillez réessayer.",
        );
      },
    });
  }

  updateUser(id: number, dto: UpdateUserDto, onSuccess: () => void): void {
    this.updateLoading.set(true);
    this.usersService.update(id, dto).subscribe({
      next: (updated) => {
        this.users.set(this.users().map((u) => (u.id === id ? { ...u, ...updated } : u)));
        this.applyFilters();
        this.showSuccess(`${updated.firstName} ${updated.lastName} mis à jour avec succès.`);
        this.updateLoading.set(false);
        onSuccess();
      },
      error: () => {
        this.updateLoading.set(false);
        this.showError("Impossible de mettre à jour l'utilisateur. Veuillez réessayer.");
      },
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  applySort(): void {
    if (!this.sortColumn()) return;
    const sorted = [...this.filteredUsers()].sort((a, b) => {
      const valA = a[this.sortColumn() as keyof User] ?? '';
      const valB = b[this.sortColumn() as keyof User] ?? '';
      const cmp = String(valA).localeCompare(String(valB));
      return this.sortDirection() === 'asc' ? cmp : -cmp;
    });
    this.filteredUsers.set(sorted);
    this.currentPage.set(1);
  }

  applyFilters(resetPage = true): void {
    const query = this.searchQuery().toLowerCase();
    const roleFilters = this.filterRole();
    const status = this.filterStatus();

    const filtered = this.users().filter((u) => {
      if (u.roles.includes('ADMIN_RH' as Role)) return false;

      const matchSearch =
        !query || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(query);

      const matchRole =
        roleFilters.length === 0 || roleFilters.some((r) => u.roles.includes(r as Role));

      const matchStatus = !status || (status === 'actif' ? u.isActivated : !u.isActivated);

      return matchSearch && matchRole && matchStatus;
    });

    this.filteredUsers.set(filtered);

    if (resetPage) this.currentPage.set(1);
  }

  toggleActivation(user: User): void {
    const newStatus = !user.isActivated;
    this.usersService.updateActivation(user.id, newStatus).subscribe({
      next: () => {
        user.isActivated = newStatus;
        this.showSuccess(`Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès.`);
      },
      error: () =>
        this.showError(
          `Impossible de ${newStatus ? 'activer' : 'désactiver'} ${user.firstName} ${user.lastName}.`,
        ),
    });
  }

  deleteUser(user: User): void {
    this.usersService.delete(user.id).subscribe({
      next: () => {
        this.users.set(this.users().filter((u) => u.id !== user.id));
        this.applyFilters();
        this.showSuccess(`${user.firstName} ${user.lastName} supprimé avec succès.`);
      },
      error: () => this.showError(`Impossible de supprimer ${user.firstName} ${user.lastName}.`),
    });
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
