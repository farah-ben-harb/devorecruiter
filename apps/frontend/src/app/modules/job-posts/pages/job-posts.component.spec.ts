import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { of, throwError } from 'rxjs';

import { JobPostComponent } from './job-posts.component';
import { JobPostService } from '../services/job-posts.service';
import { RoleService } from '@app/shared/services/roles/role.service';
import { ExportService } from '@app/shared/services/export/export.service';
import {
  PostApiResponse,
  UploadedFile,
  PaginatedResponse,
  EditJobPostPayload,
  DuplicateJobPostPayload,
  EditEvalTypeResult,
  EditJobStatusResult,
} from '../models/job-post.model';

// ─────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────

function buildPostApiResponse(overrides: Partial<PostApiResponse> = {}): PostApiResponse {
  return {
    id: 1,
    name: 'fiche.pdf',
    type: 'application/pdf',
    url: 'https://drive.example.com/fiche.pdf',
    googleDriveFileId: 'drive-1',
    status: 'raw',
    company: 'Acme',
    startDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    title: 'Développeur Angular',
    hasEvaluation: false,
    requiresCoding: null,
    hasQcm: null,
    jobStatus: null,
    linkedCandidateIds: [],
    ...overrides,
  };
}

function buildUploadedFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    id: '1',
    name: 'fiche.pdf',
    type: 'application/pdf',
    url: 'https://drive.example.com/fiche.pdf',
    isDriveFile: true,
    status: 'unified',
    isLoading: false,
    ...overrides,
  };
}

