import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '@core/icons/components/icon.component';
import { ALL_ROLES } from '../../state/users.facade';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-users-detail-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './users-detail-modal.component.html',
})
export class UsersDetailModalComponent {
  @Input({ required: true }) user!: User;
  @Input() showCloseButton = true;
  @Input() isFullscreen = false;

  @Output() closed = new EventEmitter<void>();

  getRoleLabel(role: string): string {
    return ALL_ROLES.find((r) => r.value === role)?.label ?? role;
  }

  getRoleBadgeClass(role: string): string {
    return ALL_ROLES.find((r) => r.value === role)?.badgeClass ?? 'bg-gray-100 text-gray-700';
  }

  getUserRoles(): string[] {
    return Array.isArray(this.user.roles) && this.user.roles.length > 0 ? this.user.roles : [];
  }

  formatLastLogin(date: string): string {
    if (!date) return 'Jamais';
    const d = new Date(date);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
