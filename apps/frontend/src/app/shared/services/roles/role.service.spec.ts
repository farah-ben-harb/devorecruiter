import { TestBed } from '@angular/core/testing';
import { RoleService, AppRole } from './role.service';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('RoleService', () => {
  let service: RoleService;
  let authServiceMock: { getUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      getUser: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [RoleService, { provide: AuthService, useValue: authServiceMock }],
    });

    service = TestBed.inject(RoleService);
  });

  const mockUserRoles = (roles: AppRole[] | null) => {
    authServiceMock.getUser.mockReturnValue(roles ? { roles } : null);
  };

  // ================= BASIC =================
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ================= hasRole =================
  describe('hasRole()', () => {
    it('should return true if user has at least one role', () => {
      mockUserRoles(['TALENT_ACQUISITION']);
      expect(service.hasRole('ADMIN_RH', 'TALENT_ACQUISITION')).toBe(true);
    });

    it('should return false if user has none of the roles', () => {
      mockUserRoles(['CONSULTANT']);
      expect(service.hasRole('TECHNICAL_REFERENT')).toBe(false);
    });

    it('should return false if user has no roles', () => {
      mockUserRoles(null);
      expect(service.hasRole('ADMIN_RH')).toBe(false);
    });

    it('should work with multiple user roles', () => {
      mockUserRoles(['CONSULTANT', 'ADMIN_RH']);
      expect(service.hasRole('ADMIN_RH')).toBe(true);
    });
  });

  // ================= PERMISSIONS =================
  describe('Permissions matrix', () => {
    it('canGenerate should allow RH, TA, TECH', () => {
      mockUserRoles(['ADMIN_RH']);
      expect(service.canGenerate()).toBe(true);

      mockUserRoles(['TALENT_ACQUISITION']);
      expect(service.canGenerate()).toBe(true);

      mockUserRoles(['TECHNICAL_REFERENT']);
      expect(service.canGenerate()).toBe(true);

      mockUserRoles(['CONSULTANT']);
      expect(service.canGenerate()).toBe(false);
    });

    it('canEdit should allow only TECH and RH', () => {
      mockUserRoles(['TECHNICAL_REFERENT']);
      expect(service.canEdit()).toBe(true);

      mockUserRoles(['ADMIN_RH']);
      expect(service.canEdit()).toBe(true);

      mockUserRoles(['TALENT_ACQUISITION']);
      expect(service.canEdit()).toBe(false);
    });

    it('canApprove should follow same logic as canEdit', () => {
      mockUserRoles(['TECHNICAL_REFERENT']);
      expect(service.canApprove()).toBe(true);

      mockUserRoles(['CONSULTANT']);
      expect(service.canApprove()).toBe(false);
    });

    it('canViewGitRepo should allow TECH and RH', () => {
      mockUserRoles(['ADMIN_RH']);
      expect(service.canViewGitRepo()).toBe(true);

      mockUserRoles(['CONSULTANT']);
      expect(service.canViewGitRepo()).toBe(false);
    });

    it('canSendEvaluationInvitation should allow RH and TA only', () => {
      mockUserRoles(['ADMIN_RH']);
      expect(service.canSendEvaluationInvitation()).toBe(true);

      mockUserRoles(['TALENT_ACQUISITION']);
      expect(service.canSendEvaluationInvitation()).toBe(true);

      mockUserRoles(['TECHNICAL_REFERENT']);
      expect(service.canSendEvaluationInvitation()).toBe(false);
    });

    it('canDelete should allow RH and TA only', () => {
      mockUserRoles(['ADMIN_RH']);
      expect(service.canDelete()).toBe(true);

      mockUserRoles(['TALENT_ACQUISITION']);
      expect(service.canDelete()).toBe(true);

      mockUserRoles(['TECHNICAL_REFERENT']);
      expect(service.canDelete()).toBe(false);
    });

    it('canViewInvitees should allow TECH and RH', () => {
      mockUserRoles(['TECHNICAL_REFERENT']);
      expect(service.canViewInvitees()).toBe(true);

      mockUserRoles(['CONSULTANT']);
      expect(service.canViewInvitees()).toBe(false);
    });

    it('isTechnicalReferent should detect correctly', () => {
      mockUserRoles(['TECHNICAL_REFERENT']);
      expect(service.isTechnicalReferent()).toBe(true);

      mockUserRoles(['ADMIN_RH']);
      expect(service.isTechnicalReferent()).toBe(false);
    });
  });

  // ================= EDGE CASES =================
  describe('Edge cases', () => {
    it('should handle empty roles array', () => {
      mockUserRoles([]);
      expect(service.canGenerate()).toBe(false);
    });

    it('should handle undefined user object', () => {
      authServiceMock.getUser.mockReturnValue(undefined);
      expect(service.canEdit()).toBe(false);
    });
  });
});