function buildPaginatedResponse(
  data: PostApiResponse[],
  overrides: Partial<PaginatedResponse<PostApiResponse>> = {},
): PaginatedResponse<PostApiResponse> {
  return {
    data,
    total: data.length,
    totalPages: 1,
    meta: {
      total: data.length,
      totalPages: 1,
      totalAll: data.length,
      totalUnified: data.filter((d) => d.status === 'unified').length,
      totalRaw: data.filter((d) => d.status !== 'unified').length,
      totalWithEvaluation: 0,
    },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Mocks typés (Partial<T> -> T est une conversion valide en TypeScript
// car les propriétés partagent le même type, seule l'optionalité diffère)
// ─────────────────────────────────────────────────────────────────────────

type JobPostServiceMock = Partial<JobPostService>;
type RoleServiceMock = Partial<RoleService>;
type ExportServiceMock = Partial<ExportService>;
type RouterMock = Partial<Router>;

function createJobPostServiceMock(): JobPostServiceMock {
  const mock: JobPostServiceMock = {
    getAll: vi.fn<JobPostService['getAll']>(),
    getAllWithEvaluations: vi.fn<JobPostService['getAllWithEvaluations']>(),
    delete: vi.fn<JobPostService['delete']>(),
    download: vi.fn<JobPostService['download']>(),
    triggerUnification: vi.fn<JobPostService['triggerUnification']>(),
    syncFromDrive: vi.fn<JobPostService['syncFromDrive']>(),
    uploadFile: vi.fn<JobPostService['uploadFile']>(),
    updateRequiresCoding: vi.fn<JobPostService['updateRequiresCoding']>(),
    updateHasQcm: vi.fn<JobPostService['updateHasQcm']>(),
    updateTitle: vi.fn<JobPostService['updateTitle']>(),
    duplicate: vi.fn<JobPostService['duplicate']>(),
    getDocxUrl: vi.fn<JobPostService['getDocxUrl']>(),
    downloadUnifiedPdf: vi.fn<JobPostService['downloadUnifiedPdf']>(),
  };

  // Valeurs par défaut "sûres" : tout appel indirect à loadPosts()/syncInBackground()
  // qui n'est pas au centre du test ne doit pas faire planter le test.
  (mock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(of(buildPaginatedResponse([])));
  (mock.getAllWithEvaluations as ReturnType<typeof vi.fn>).mockReturnValue(
    of(buildPaginatedResponse([])),
  );
  (mock.syncFromDrive as ReturnType<typeof vi.fn>).mockReturnValue(of({ added: 0, removed: 0 }));

  return mock;
}

function createRoleServiceMock(isTechnicalReferent = false): RoleServiceMock {
  return {
    isTechnicalReferent: vi
      .fn<RoleService['isTechnicalReferent']>()
      .mockReturnValue(isTechnicalReferent),
  };
}

function createExportServiceMock(): ExportServiceMock {
  return {
    exportJobPostsExcel: vi.fn<ExportService['exportJobPostsExcel']>(),
    exportJobPostsZip: vi.fn<ExportService['exportJobPostsZip']>(),
  };
}

function createRouterMock(): RouterMock {
  return {
    navigate: vi.fn<Router['navigate']>().mockResolvedValue(true),
  };
}

function createActivatedRouteMock(queryParams: Record<string, string> = {}): ActivatedRoute {
  const snapshot: Partial<ActivatedRouteSnapshot> = {
    queryParamMap: convertToParamMap(queryParams),
  };
  const route: Partial<ActivatedRoute> = {
    snapshot: snapshot as ActivatedRouteSnapshot,
  };
  return route as ActivatedRoute;
}

interface TestContext {
  component: JobPostComponent;
  jobPostServiceMock: JobPostServiceMock;
  roleServiceMock: RoleServiceMock;
  exportServiceMock: ExportServiceMock;
  routerMock: RouterMock;
}

/**
 * On teste ici la LOGIQUE du composant, pas son template.
 * JobPostComponent utilise `templateUrl`, et le mettre dans `imports` de
 * TestBed (pour passer par TestBed.createComponent) force Angular à
 * compiler ce template au moment de la résolution des imports — ce qui
 * échoue dans cet environnement (pas de résolution des ressources externes).
 * On instancie donc directement la classe via runInInjectionContext, ce qui
 * fournit un contexte d'injection valide pour les `inject(...)` utilisés
 * dans les champs et le constructeur, sans jamais toucher au template.
 */
function setupComponent(
  options: {
    queryParams?: Record<string, string>;
    isTechnicalReferent?: boolean;
  } = {},
): TestContext {
  const jobPostServiceMock = createJobPostServiceMock();
  const roleServiceMock = createRoleServiceMock(options.isTechnicalReferent ?? false);
  const exportServiceMock = createExportServiceMock();
  const routerMock = createRouterMock();

  TestBed.configureTestingModule({
    providers: [
      { provide: JobPostService, useValue: jobPostServiceMock as JobPostService },
      { provide: RoleService, useValue: roleServiceMock as RoleService },
      { provide: ExportService, useValue: exportServiceMock as ExportService },
      { provide: Router, useValue: routerMock as Router },
      { provide: ActivatedRoute, useValue: createActivatedRouteMock(options.queryParams) },
    ],
  });

  const component = TestBed.runInInjectionContext(() => new JobPostComponent());

  return { component, jobPostServiceMock, roleServiceMock, exportServiceMock, routerMock };
}

// ─────────────────────────────────────────────────────────────────────────
// Suite
// ─────────────────────────────────────────────────────────────────────────

describe('JobPostComponent', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: vi.fn().mockReturnValue('blob:mock-url'),
      writable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── ngOnInit / chargement ────────────────────────────────────────────────

  describe('ngOnInit', () => {
    it('charge les fiches via getAll par défaut et alimente les signaux', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const response = buildPaginatedResponse([
        buildPostApiResponse({ id: 1, status: 'raw' }),
        buildPostApiResponse({ id: 2, status: 'unified' }),
      ]);
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(of(response));

      component.ngOnInit();

      expect(jobPostServiceMock.getAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(component.uploadedFiles().length).toBe(2);
      expect(component.totalItems()).toBe(2);
      expect(component.loading()).toBe(false);
    });

    it('utilise getAllWithEvaluations quand hasEvaluation=true dans les query params', () => {
      const { component, jobPostServiceMock } = setupComponent({
        queryParams: { hasEvaluation: 'true' },
      });
      const response = buildPaginatedResponse([buildPostApiResponse()]);
      (jobPostServiceMock.getAllWithEvaluations as ReturnType<typeof vi.fn>).mockReturnValue(
        of(response),
      );

      component.ngOnInit();

      expect(jobPostServiceMock.getAllWithEvaluations).toHaveBeenCalledWith(1, 10, undefined);
      expect(jobPostServiceMock.getAll).not.toHaveBeenCalled();
    });

    it('passe loading à false et logue en cas d’erreur de chargement', () => {
      const { component, jobPostServiceMock } = setupComponent();
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new Error('network error')),
      );
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      component.ngOnInit();

      expect(component.loading()).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  // ── Recherche / filtres / pagination ─────────────────────────────────────

  describe('setSearchQuery', () => {
    it('déclenche loadPosts avec un debounce de 350ms et réinitialise la page', () => {
      vi.useFakeTimers();
      const { component, jobPostServiceMock } = setupComponent();
      component.currentPage.set(3);
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockClear();
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([buildPostApiResponse()])),
      );

      component.setSearchQuery('angular');
      vi.advanceTimersByTime(349);
      expect(jobPostServiceMock.getAll).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(jobPostServiceMock.getAll).toHaveBeenCalledWith(
        1,
        10,
        'angular',
        undefined,
        undefined,
      );
      expect(component.currentPage()).toBe(1);
    });
  });

  describe('setFilter', () => {
    it('met à jour le filtre actif, réinitialise la page et recharge', () => {
      const { component, jobPostServiceMock } = setupComponent();
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([])),
      );
      component.currentPage.set(2);
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockClear();

      component.setFilter('unified');

      expect(component.activeFilter()).toBe('unified');
      expect(component.currentPage()).toBe(1);
      expect(jobPostServiceMock.getAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        'unified',
        undefined,
      );
    });
  });

  describe('goToPage', () => {
    it('ne change pas de page si en dehors des bornes', () => {
      const { component, jobPostServiceMock } = setupComponent();
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([], { totalPages: 1, meta: { total: 0, totalPages: 1 } })),
      );
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockClear();

      component.goToPage(0);
      component.goToPage(99);

      expect(component.currentPage()).toBe(1);
      expect(jobPostServiceMock.getAll).not.toHaveBeenCalled();
    });

    it('charge la page demandée si dans les bornes', () => {
      const { component, jobPostServiceMock } = setupComponent();
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([], { totalPages: 5, meta: { total: 50, totalPages: 5 } })),
      );
      // goToPage vérifie `page <= totalPages()` AVANT de charger ; on doit donc
      // fixer totalPages au préalable (il vaut 1 tant que loadPosts() n'a jamais tourné).
      component.totalPages.set(5);

      component.goToPage(3);

      expect(component.currentPage()).toBe(3);
      expect(jobPostServiceMock.getAll).toHaveBeenLastCalledWith(
        3,
        10,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  // ── Unification ───────────────────────────────────────────────────────────

  describe('unify', () => {
    it('passe le statut à processing puis recharge en cas de succès', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', status: 'raw' });
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([])),
      );
      component.uploadedFiles.set([file]);
      (jobPostServiceMock.triggerUnification as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ message: 'ok' }),
      );

      component.unify(file);

      expect(jobPostServiceMock.triggerUnification).toHaveBeenCalledWith(1);
      expect(component.unifyingId()).toBeNull();
    });

    it('affiche une erreur et réinitialise unifyingId en cas d’échec', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', status: 'raw' });
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([])),
      );
      component.uploadedFiles.set([file]);
      (jobPostServiceMock.triggerUnification as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => ({ error: { message: 'Erreur serveur' } })),
      );

      component.unify(file);

      expect(component.unifyingId()).toBeNull();
      expect(component.dialogVisible()).toBe(true);
      expect(component.dialogConfig()?.message).toBe('Erreur serveur');
    });

    it("affiche une erreur immédiate si l'id est manquant", () => {
      const { component } = setupComponent();
      const file = buildUploadedFile({ id: undefined });

      component.unify(file);

      expect(component.dialogVisible()).toBe(true);
      expect(component.dialogConfig()?.message).toBe('ID de la fiche manquant');
    });
  });

  // ── Suppression ────────────────────────────────────────────────────────────

  describe('deletePost / confirmDelete', () => {
    it('ouvre la modale de suppression', () => {
      const { component } = setupComponent();
      const file = buildUploadedFile({ id: '1' });

      component.deletePost(file);

      expect(component.showDeleteModal()).toBe(true);
      expect(component.fileToDelete()).toEqual(file);
    });

    it('supprime le fichier de la liste quand action = deleted', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1' });
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([])),
      );
      component.uploadedFiles.set([file]);
      component.deletePost(file);
      (jobPostServiceMock.delete as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ message: 'ok', id: 1, action: 'deleted' }),
      );

      component.confirmDelete();

      expect(component.uploadedFiles().find((f) => f.id === '1')).toBeUndefined();
      expect(component.showDeleteModal()).toBe(false);
    });

    it('remet le fichier en brut quand action = reset', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', status: 'unified', unifiedUrl: 'https://x' });
      component.uploadedFiles.set([file]);
      component.deletePost(file);
      (jobPostServiceMock.delete as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ message: 'ok', id: 1, action: 'reset' }),
      );
      // confirmDelete() appelle aussi loadPosts() juste après (pour rafraîchir les
      // compteurs), ce qui écrase uploadedFiles avec la réponse de getAll : on mocke
      // donc getAll pour refléter l'état "remis en brut" attendu côté backend.
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([buildPostApiResponse({ id: 1, status: 'raw' })])),
      );

      component.confirmDelete();

      const updated = component.uploadedFiles().find((f) => f.id === '1');
      expect(updated?.status).toBe('raw');
      expect(updated?.unifiedUrl).toBeUndefined();
    });
  });

  // ── Edition ────────────────────────────────────────────────────────────────

  describe('confirmEdit', () => {
    it('met à jour la fiche après succès des appels combinés', async () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', title: 'Ancien titre' });
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([])),
      );
      component.uploadedFiles.set([file]);
      component.openEditModal(file);

      (jobPostServiceMock.updateTitle as ReturnType<typeof vi.fn>).mockReturnValue(of({}));
      (jobPostServiceMock.updateRequiresCoding as ReturnType<typeof vi.fn>).mockReturnValue(of({}));
      (jobPostServiceMock.updateHasQcm as ReturnType<typeof vi.fn>).mockReturnValue(of({}));

      const payload: EditJobPostPayload = {
        title: 'Nouveau titre',
        company: 'NewCo',
        hasQcm: true,
        requiresCoding: true,
      };

      component.confirmEdit(payload);
      await vi.waitFor(() => expect(component.savingEdit()).toBe(false));

      const updated = component.uploadedFiles().find((f) => f.id === '1');
      expect(updated?.title).toBe('Nouveau titre');
      expect(component.showEditModal()).toBe(false);
    });
  });

  // ── Duplication ─────────────────────────────────────────────────────────────

  describe('confirmDuplicate', () => {
    it('ajoute la fiche dupliquée en tête de liste', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1' });
      component.duplicatingFile.set(file);
      component.showDuplicateModal.set(true);

      const duplicated = buildPostApiResponse({ id: 2, title: 'Copie' });
      (jobPostServiceMock.duplicate as ReturnType<typeof vi.fn>).mockReturnValue(of(duplicated));
      // confirmDuplicate() appelle aussi loadPosts() juste après l'ajout optimiste,
      // ce qui écrase uploadedFiles avec la réponse de getAll : on mocke donc getAll
      // pour refléter l'état attendu côté backend (la fiche dupliquée est bien listée).
      (jobPostServiceMock.getAll as ReturnType<typeof vi.fn>).mockReturnValue(
        of(buildPaginatedResponse([duplicated, buildPostApiResponse({ id: 1 })])),
      );

      const payload: DuplicateJobPostPayload = {
        title: 'Copie',
        company: 'Acme',
        hasQcm: false,
        requiresCoding: false,
      };

      component.confirmDuplicate(payload);

      expect(component.uploadedFiles()[0].id).toBe('2');
      expect(component.showDuplicateModal()).toBe(false);
    });

    it('affiche une erreur si la duplication échoue', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1' });
      component.duplicatingFile.set(file);

      (jobPostServiceMock.duplicate as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new Error('fail')),
      );

      const payload: DuplicateJobPostPayload = {
        title: 'Copie',
        company: 'Acme',
        hasQcm: false,
        requiresCoding: false,
      };

      component.confirmDuplicate(payload);

      expect(component.dialogVisible()).toBe(true);
      expect(component.savingDuplicate()).toBe(false);
    });
  });

  // ── Type d'évaluation / statut de la fiche ──────────────────────────────────

  describe('confirmEvalType', () => {
    it('met à jour hasQcm et requiresCoding sur la fiche ciblée', () => {
      const { component } = setupComponent();
      const file = buildUploadedFile({ id: '1', hasQcm: false, requiresCoding: false });
      component.uploadedFiles.set([file]);
      component.openEvalTypeModal(file);

      const result: EditEvalTypeResult = { hasQcm: true, requiresCoding: true };
      component.confirmEvalType(result);

      const updated = component.uploadedFiles().find((f) => f.id === '1');
      expect(updated?.hasQcm).toBe(true);
      expect(updated?.requiresCoding).toBe(true);
      expect(component.showEvalTypeModal()).toBe(false);
    });
  });

  describe('confirmJobStatus', () => {
    it('met à jour jobStatus et linkedCandidateIds', () => {
      const { component } = setupComponent();
      const file = buildUploadedFile({ id: '1', jobStatus: null, linkedCandidateIds: [] });
      component.uploadedFiles.set([file]);
      component.openJobStatusModal(file);

      const result: EditJobStatusResult = {
        jobStatus: 'closed_with_hire',
        linkedCandidateIds: ['c1', 'c2'],
        linkedCandidates: [],
      };
      component.confirmJobStatus(result);

      const updated = component.uploadedFiles().find((f) => f.id === '1');
      expect(updated?.jobStatus).toBe('closed_with_hire');
      expect(updated?.linkedCandidateIds).toEqual(['c1', 'c2']);
    });
  });

  // ── Export ────────────────────────────────────────────────────────────────

  describe('export', () => {
    it('délègue à ExportService pour Excel et Zip', () => {
      const { component, exportServiceMock } = setupComponent();

      component.exportExcel();
      component.exportZip();

      expect(exportServiceMock.exportJobPostsExcel).toHaveBeenCalledTimes(1);
      expect(exportServiceMock.exportJobPostsZip).toHaveBeenCalledTimes(1);
    });

    it('bascule l’état du menu déroulant d’export', () => {
      const { component } = setupComponent();

      expect(component.exportDropdownOpen()).toBe(false);
      component.toggleExportDropdown();
      expect(component.exportDropdownOpen()).toBe(true);
      component.closeExportDropdown();
      expect(component.exportDropdownOpen()).toBe(false);
    });
  });

  // ── Navigation vers évaluations ─────────────────────────────────────────────

  describe('openEvaluations / openQcmList', () => {
    it('navigue avec les bons queryParams pour les évaluations coding', () => {
      const { component, routerMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', company: 'Acme' });

      component.openEvaluations(file);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/technical-evaluations'], {
        queryParams: { jobPostId: '1', company: 'Acme', mode: 'coding' },
      });
    });

    it('navigue avec les bons queryParams pour le QCM', () => {
      const { component, routerMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', company: 'Acme' });

      component.openQcmList(file);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/technical-evaluations'], {
        queryParams: { jobPostId: '1', company: 'Acme', mode: 'quiz' },
      });
    });

    it("n'appelle pas le router si l'id est manquant", () => {
      const { component, routerMock } = setupComponent();
      const file = buildUploadedFile({ id: undefined });

      component.openEvaluations(file);

      expect(routerMock.navigate).not.toHaveBeenCalled();
      expect(component.dialogVisible()).toBe(true);
    });
  });

  // ── retrait qcm / coding ──────────────────────────────────────────────────

  describe('removeEvaluationType', () => {
    it('met à jour requiresCoding de manière optimiste', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', requiresCoding: true });
      component.uploadedFiles.set([file]);
      (jobPostServiceMock.updateRequiresCoding as ReturnType<typeof vi.fn>).mockReturnValue(of({}));
      const event = new Event('click');

      component.removeEvaluationType(file, 'coding', event);

      expect(component.uploadedFiles()[0].requiresCoding).toBe(false);
      expect(jobPostServiceMock.updateRequiresCoding).toHaveBeenCalledWith(1, false);
    });

    it('annule la mise à jour optimiste de hasQcm en cas d’erreur', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', hasQcm: true });
      component.uploadedFiles.set([file]);
      (jobPostServiceMock.updateHasQcm as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new Error('fail')),
      );
      const event = new Event('click');

      component.removeEvaluationType(file, 'qcm', event);

      expect(component.uploadedFiles()[0].hasQcm).toBe(true);
    });
  });

  // ── rows (computed) ──────────────────────────────────────────────────────

  describe('rows', () => {
    it('associe correctement les versions brutes et unifiées par driveFileId', () => {
      const { component } = setupComponent();
      const raw = buildUploadedFile({ id: '1', status: 'raw', driveFileId: 'd1' });
      const unified = buildUploadedFile({ id: '2', status: 'unified', driveFileId: 'd1' });
      component.uploadedFiles.set([raw, unified]);

      const rows = component.rows();

      expect(rows).toHaveLength(1);
      expect(rows[0].raw.id).toBe('1');
      expect(rows[0].unified?.id).toBe('2');
    });

    it('ajoute une ligne séparée pour une fiche unifiée orpheline', () => {
      const { component } = setupComponent();
      const orphanUnified = buildUploadedFile({ id: '3', status: 'unified', driveFileId: 'd9' });
      component.uploadedFiles.set([orphanUnified]);

      const rows = component.rows();

      expect(rows).toHaveLength(1);
      expect(rows[0].raw.id).toBe('3');
      expect(rows[0].unified?.id).toBe('3');
    });
  });

  // ── Menu contextuel ───────────────────────────────────────────────────────

  describe('getMenuItems', () => {
    it('inclut unify pour une fiche brute quand non référent technique', () => {
      const { component } = setupComponent({ isTechnicalReferent: false });
      const file = buildUploadedFile({ status: 'raw' });

      const keys = component.getMenuItems(file).map((i) => i.key);

      expect(keys).toContain('unify');
      expect(keys).toContain('delete');
    });

    it('masque unify/scoring/duplicate/delete pour un référent technique', () => {
      const { component } = setupComponent({ isTechnicalReferent: true });
      const file = buildUploadedFile({ status: 'unified' });

      const keys = component.getMenuItems(file).map((i) => i.key);

      expect(keys).not.toContain('unify');
      expect(keys).not.toContain('scoring');
      expect(keys).not.toContain('duplicate');
      expect(keys).not.toContain('delete');
      expect(keys).toContain('download');
    });

    it('ajoute evaluations et qcm seulement si activés sur la fiche unifiée', () => {
      const { component } = setupComponent();
      const file = buildUploadedFile({ status: 'unified', requiresCoding: true, hasQcm: true });

      const keys = component.getMenuItems(file).map((i) => i.key);

      expect(keys).toContain('evaluations');
      expect(keys).toContain('qcm');
    });
  });

  describe('isMenuItemVisible / pagination du menu', () => {
    it('paginate les éléments du menu selon menuItemsPerPage', () => {
      const { component } = setupComponent({ isTechnicalReferent: false });
      const file = buildUploadedFile({
        status: 'unified',
        requiresCoding: true,
        hasQcm: true,
        unifiedUrl: 'https://x',
        url: 'https://raw',
      });

      const allItems = component.getMenuItems(file).map((i) => i.key);
      expect(allItems.length).toBeGreaterThan(component.menuItemsPerPage);
      expect(allItems[0]).toBe('scoring');
      expect(allItems[allItems.length - 1]).toBe('jobStatusEdit');

      component.menuPage.set(0);
      expect(component.isMenuItemVisible('scoring', file)).toBe(true);
      expect(component.isMenuItemVisible('jobStatusEdit', file)).toBe(false);

      const lastPage = Math.ceil(allItems.length / component.menuItemsPerPage) - 1;
      component.menuPage.set(lastPage);
      expect(component.isMenuItemVisible('jobStatusEdit', file)).toBe(true);
    });
  });

  // ── Helpers texte / statut ───────────────────────────────────────────────

  describe('helpers', () => {
    it('stripExtension retire l’extension du nom de fichier', () => {
      const { component } = setupComponent();

      expect(component.stripExtension('fiche.pdf')).toBe('fiche');
      expect(component.rawName('fiche.pdf')).toBe('fiche_raw');
      expect(component.unifiedName('fiche.pdf')).toBe('fiche_unifié');
    });

    it('statusLabel et statusClass retournent les bons libellés', () => {
      const { component } = setupComponent();

      expect(component.statusLabel('unified')).toBe('Unifiée');
      expect(component.statusLabel('error')).toBe('Erreur');
      expect(component.statusClass('unified')).toContain('bg-green-100');
    });

    it('getFileIcon distingue image et pdf', () => {
      const { component } = setupComponent();

      expect(component.getFileIcon('image/png')).toBe('image');
      expect(component.getFileIcon('application/pdf')).toBe('pdf');
      expect(component.getFileIcon(undefined)).toBe('');
    });
  });

  // ── Téléchargement / ouverture ───────────────────────────────────────────

  describe('downloadGeneratedFile', () => {
    it('télécharge le PDF unifié via le nouvel endpoint pour un fichier unifié', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', status: 'unified', name: 'fiche.pdf' });
      (jobPostServiceMock.downloadUnifiedPdf as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ data: btoa('contenu'), mimeType: 'application/pdf', fileName: 'fiche.pdf' }),
      );

      component.downloadGeneratedFile(file);

      expect(jobPostServiceMock.downloadUnifiedPdf).toHaveBeenCalledWith(1);
    });

    it('utilise l’ancien endpoint de téléchargement pour un fichier non unifié', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({
        id: '1',
        status: 'raw',
        driveFileId: 'd1',
        type: 'application/pdf',
      });
      (jobPostServiceMock.download as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ data: btoa('contenu'), mimeType: 'application/pdf' }),
      );

      component.downloadGeneratedFile(file);

      expect(jobPostServiceMock.download).toHaveBeenCalledWith('d1', 'application/pdf');
    });
  });

  describe('openDocxForEdit', () => {
    it('ouvre directement Google Docs si unifiedDocxId est présent', () => {
      const { component } = setupComponent();
      const file = buildUploadedFile({ id: '1', unifiedDocxId: 'doc-123' });

      component.openDocxForEdit(file);

      expect(window.open).toHaveBeenCalledWith(
        'https://docs.google.com/document/d/doc-123/edit',
        '_blank',
      );
    });

    it('récupère l’URL via le service si unifiedDocxId est absent', () => {
      const { component, jobPostServiceMock } = setupComponent();
      const file = buildUploadedFile({ id: '1', unifiedDocxId: null });
      (jobPostServiceMock.getDocxUrl as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ url: 'https://docs.example.com/edit', docxId: null }),
      );

      component.openDocxForEdit(file);

      expect(jobPostServiceMock.getDocxUrl).toHaveBeenCalledWith(1);
      expect(window.open).toHaveBeenCalledWith('https://docs.example.com/edit', '_blank');
    });
  });

  // ── Dialog / toast ───────────────────────────────────────────────────────

  describe('dialog / toast', () => {
    it('closeDialog réinitialise la configuration du dialog', () => {
      const { component } = setupComponent();
      component.deletePost(buildUploadedFile({ id: undefined }));

      component.closeDialog();

      expect(component.dialogVisible()).toBe(false);
      expect(component.dialogConfig()).toBeNull();
    });

    it('hideToast masque le toast sans changer son message', () => {
      const { component } = setupComponent();
      component.toast.set({ message: 'Fait', type: 'success', visible: true });

      component.hideToast();

      expect(component.toast().visible).toBe(false);
      expect(component.toast().message).toBe('Fait');
    });
  });
});
