import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../../modules/auth/services/auth.service';

export type AppRole = 'ADMIN_RH' | 'TALENT_ACQUISITION' | 'TECHNICAL_REFERENT' | 'CONSULTANT';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly auth = inject(AuthService);

  private get userRoles(): AppRole[] {
    return (this.auth.getUser()?.roles ?? []) as AppRole[];
  }

  hasRole(...roles: AppRole[]): boolean {
    return roles.some((r) => this.userRoles.includes(r));
  }

  canGenerate(): boolean {
    return this.hasRole('ADMIN_RH', 'TALENT_ACQUISITION', 'TECHNICAL_REFERENT');
  }

  canEdit(): boolean {
    return this.hasRole('TECHNICAL_REFERENT', 'ADMIN_RH');
  }

  canApprove(): boolean {
    return this.hasRole('TECHNICAL_REFERENT', 'ADMIN_RH');
  }

  canViewGitRepo(): boolean {
    return this.hasRole('TECHNICAL_REFERENT', 'ADMIN_RH');
  }

  canSendEvaluationInvitation(): boolean {
    return this.hasRole('ADMIN_RH', 'TALENT_ACQUISITION');
  }

  canDelete(): boolean {
    return this.hasRole('ADMIN_RH', 'TALENT_ACQUISITION');
  }
  canViewInvitees(): boolean {
    return this.hasRole('TECHNICAL_REFERENT', 'ADMIN_RH');
  }

  isTechnicalReferent(): boolean {
    return this.hasRole('TECHNICAL_REFERENT');
  }
}
