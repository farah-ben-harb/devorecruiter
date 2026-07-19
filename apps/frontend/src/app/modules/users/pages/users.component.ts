import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  inject,
  EventEmitter,
  Input,
  Output,
  ElementRef,
  HostListener,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';
import { AddUserPayload, EditUserPayload, User } from '../models/user.model';
import { TableHeaderComponent } from '../../../shared/components/table/table-header.component';
import { TableBodyComponent } from '../../../shared/components/table/table-body.component';
import { TableRowComponent } from '../../../shared/components/table/table-row.component';
import { TableCellComponent } from '../../../shared/components/table/table-cell.component';
import { AppIconComponent } from '../../../core/icons/components/icon.component';
import { BrowserUiService } from '@core/services/browser-ui.service';
import { UsersFacade, ALL_ROLES, ASSIGNABLE_ROLES } from '../state/users.facade';
import { UsersAddFormComponent } from '../components/users-add-form/users-add-form.component';
import { UsersEditFormComponent } from '../components/users-edit-form/users-edit-form.component';
import { Role } from '@shared/constants/roles.constants';
import { UsersDetailModalComponent } from '../components/users-detail-modal/users-detail-modal.component';
import { ExportService } from '@app/shared/services/export/export.service';
import { ImportService } from '@app/shared/services/import/import.service';
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableHeaderComponent,
    TableBodyComponent,
    TableRowComponent,
    TableCellComponent,
    AppIconComponent,
    UsersAddFormComponent,
    UsersEditFormComponent,
    UsersDetailModalComponent,
  ],
  templateUrl: './users.component.html',
  providers: [UsersFacade],
})
export class UsersComponent implements OnInit, OnDestroy, OnChanges {
  private readonly authService = inject(AuthService);
  private readonly facade = inject(UsersFacade);
  private readonly browserUi = inject(BrowserUiService);
  private readonly MENU_HEIGHT = 150;
  private readonly exportService = inject(ExportService);
  private readonly importService = inject(ImportService);
  readonly importReport = signal<{ added: number; ignored: number; errors: string[] } | null>(null);
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() className = '';
  @Input() showCloseButton = true;
  @Input() isFullscreen = false;

  readonly allRoles = ALL_ROLES;
  readonly assignableRoles = ASSIGNABLE_ROLES;

  openMenuId: number | null = null;
  menuPosition: { top: number; left: number } | null = null;
  roleDropdownOpen = false;
  showAddForm = false;

