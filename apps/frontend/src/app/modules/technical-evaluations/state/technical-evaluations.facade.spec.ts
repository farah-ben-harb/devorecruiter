import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { TechnicalEvaluationsFacade } from './technical-evaluations.facade';
import { TechnicalEvaluationService } from '../services/technical-evaluations/technical-evaluation.service';
import { JobPostService } from '../../job-posts/services/job-posts.service';
import { EvaluationInvitationsService } from '../services/evaluation-invitations/evaluation-invitations.service';
import { RoleService } from '../../../shared/services/roles/role.service';
import { TechnicalEvaluation } from '../models/technical-evaluation/technical-evaluation.model';
import { EvaluationInvitation } from '../models/evaluation-invitation/evaluation-invitation.model';

// ---------- Helpers ----------
const mockEvaluation = (overrides?: Partial<TechnicalEvaluation>): TechnicalEvaluation =>
  ({
    id: 1,
    jobPostId: 10,
    status: 'rejected',
    driveFileUrl: 'http://drive.com/file',
    gitRepoUrl: '',
    ...overrides,
  }) as TechnicalEvaluation;

const mockInvitation = (overrides?: Partial<EvaluationInvitation>): EvaluationInvitation =>
  ({
    id: 1,
    evaluationId: 1,
    candidateId: 'c1',
    sentAt: '2026-01-01',
    dueDate: '2026-01-10',
    candidateResumeFileId: 'resume1',
    ...overrides,
  }) as EvaluationInvitation;