  editingUserData: User | null = null;
  selectedUser: User | null = null;
  pendingDeleteUser: User | null = null;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.facade.init();
    if (this.isOpen) this.browserUi.setBodyOverflow('hidden');
  }

  ngOnDestroy(): void {
    this.browserUi.setBodyOverflow('unset');
  }

  ngOnChanges(): void {
    this.browserUi.setBodyOverflow(this.isOpen ? 'hidden' : 'unset');
  }

  get users(): User[] {
    return this.facade.users();
  }
  get filteredUsers(): User[] {
    return this.facade.filteredUsers();
  }
  get loading(): boolean {
    return this.facade.loading();
  }
  get addLoading(): boolean {
    return this.facade.addLoading();
  }
  get paginatedUsers(): User[] {
    return this.facade.paginatedUsers();
  }
  get pages(): number[] {
    return this.facade.pages();
  }

  readonly errorMessage = this.facade.errorMessage;
  readonly successMessage = this.facade.successMessage;
  readonly currentUserRole = this.facade.currentUserRole;

  get searchQuery(): string {
    return this.facade.searchQuery();
  }
  set searchQuery(v: string) {
    this.facade.searchQuery.set(v);
  }

  get filterRole(): string[] {
    return this.facade.filterRole();
  }
  set filterRole(v: string[]) {
    this.facade.filterRole.set(v);
  }

  get filterStatus(): string {
    return this.facade.filterStatus();
  }
  set filterStatus(v: string) {
    this.facade.filterStatus.set(v);
  }

  get currentPage(): number {
    return this.facade.currentPage();
  }
  set currentPage(v: number) {
    this.facade.currentPage.set(v);
  }

  get totalPages(): number {
    return this.facade.totalPages();
  }

  get sortColumn(): string {
    return this.facade.sortColumn();
  }
  set sortColumn(v: string) {
    this.facade.sortColumn.set(v);
  }

  get sortDirection(): 'asc' | 'desc' {
    return this.facade.sortDirection();
  }
  set sortDirection(v: 'asc' | 'desc') {
    this.facade.sortDirection.set(v);
  }

  // ── Formulaire ajout ────────────────────────────────────────────────────

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
  }

  onAddSubmitted(payload: AddUserPayload): void {
    this.facade.submitAddUser({ ...payload, roles: payload.roles as Role[] }, () => {
      this.showAddForm = false;
    });
  }

  // ── Formulaire édition ───────────────────────────────────────────────────

  startEdit(user: User): void {
    this.editingUserData = user;
    this.closeMenu();
  }

  cancelEdit(): void {
    this.editingUserData = null;
  }

  onEditSubmitted(payload: EditUserPayload): void {
    if (!this.editingUserData) return;
    this.facade.updateUser(
      this.editingUserData.id,
      { ...payload, roles: payload.roles as Role[] },
      () => this.cancelEdit(),
    );
  }

  // ── Table ────────────────────────────────────────────────────────────────

  toggleMenu(userId: number, event: MouseEvent): void {
    event.stopPropagation();

    if (this.openMenuId === userId) {
      this.closeMenu();
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Ouvrir vers le haut si pas assez de place en bas
    const openUpward = rect.bottom + this.MENU_HEIGHT > viewportHeight;

    // Sur mobile (< 640px), forcer à gauche pour rester dans l'écran
    const menuWidth = 208; // w-52 = 13rem = 208px
    let left = rect.left - menuWidth + rect.width;
    if (left < 8) left = 8; // garder un minimum de 8px du bord gauche
    if (left + menuWidth > viewportWidth - 8) left = viewportWidth - menuWidth - 8;

    this.menuPosition = {
      top: openUpward ? rect.top - this.MENU_HEIGHT : rect.bottom + 4,
      left,
    };

    this.openMenuId = userId;
  }

  closeMenu(): void {
    this.openMenuId = null;
    this.menuPosition = null;
  }
  toggleFilterRole(role: string, event: Event): void {
    event.stopPropagation();
    const current = this.facade.filterRole();
    const exists = current.includes(role);
    this.facade.filterRole.set(exists ? current.filter((r) => r !== role) : [...current, role]);
    this.applyFilters();
  }

  isFilterRoleSelected(role: string): boolean {
    return this.facade.filterRole().includes(role);
  }

  loadUsers(): void {
    this.facade.loadUsers();
  }
  goToPage(p: number): void {
    this.facade.goToPage(p);
  }
  applySort(): void {
    this.facade.applySort();
  }
  applyFilters(): void {
    this.facade.applyFilters();
  }

  toggleActivation(user: User): void {
    this.facade.toggleActivation(user);
    this.openMenuId = null;
  }

  viewDetails(user: User): void {
    this.selectedUser = user;
    this.closeMenu();
  }

  closeDetails(): void {
    this.selectedUser = null;
  }

  deleteUser(user: User): void {
    this.pendingDeleteUser = user;
    this.closeMenu();
  }

  confirmDeleteUser(): void {
    if (!this.pendingDeleteUser) return;
    this.facade.deleteUser(this.pendingDeleteUser);
    this.pendingDeleteUser = null;
  }

  cancelDeleteUser(): void {
    this.pendingDeleteUser = null;
  }

  getUserRoles(user: User): string[] {
    return Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [];
  }

  getRoleLabel(role: string): string {
    return ALL_ROLES.find((r) => r.value === role)?.label ?? role;
  }

  getRoleBadgeClass(role: string): string {
    return ALL_ROLES.find((r) => r.value === role)?.badgeClass ?? 'bg-gray-100 text-gray-700';
  }

  isAdminRh(user: User): boolean {
    return user.roles?.includes('ADMIN_RH' as never) ?? false;
  }

  formatLastLogin(date: string): string {
    if (!date) return 'Jamais';
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  onBackdropClick(): void {
    if (!this.isFullscreen) this.close.emit();
  }

  onContentClick(e: MouseEvent): void {
    e.stopPropagation();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close.emit();
  }

  toggleRoleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.roleDropdownOpen = !this.roleDropdownOpen;
  }

  onRoleDropdownKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.roleDropdownOpen = false;
    }
  }

  resetFilterRoles(event: Event): void {
    event.stopPropagation();
    this.filterRole = [];
    this.applyFilters();
  }
  exportUsers(): void {
    this.exportService.exportUsersExcel();
  }
  onImportUsers(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importService.importUsers(file).subscribe({
      next: (report) => {
        this.importReport.set(report);
        this.facade.successMessage.set(
          `Import réussi : ${report.added} utilisateur(s) ajouté(s)${report.ignored > 0 ? `, ${report.ignored} ignoré(s)` : ''}`,
        );
        setTimeout(() => this.facade.successMessage.set(''), 4000);
        this.loadUsers();
      },
      error: (err: unknown) => console.error('Erreur import', err),
    });
  }
}