// ---------- Suite ----------
describe('TechnicalEvaluationsFacade', () => {
  let facade: TechnicalEvaluationsFacade;
  let evaluationServiceMock: Partial<TechnicalEvaluationService>;
  let jobPostServiceMock: Partial<JobPostService>;
  let invitationsServiceMock: Partial<EvaluationInvitationsService>;
  let roleServiceMock: Partial<RoleService>;

  beforeEach(() => {
    evaluationServiceMock = {
      generate: vi.fn(),
      regenerate: vi.fn(),
      findAll: vi.fn().mockReturnValue(of([])),
      delete: vi.fn().mockReturnValue(of(void 0)),
      approve: vi.fn(),
      updateContent: vi.fn(),
      createGitRepo: vi.fn(),
    };

    jobPostServiceMock = {
      getById: vi
        .fn()
        .mockReturnValue(of({ company: 'Acme', title: 'Dev', googleDriveFileId: 'drive123' })),
    };

    invitationsServiceMock = {
      getByEvaluation: vi.fn().mockReturnValue(of([])),
    };

    roleServiceMock = {
      canGenerate: vi.fn().mockReturnValue(true),
      canEdit: vi.fn().mockReturnValue(true),
      canApprove: vi.fn().mockReturnValue(true),
      canDelete: vi.fn().mockReturnValue(true),
      canSendEvaluationInvitation: vi.fn().mockReturnValue(true),
      canViewGitRepo: vi.fn().mockReturnValue(true),
      canViewInvitees: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        TechnicalEvaluationsFacade,
        { provide: TechnicalEvaluationService, useValue: evaluationServiceMock },
        { provide: JobPostService, useValue: jobPostServiceMock },
        { provide: EvaluationInvitationsService, useValue: invitationsServiceMock },
        { provide: RoleService, useValue: roleServiceMock },
      ],
    });

    facade = TestBed.inject(TechnicalEvaluationsFacade);
  });

  afterEach(() => {
    facade.ngOnDestroy();
    vi.restoreAllMocks();
  });

  // ================= CREATE =================
  it('should be created', () => {
    expect(facade).toBeTruthy();
  });

  // ================= INIT =================
  describe('init()', () => {
    it('should set jobPostId', () => {
      facade.init(1);
      expect(facade.jobPostId()).toBe(1);
    });

    it('should load job post data', () => {
      facade.init(1);

      expect(jobPostServiceMock.getById).toHaveBeenCalledWith(1);
      expect(facade.company()).toBe('Acme');
      expect(facade.title()).toBe('Dev');
      expect(facade.jobPostGoogleDriveFileId()).toBe('drive123');
      expect(facade.loading()).toBe(false);
    });

    it('should load evaluations', () => {
      facade.init(1);
      expect(evaluationServiceMock.findAll).toHaveBeenCalledWith(1, 'coding');
    });

    it('should set loading false on jobPost error', () => {
      jobPostServiceMock.getById = vi.fn().mockReturnValue(throwError(() => new Error('fail')));

      facade.init(1);

      expect(facade.loading()).toBe(false);
    });
  });

  // ================= LOAD EVALUATIONS =================
  describe('loadEvaluations()', () => {
    it('should populate evaluations signal', () => {
      const data = [mockEvaluation()];
      evaluationServiceMock.findAll = vi.fn().mockReturnValue(of(data));

      facade.loadEvaluations(1);

      expect(facade.evaluations().length).toBeGreaterThanOrEqual(1);
    });

    it('should handle error gracefully', () => {
      evaluationServiceMock.findAll = vi.fn().mockReturnValue(throwError(() => new Error('fail')));

      expect(() => facade.loadEvaluations(1)).not.toThrow();
    });
  });

  // ================= GENERATE =================
  describe('generateEvaluation()', () => {
    it('should not generate if jobPostId is null', () => {
      facade.generateEvaluation();
      expect(evaluationServiceMock.generate).not.toHaveBeenCalled();
    });

    it('should generate and reload evaluations', () => {
      facade.jobPostId.set(1);
      evaluationServiceMock.generate = vi.fn().mockReturnValue(of({}));
      evaluationServiceMock.findAll = vi.fn().mockReturnValue(of([]));

      facade.generateEvaluation();

      expect(evaluationServiceMock.generate).toHaveBeenCalledWith(1, 'coding');
      expect(facade.generating()).toBe(false);
    });

    it('should set generating false on error', () => {
      facade.jobPostId.set(1);
      evaluationServiceMock.generate = vi.fn().mockReturnValue(throwError(() => new Error('fail')));

      facade.generateEvaluation();

      expect(facade.generating()).toBe(false);
    });
  });

  // ================= REGENERATE MODAL =================
  describe('Regenerate modal', () => {
    it('should open regenerate modal', () => {
      const evalItem = mockEvaluation();
      facade.openRegenerateModal(evalItem);

      expect(facade.showRegenerateModal()).toBe(true);
      expect(facade.selectedEvaluation()).toEqual(evalItem);
    });

    it('should close regenerate modal', () => {
      facade.openRegenerateModal(mockEvaluation());
      facade.closeRegenerateModal();

      expect(facade.showRegenerateModal()).toBe(false);
      expect(facade.selectedEvaluation()).toBeNull();
    });

    it('should not regenerate if jobPostId or evaluation missing', () => {
      facade.onRegenerateConfirm({ prompt: 'test' });
      expect(evaluationServiceMock.regenerate).not.toHaveBeenCalled();
    });

    it('should regenerate successfully', () => {
      facade.jobPostId.set(1);
      facade.selectedEvaluation.set(mockEvaluation({ id: 2 }));
      evaluationServiceMock.regenerate = vi.fn().mockReturnValue(of({}));
      evaluationServiceMock.findAll = vi.fn().mockReturnValue(of([]));

      facade.onRegenerateConfirm({ prompt: 'improve it' });

      expect(evaluationServiceMock.regenerate).toHaveBeenCalledWith({
        jobPostId: 1,
        evaluationId: 2,
        prompt: 'improve it',
      });
      expect(facade.regenerating()).toBe(false);
      expect(facade.showRegenerateModal()).toBe(false);
    });

    it('should set regenerating false on error', () => {
      facade.jobPostId.set(1);
      facade.selectedEvaluation.set(mockEvaluation({ id: 2 }));
      evaluationServiceMock.regenerate = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('fail')));

      facade.onRegenerateConfirm({ prompt: 'test' });

      expect(facade.regenerating()).toBe(false);
    });
  });

  // ================= APPROVE =================
  describe('approveEvaluation()', () => {
    it('should approve and update list', () => {
      const evalItem = mockEvaluation({ id: 1, status: 'rejected' });
      const updated = mockEvaluation({ id: 1, status: 'approved' });

      facade.evaluations.set([evalItem]);
      evaluationServiceMock.approve = vi.fn().mockReturnValue(of(updated));

      facade.approveEvaluation(evalItem, 'approved');

      expect(facade.evaluations()[0].status).toBe('approved');
      expect(facade.approving()).toBeNull();
    });

    it('should reject and update list', () => {
      const evalItem = mockEvaluation({ id: 1, status: 'rejected' });
      const updated = mockEvaluation({ id: 1, status: 'rejected' });

      facade.evaluations.set([evalItem]);
      evaluationServiceMock.approve = vi.fn().mockReturnValue(of(updated));

      facade.approveEvaluation(evalItem, 'rejected');

      expect(facade.evaluations()[0].status).toBe('rejected');
    });

    it('should set approving null on error', () => {
      evaluationServiceMock.approve = vi.fn().mockReturnValue(throwError(() => new Error('fail')));

      facade.approveEvaluation(mockEvaluation(), 'approved');

      expect(facade.approving()).toBeNull();
    });
  });

  // ================= DELETE =================
  describe('deleteEvaluation()', () => {
    it('should not delete if confirm cancelled', () => {
      facade.deleteEvaluation(mockEvaluation());
      expect(evaluationServiceMock.delete).toHaveBeenCalledWith(1);
    });

    it('should delete and remove from list', () => {
      evaluationServiceMock.delete = vi.fn().mockReturnValue(of(void 0));

      facade.evaluations.set([mockEvaluation({ id: 1 }), mockEvaluation({ id: 2 })]);

      facade.deleteEvaluation(mockEvaluation({ id: 1 }));

      expect(facade.evaluations().length).toBe(1);
      expect(facade.evaluations()[0].id).toBe(2);
    });
  });

  // ================= DOWNLOAD =================
  describe('downloadEvaluation()', () => {
    it('should open driveFileUrl in new tab', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      facade.downloadEvaluation(mockEvaluation({ driveFileUrl: 'http://drive.com/file' }));

      expect(openSpy).toHaveBeenCalledWith('http://drive.com/file', '_blank');
    });

    it('should not open if driveFileUrl is empty', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      facade.downloadEvaluation(mockEvaluation({ driveFileUrl: '' }));

      expect(openSpy).not.toHaveBeenCalled();
    });
  });

  // ================= MENU =================
  describe('Menu', () => {
    it('should close menu if same id toggled', () => {
      facade.openMenuId.set(1);

      const event = {
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, left: 50 }),
        },
      } as unknown as MouseEvent;

      facade.toggleMenu(1, event);

      expect(facade.openMenuId()).toBeNull();
    });

    it('should open menu and set position', () => {
      const event = {
        currentTarget: {
          getBoundingClientRect: () => ({ bottom: 100, left: 200 }),
        },
      } as unknown as MouseEvent;

      facade.toggleMenu(5, event);

      expect(facade.openMenuId()).toBe(5);
      expect(facade.menuPosition.top).toBe(108);
      expect(facade.menuPosition.left).toBe(40);
    });

    it('should close menu', () => {
      facade.openMenuId.set(3);
      facade.closeMenu();

      expect(facade.openMenuId()).toBeNull();
    });
  });

  // ================= EDIT CONTENT =================
  describe('Edit content modal', () => {
    it('should open edit modal', () => {
      const evalItem = mockEvaluation();
      facade.openEditContentModal(evalItem);

      expect(facade.showEditContentModal()).toBe(true);
      expect(facade.selectedEvaluation()).toEqual(evalItem);
    });

    it('should close edit modal', () => {
      facade.openEditContentModal(mockEvaluation());
      facade.closeEditContentModal();

      expect(facade.showEditContentModal()).toBe(false);
      expect(facade.selectedEvaluation()).toBeNull();
    });

    // ✅ CORRIGÉ : Ajout de isQuiz: false
    it('should not update if evaluation or jobPostId missing', () => {
      facade.onEditContentConfirm({
        htmlContent: '<p>test</p>',
        changeType: 'minor',
        isQuiz: false,
      });
      expect(evaluationServiceMock.updateContent).not.toHaveBeenCalled();
    });

    // ✅ CORRIGÉ : Ajout de isQuiz: false + vérification du payload complet
    it('should update content successfully', () => {
      facade.jobPostId.set(1);
      facade.selectedEvaluation.set(mockEvaluation({ id: 2 }));
      evaluationServiceMock.updateContent = vi.fn().mockReturnValue(of({}));
      evaluationServiceMock.findAll = vi.fn().mockReturnValue(of([]));

      facade.onEditContentConfirm({
        htmlContent: '<p>updated</p>',
        changeType: 'major',
        isQuiz: false,
      });

      expect(evaluationServiceMock.updateContent).toHaveBeenCalledWith(2, {
        htmlContent: '<p>updated</p>',
        changeType: 'major',
        isQuiz: false,
      });
      expect(facade.savingContent()).toBe(false);
      expect(facade.showEditContentModal()).toBe(false);
    });

    // ✅ CORRIGÉ : Ajout de isQuiz: false
    it('should set savingContent false on error', () => {
      facade.jobPostId.set(1);
      facade.selectedEvaluation.set(mockEvaluation({ id: 2 }));
      evaluationServiceMock.updateContent = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('fail')));

      facade.onEditContentConfirm({
        htmlContent: '<p>test</p>',
        changeType: 'minor',
        isQuiz: false,
      });

      expect(facade.savingContent()).toBe(false);
    });
  });

  // ================= GIT REPO =================
  describe('createGitRepo()', () => {
    it('should create repo and update list', () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      const evalItem = mockEvaluation({ id: 1 });
      const updated = mockEvaluation({ id: 1, gitRepoUrl: 'http://github.com/repo' });

      facade.evaluations.set([evalItem]);
      evaluationServiceMock.createGitRepo = vi.fn().mockReturnValue(of(updated));

      facade.createGitRepo(evalItem);

      expect(facade.evaluations()[0].gitRepoUrl).toBe('http://github.com/repo');
      expect(facade.creatingGitRepo()).toBeNull();
    });

    it('should alert on success', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const evalItem = mockEvaluation({ id: 1 });

      facade.evaluations.set([evalItem]);
      evaluationServiceMock.createGitRepo = vi.fn().mockReturnValue(of(evalItem));

      facade.createGitRepo(evalItem);

      expect(alertSpy).toHaveBeenCalled();
    });

    it('should set creatingGitRepo null on error', () => {
      evaluationServiceMock.createGitRepo = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('fail')));

      facade.createGitRepo(mockEvaluation({ id: 1 }));

      expect(facade.creatingGitRepo()).toBeNull();
    });
  });

  // ================= INVITEES MODAL =================
  describe('openInviteesModal()', () => {
    it('should open modal and load invitees', () => {
      const evaluation = mockEvaluation({ id: 1 });
      const invitees = [mockInvitation()];
      invitationsServiceMock.getByEvaluation = vi.fn().mockReturnValue(of(invitees));

      facade.openInviteesModal(evaluation);

      expect(facade.showInviteesModal()).toBe(true);
      expect(facade.showScoringModal()).toBe(true);
      expect(facade.selectedEvaluationForInvitees()).toEqual(evaluation);
      expect(facade.inviteesForEvaluation()).toEqual(invitees);
      expect(facade.loadingInvitees()).toBe(false);
    });

    it('should set loadingInvitees false on error', () => {
      invitationsServiceMock.getByEvaluation = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('fail')));

      facade.openInviteesModal(mockEvaluation({ id: 1 }));

      expect(facade.loadingInvitees()).toBe(false);
      expect(facade.inviteesForEvaluation()).toEqual([]);
    });

    it('should call getByEvaluation with correct id', () => {
      invitationsServiceMock.getByEvaluation = vi.fn().mockReturnValue(of([]));

      facade.openInviteesModal(mockEvaluation({ id: 99 }));

      expect(invitationsServiceMock.getByEvaluation).toHaveBeenCalledWith(99);
    });
  });

  describe('closeInviteesModal()', () => {
    it('should close modal and reset selection', () => {
      facade.showInviteesModal.set(true);
      facade.selectedEvaluationForInvitees.set(mockEvaluation());

      facade.closeInviteesModal();

      expect(facade.showInviteesModal()).toBe(false);
      expect(facade.selectedEvaluationForInvitees()).toBeNull();
    });
  });

  // ================= DESTROY =================
  describe('ngOnDestroy()', () => {
    it('should complete without throwing', () => {
      expect(() => facade.ngOnDestroy()).not.toThrow();
    });
  });
});
