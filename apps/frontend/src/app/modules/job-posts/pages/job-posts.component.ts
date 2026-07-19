import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';
import { JobPostService } from '../services/job-posts.service';
import {
  PostApiResponse,
  UploadedFile,
  ModalConfig,
  JobPostStatus,
  JobPostRow,
  Toast,
  ToastType,
  DuplicateJobPostPayload,
  EditJobPostPayload,
  EditEvalTypeResult,
  EditJobStatusResult,
} from '../models/job-post.model';

import { AppIconComponent } from '@core/icons/components/icon.component';
import { MenuActionsBase } from '../../../shared/components/base/menu-actions.base';
import { ResumeEvaluationComponent } from '../components/resume-evaluations/resume-evaluations.component';
import { ToastComponent } from '../components/toast/toast.component';
import { DeleteModalComponent } from '../components/delete-modal/delete-modal.component';
import { RoleService } from '@app/shared/services/roles/role.service';
import { ExportService } from '@app/shared/services/export/export.service';
import { ActivatedRoute } from '@angular/router';
import { EditJobPostModalComponent } from '../components/edit-job-post-modal/edit-job-post-modal.component';
import { DuplicateJobPostModalComponent } from '../components/duplicate-job-post-modal/duplicate-job-post-modal.component';
import { GlobalCriteriaModalComponent } from '../components/global-criterias/global-criterias.component';
import { JobPostCriteriaModalComponent } from '../components/job-post-criteria-modal/job-post-criteria-modal.component';
import { EditEvalTypeModalComponent } from '../components/edit-evaluation-type/edit-eval-type-modal.component';
import { EditJobStatusModalComponent } from '../components/edit-job-status-modal/edit-job-status-modal.component';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppIconComponent,
    ResumeEvaluationComponent,
    DeleteModalComponent,
    ToastComponent,
    EditJobPostModalComponent,
    DuplicateJobPostModalComponent,
    GlobalCriteriaModalComponent,
    JobPostCriteriaModalComponent,
    EditEvalTypeModalComponent,
    EditJobStatusModalComponent,
  ],
  templateUrl: './job-posts.component.html',
  styleUrls: ['./job-posts.component.css'],
})
export class JobPostComponent extends MenuActionsBase implements OnInit {
  private readonly jobPostService = inject(JobPostService);
  private readonly router = inject(Router);
  private readonly roleService = inject(RoleService);
  private readonly exportService = inject(ExportService);
  private readonly route = inject(ActivatedRoute);
  readonly showCriteriaModal = signal(false);
  readonly criteriaJobPostId = signal<number | null>(null);
  readonly selectedJobPostForCriteria = signal<UploadedFile | null>(null);
  readonly hasEvaluationFilter = signal(false);
  readonly totalWithEvaluation = signal(0);
  readonly importReport = signal<{ added: number; errors: string[] } | null>(null);
  readonly showJobStatusModal = signal(false);
  readonly jobStatusFile = signal<UploadedFile | null>(null);
  // ── State ──────────────────────────────────────────────────────────────────
  readonly uploadedFiles = signal<UploadedFile[]>([]);
  readonly loading = signal(false);
  readonly unifyingId = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly activeFilter = signal<'all' | 'raw' | 'unified'>('all');
  readonly searchQuery = signal('');
  readonly exportDropdownOpen = signal(false);
  readonly showEditModal = signal(false);
  readonly editingFile = signal<UploadedFile | null>(null);
  readonly savingEdit = signal(false);
  readonly showDuplicateModal = signal(false);
  readonly duplicatingFile = signal<UploadedFile | null>(null);
  readonly savingDuplicate = signal(false);
  readonly showGlobalCriteriaModal = signal(false);
  readonly showEvalTypeModal = signal(false);
  readonly evalTypeFile = signal<UploadedFile | null>(null);
  readonly activeJobStatusFilter = signal<
    'all' | 'open' | 'closed_with_hire' | 'closed_without_hire' | 'none'
  >('all');

  readonly totalAll = signal(0);
  readonly totalUnified = signal(0);
  readonly totalRaw = signal(0);

  readonly isTechnicalReferent = computed(() => this.roleService.isTechnicalReferent());
  private readonly MENU_HEIGHT_JP = 200;

  protected override MENU_HEIGHT = 200;

  readonly currentPage = signal(1);
  readonly itemsPerPage = 10;
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly menuPage = signal(0);
  readonly menuItemsPerPage = 5;

  get pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  readonly selectedJobPost = signal<UploadedFile | null>(null);
  readonly showScoringPanel = signal(false);
  readonly dialogConfig = signal<ModalConfig | null>(null);
  readonly dialogVisible = signal(false);
  readonly toast = signal<Toast>({ message: '', type: 'info', visible: false });
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  readonly fileToDelete = signal<UploadedFile | null>(null);
  readonly showDeleteModal = signal(false);

  private readonly searchSubject = new Subject<string>();

  readonly rows = computed<JobPostRow[]>(() => {
    const all = this.uploadedFiles();
    const raws = all.filter(
      (f) => f.status === 'raw' || f.status === 'processing' || f.status === 'error',
    );
    const unified = all.filter((f) => f.status === 'unified');

    const rows: JobPostRow[] = raws.map((raw) => ({
      raw,
      unified: unified.find((u) => u.driveFileId === raw.driveFileId) ?? null,
    }));

    const matchedIds = new Set(rows.filter((r) => r.unified).map((r) => r.unified!.id));
    unified.filter((u) => !matchedIds.has(u.id)).forEach((u) => rows.push({ raw: u, unified: u }));

    const statusOrder: Record<string, number> = {
      unified: 0,
      processing: 1,
      raw: 2,
      error: 3,
    };

    const sorted = rows.sort(
      (a, b) => (statusOrder[a.raw.status] ?? 99) - (statusOrder[b.raw.status] ?? 99),
    );

    return sorted;
  });

  constructor() {
    super();
    // Debounce 350 ms avant d'appeler l'API
    this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadPosts();
      });
  }

  ngOnInit(): void {
    const hasEvaluation = this.route.snapshot.queryParamMap.get('hasEvaluation');
    this.hasEvaluationFilter.set(hasEvaluation === 'true');
    this.loadPosts();
    this.syncInBackground();
  }

  // ── Recherche ──────────────────────────────────────────────────────────────
  setSearchQuery(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject.next(value);
  }

  // ── Filtres ────────────────────────────────────────────────────────────────
  setFilter(filter: 'all' | 'raw' | 'unified'): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
    this.loadPosts();
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadPosts();
    }
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  triggerFileInput(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,' +
      'application/msword,' +
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
      'application/pdf';
    input.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) this.uploadFile(file);
    };
    input.click();
  }

  private uploadFile(file: File): void {
    this.uploading.set(true);
    this.jobPostService.uploadFile(file).subscribe({
      next: ({ data }) => {
        this.uploading.set(false);
        const newFile = this.mapApiResponseToFile(data);
        this.uploadedFiles.update((files) => [newFile, ...files]);
        this.toastSuccess(`"${newFile.name}" importé avec succès`);
        this.loadPosts(); // rafraîchir les compteurs
      },
      error: (err) => {
        this.uploading.set(false);
        this.dialogError(
          "Erreur d'importation",
          err.error?.message ?? "Impossible d'importer la fiche",
        );
      },
    });
  }

  // ── Unification ────────────────────────────────────────────────────────────
  unify(file: UploadedFile): void {
    if (!file.id) {
      this.dialogError('Erreur', 'ID de la fiche manquant');
      return;
    }
    this.unifyingId.set(file.id);
    this.uploadedFiles.update((files) =>
      files.map((f) => (f.id === file.id ? { ...f, status: 'processing' as JobPostStatus } : f)),
    );
    this.jobPostService
      .triggerUnification(+file.id)
      .pipe(timeout(150_000))
      .subscribe({
        next: () => {
          this.toastSuccess(`"${file.name}" unifiée avec succès`);
          this.unifyingId.set(null);
          this.loadPosts();
        },
        error: (err) => {
          this.unifyingId.set(null);
          this.dialogError("Erreur d'unification", err.error?.message ?? err.message);
          this.loadPosts();
        },
      });
  }

  openVersion(url: string): void {
    window.open(url, '_blank');
  }

  // ── Suppression ────────────────────────────────────────────────────────────
  deletePost(file: UploadedFile): void {
    if (!file.id) {
      this.dialogError('Erreur', 'ID de post manquant');
      return;
    }
    this.fileToDelete.set(file);
    this.showDeleteModal.set(true);
    document.body.classList.add('modal-open');
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.fileToDelete.set(null);
    document.body.classList.remove('modal-open');
  }

  confirmDelete(): void {
    const file = this.fileToDelete();
    if (!file) return;
    this.jobPostService.delete(file.id!).subscribe({
      next: ({ action }) => {
        this.closeDeleteModal();
        if (action === 'reset') {
          this.uploadedFiles.update((files) =>
            files.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    status: 'raw' as JobPostStatus,
                    googleDocId: undefined,
                    unifiedUrl: undefined,
                  }
                : f,
            ),
          );
          this.toastSuccess(`"${file.name}" remis en brut`);
        } else {
          this.uploadedFiles.update((files) => files.filter((f) => f.id !== file.id));
          this.toastSuccess(`"${file.name}" supprimé avec succès`);
        }
        this.loadPosts(); // rafraîchir les compteurs
      },
      error: (err) => {
        this.dialogError('Erreur de suppression', err.error?.message ?? err.message);
        this.closeDeleteModal();
      },
    });
  }

  downloadGeneratedFile(file: UploadedFile): void {
    if (file.status !== 'unified') {
      // Comportement existant pour les fichiers non unifiés
      const fileId = file.driveFileId;
      const mimeType = file.type || 'application/pdf';
      if (!fileId) {
        this.dialogError('Erreur', 'Aucun fichier disponible');
        return;
      }
      this.jobPostService.download(fileId, mimeType).subscribe({
        next: (response) => {
          const blob = this.base64ToBlob(response.data, response.mimeType);
          const ext = this.getMimeExtension(response.mimeType);
          this.triggerDownload(blob, this.stripExtension(file.name) + '.' + ext);
          this.toastSuccess('Document téléchargé avec succès');
        },
        error: () => this.dialogError('Erreur de téléchargement', 'Impossible de télécharger'),
      });
      return;
    }

    // Pour les fiches unifiées → PDF via le nouvel endpoint
    if (!file.id) {
      this.dialogError('Erreur', 'ID de la fiche manquant');
      return;
    }

    this.jobPostService.downloadUnifiedPdf(Number(file.id)).subscribe({
      next: (response) => {
        const blob = this.base64ToBlob(response.data, response.mimeType);
        const fileName = response.fileName ?? this.stripExtension(file.name) + '.pdf';
        this.triggerDownload(blob, fileName);
        this.toastSuccess('Document téléchargé avec succès');
      },
      error: () => this.dialogError('Erreur de téléchargement', 'Impossible de télécharger le PDF'),
    });
  }

  openDocxForEdit(file: UploadedFile): void {
    if (!file.id) {
      this.dialogError('Erreur', 'ID de la fiche manquant');
      return;
    }

    if (file.unifiedDocxId) {
      // Google Doc → éditeur Docs directement
      window.open(`https://docs.google.com/document/d/${file.unifiedDocxId}/edit`, '_blank');
      return;
    }

    this.jobPostService.getDocxUrl(Number(file.id)).subscribe({
      next: ({ url }) => {
        if (url) window.open(url, '_blank');
        else this.dialogError('Erreur', 'Aucun fichier disponible');
      },
      error: () => this.dialogError('Erreur', 'Impossible de récupérer le fichier'),
    });
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  openScoringPanel(file: UploadedFile): void {
    this.selectedJobPost.set(file);
    this.showScoringPanel.set(true);
    document.body.classList.add('modal-open');
  }

  closeScoringPanel(): void {
    this.showScoringPanel.set(false);
    this.selectedJobPost.set(null);
    document.body.classList.remove('modal-open');
  }

  // ── Critères Globaux ───────────────────────────────────────────────────────
  openGlobalCriteriaModal(): void {
    this.showGlobalCriteriaModal.set(true);
    document.body.classList.add('modal-open');
  }

  closeGlobalCriteriaModal(): void {
    this.showGlobalCriteriaModal.set(false);
    document.body.classList.remove('modal-open');
  }

  // ── Chargement principal ───────────────────────────────────────────────────
  private loadPosts(): void {
    this.loading.set(true);
    const filter = this.activeFilter();
    const status = filter === 'all' ? undefined : filter;
    const jobStatusFilter = this.activeJobStatusFilter();
    const jobStatus = jobStatusFilter === 'all' ? undefined : jobStatusFilter;

    const request$ = this.hasEvaluationFilter()
      ? this.jobPostService.getAllWithEvaluations(
          this.currentPage(),
          this.itemsPerPage,
          this.searchQuery() || undefined,
        )
      : this.jobPostService.getAll(
          this.currentPage(),
          this.itemsPerPage,
          this.searchQuery() || undefined,
          status,
          jobStatus,
        );

    request$.subscribe({
      next: (response) => {
        this.uploadedFiles.set(response.data.map((f) => this.mapApiResponseToFile(f)));
        this.totalPages.set(response.meta?.totalPages ?? response.totalPages ?? 1);
        this.totalItems.set(response.meta?.total ?? response.total ?? 0);
        this.totalAll.set(response.meta?.totalAll ?? response.meta?.total ?? response.total ?? 0);
        this.totalUnified.set(response.meta?.totalUnified ?? 0);
        this.totalRaw.set(response.meta?.totalRaw ?? 0);
        this.totalWithEvaluation.set(response.meta?.totalWithEvaluation ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erreur récupération posts', err);
        this.loading.set(false);
      },
    });
  }
  private getMimeExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'text/plain': 'txt',
    };
    return map[mimeType] ?? 'pdf';
  }
  private syncInBackground(): void {
    this.jobPostService
      .syncFromDrive(environment.driveFolderJobPostsId, environment.driveFolderJobPostsUnifiedId)
      .subscribe({
        next: ({ added, removed }) => {
          if (added > 0 || removed > 0) {
            const parts: string[] = [];
            if (added > 0) parts.push(`${added} ajoutée(s)`);
            if (removed > 0) parts.push(`${removed} supprimée(s)`);
            this.toastSuccess(`Drive: ${parts.join(', ')}`);
            this.loadPosts();
          }
        },
        error: () => {},
      });
  }

  // ── Dialog ─────────────────────────────────────────────────────────────────
  private openDialog(config: ModalConfig): void {
    this.dialogConfig.set(config);
    this.dialogVisible.set(true);
    document.body.classList.add('modal-open');
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.dialogConfig.set(null);
    document.body.classList.remove('modal-open');
  }

  confirmDialog(): void {
    this.dialogConfig()?.onConfirm?.();
    this.closeDialog();
  }

  private dialogError(title: string, message: string): void {
    this.openDialog({ type: 'error', title, message, confirmText: 'OK' });
  }
  override toggleMenu(id: string | undefined, event: MouseEvent): void {
    if (!id) return;
    event.stopPropagation();

    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

    this.menuPage.set(0);
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const openUpward = rect.bottom + this.MENU_HEIGHT > viewportHeight;

    const menuWidth = 208;
    let left = rect.left - menuWidth + rect.width;
    if (left < 8) left = 8;
    if (left + menuWidth > viewportWidth - 8) left = viewportWidth - menuWidth - 8;

    this.menuPosition = {
      top: openUpward ? rect.top - this.MENU_HEIGHT : rect.bottom + 4,
      left,
    };

    this.openMenuId.set(id);
  }
  // ── Toast ──────────────────────────────────────────────────────────────────
  private showToast(
    message: string,
    type: ToastType,
    duration = environment.toastDurationMs,
  ): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type, visible: true });
    this.toastTimer = setTimeout(() => this.hideToast(), duration);
  }

  hideToast(): void {
    this.toast.update((t) => ({ ...t, visible: false }));
  }

  private toastSuccess(message: string): void {
    this.showToast(message, 'success');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private mapApiResponseToFile(data: PostApiResponse): UploadedFile {
    return {
      id: data.id?.toString(),
      name: data.name ?? 'Sans nom',
      type: data.type ?? `${environment.googleMimePrefix}.document`,
      isDriveFile: true,
      url: data.url ?? '',
      googleDocId: data.googleDocId ?? data.generatedDocId ?? data.document_id,
      driveFileId: data.googleDriveFileId,
      status: data.status ?? 'raw',
      unifiedUrl: data.unifiedUrl,
      unifiedDocxId: data.unifiedDocxId ?? null,
      company: data.company,
      startDate: data.startDate,
      isLoading: false,
      title: data.title,
      hasEvaluation: data.hasEvaluation ?? false,
      requiresCoding: data.requiresCoding ?? null,
      hasQcm: data.hasQcm ?? null,
      jobStatus: data.jobStatus ?? null,
      linkedCandidateIds: data.linkedCandidateIds ?? [],
    };
  }

  stripExtension(name: string): string {
    return name?.replace(/\.[^/.]+$/, '') ?? 'document';
  }

  rawName(name: string): string {
    return this.stripExtension(name) + '_raw';
  }

  unifiedName(name: string): string {
    return this.stripExtension(name) + '_unifié';
  }

  getFileIcon(fileType?: string): string {
    if (!fileType) return '';
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'pdf';
    return '';
  }

  statusLabel(status?: JobPostStatus): string {
    return (
      (
        {
          raw: 'Brute',
          processing: 'En cours...',
          unified: 'Unifiée',
          error: 'Erreur',
        } as Record<JobPostStatus, string>
      )[status ?? 'raw'] ?? 'Brut'
    );
  }

  statusClass(status?: JobPostStatus): string {
    return (
      (
        {
          raw: 'bg-blue-100 text-blue-700',
          processing: 'bg-yellow-100 text-yellow-700',
          unified: 'bg-green-100 text-green-700',
          error: 'bg-red-100 text-red-700',
        } as Record<JobPostStatus, string>
      )[status ?? 'raw'] ?? ''
    );
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = Array.from(byteCharacters, (c) => c.charCodeAt(0));
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
  exportExcel(): void {
    this.exportService.exportJobPostsExcel();
  }

  exportZip(): void {
    this.exportService.exportJobPostsZip();
  }
  toggleExportDropdown(): void {
    this.exportDropdownOpen.update((v) => !v);
  }

  closeExportDropdown(): void {
    this.exportDropdownOpen.set(false);
  }

  removeEvaluationType(file: UploadedFile, type: 'qcm' | 'coding', event: Event): void {
    event.stopPropagation();
    const id = Number(file.id);

    if (type === 'coding') {
      const previous = file.requiresCoding;
      this.uploadedFiles.update((files) =>
        files.map((f) => (f.id === file.id ? { ...f, requiresCoding: false } : f)),
      );
      this.jobPostService.updateRequiresCoding(id, false).subscribe({
        error: () => {
          this.uploadedFiles.update((files) =>
            files.map((f) => (f.id === file.id ? { ...f, requiresCoding: previous } : f)),
          );
          this.toastSuccess('Erreur lors de la mise à jour');
        },
      });
    }

    if (type === 'qcm') {
      const previous = file.hasQcm;
      this.uploadedFiles.update((files) =>
        files.map((f) => (f.id === file.id ? { ...f, hasQcm: false } : f)),
      );
      this.jobPostService.updateHasQcm(id, false).subscribe({
        error: () => {
          this.uploadedFiles.update((files) =>
            files.map((f) => (f.id === file.id ? { ...f, hasQcm: previous } : f)),
          );
          this.toastSuccess('Erreur lors de la mise à jour');
        },
      });
    }
  }

  openEvaluations(file: UploadedFile): void {
    if (!file.id) {
      this.dialogError('Erreur', 'ID de la fiche manquant');
      return;
    }
    this.router.navigate(['/technical-evaluations'], {
      queryParams: { jobPostId: file.id, company: file.company ?? '', mode: 'coding' },
    });
  }

  openQcmList(file: UploadedFile): void {
    if (!file.id) {
      this.dialogError('Erreur', 'ID de la fiche manquant');
      return;
    }
    this.router.navigate(['/technical-evaluations'], {
      queryParams: { jobPostId: file.id, company: file.company ?? '', mode: 'quiz' },
    });
  }

  openEditModal(file: UploadedFile): void {
    this.editingFile.set(file);
    this.showEditModal.set(true);
    document.body.classList.add('modal-open');
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingFile.set(null);
    document.body.classList.remove('modal-open');
  }

  confirmEdit(payload: EditJobPostPayload): void {
    const file = this.editingFile();
    if (!file?.id) return;
    const id = Number(file.id);
    this.savingEdit.set(true);

    const updates = [
      this.jobPostService.updateTitle(id, payload.title, payload.company),
      this.jobPostService.updateRequiresCoding(id, payload.requiresCoding),
      this.jobPostService.updateHasQcm(id, payload.hasQcm),
    ];

    Promise.all(updates.map((obs) => obs.toPromise()))
      .then(() => {
        this.uploadedFiles.update((files) =>
          files.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  title: payload.title,
                  company: payload.company,
                  requiresCoding: payload.requiresCoding,
                  hasQcm: payload.hasQcm,
                }
              : f,
          ),
        );
        this.toastSuccess('Fiche modifiée avec succès');
        this.closeEditModal();
      })
      .catch(() => {
        this.dialogError('Erreur', 'Impossible de modifier la fiche');
      })
      .finally(() => {
        this.savingEdit.set(false);
      });
  }

  openDuplicateModal(file: UploadedFile): void {
    this.duplicatingFile.set(file);
    this.showDuplicateModal.set(true);
    document.body.classList.add('modal-open');
  }

  closeDuplicateModal(): void {
    this.showDuplicateModal.set(false);
    this.duplicatingFile.set(null);
    document.body.classList.remove('modal-open');
  }

  confirmDuplicate(payload: DuplicateJobPostPayload): void {
    const file = this.duplicatingFile();
    if (!file?.id) return;
    this.savingDuplicate.set(true);

    this.jobPostService.duplicate(Number(file.id), payload).subscribe({
      next: (data) => {
        const newFile = this.mapApiResponseToFile(data);
        this.uploadedFiles.update((files) => [newFile, ...files]);
        this.toastSuccess('Fiche dupliquée avec succès');
        this.closeDuplicateModal();
        this.loadPosts();
      },
      error: () => {
        this.dialogError('Erreur', 'Impossible de dupliquer la fiche');
        this.savingDuplicate.set(false);
      },
      complete: () => {
        this.savingDuplicate.set(false);
      },
    });
  }

  openUnifiedVersion(file: UploadedFile): void {
    if (file.unifiedDocxId) {
      window.open(`https://drive.google.com/file/d/${file.unifiedDocxId}/view`, '_blank');
      return;
    }
    if (file.unifiedUrl) {
      window.open(file.unifiedUrl, '_blank');
    }
  }

  openCriteriaModal(file: UploadedFile): void {
    if (!file.id) {
      this.dialogError('Erreur', 'ID de la fiche manquant');
      return;
    }

    this.selectedJobPostForCriteria.set(file);
    this.criteriaJobPostId.set(Number(file.id));
    this.showCriteriaModal.set(true);
    document.body.classList.add('modal-open');
  }

  closeCriteriaModal(): void {
    this.showCriteriaModal.set(false);
    this.criteriaJobPostId.set(null);
    this.selectedJobPostForCriteria.set(null);
    document.body.classList.remove('modal-open');
  }

  handleFileUpdate(updatedFile: UploadedFile): void {
    this.uploadedFiles.update((files) =>
      files.map((f) =>
        f.id === updatedFile.id
          ? {
              ...f,
              title: updatedFile.title,
              company: updatedFile.company,
              requiresCoding: updatedFile.requiresCoding,
              hasQcm: updatedFile.hasQcm,
            }
          : f,
      ),
    );
    this.toastSuccess('Fiche mise à jour avec succès');
  }

  get menuPagedItems(): string[] {
    // utilisé uniquement pour calculer le nombre de pages
    return [];
  }

  openMenuPageCount(rowId: string): number {
    const row = this.rows().find((r) => r.raw.id === rowId);
    if (!row) return 1;
    return Math.ceil(this.getMenuItems(row.raw).length / this.menuItemsPerPage);
  }

  getMenuItems(file: UploadedFile): { key: string }[] {
    const items: { key: string }[] = [];
    if (!this.isTechnicalReferent()) {
      if (file.status === 'raw' || file.status === 'error') items.push({ key: 'unify' });
      if (file.status === 'unified') items.push({ key: 'scoring' });
    }
    if (file.status === 'unified') {
      if (file.requiresCoding) items.push({ key: 'evaluations' });
      if (file.hasQcm) items.push({ key: 'qcm' });
    }
    items.push({ key: 'download' });
    if (file.url) items.push({ key: 'rawVersion' });
    if (file.status === 'unified' && (file.unifiedDocxId || file.unifiedUrl))
      items.push({ key: 'unifiedVersion' });
    if (!this.isTechnicalReferent() && file.status === 'unified') {
      items.push({ key: 'editFiche' });
      items.push({ key: 'editCriteria' });
      items.push({ key: 'evalType' });
    }
    if (!this.isTechnicalReferent()) items.push({ key: 'duplicate' });
    if (!this.isTechnicalReferent()) items.push({ key: 'delete' });
    if (!this.isTechnicalReferent()) items.push({ key: 'jobStatusEdit' });
    return items;
  }

  menuNextPage(): void {
    const id = this.openMenuId();
    if (!id) return;
    const total = this.openMenuPageCount(id);
    if (this.menuPage() < total - 1) this.menuPage.update((p) => p + 1);
  }

  menuPrevPage(): void {
    if (this.menuPage() > 0) this.menuPage.update((p) => p - 1);
  }

  isMenuItemVisible(key: string, file: UploadedFile): boolean {
    const all = this.getMenuItems(file);
    const start = this.menuPage() * this.menuItemsPerPage;
    const page = all.slice(start, start + this.menuItemsPerPage);
    return page.some((i) => i.key === key);
  }

  openEvalTypeModal(file: UploadedFile): void {
    this.evalTypeFile.set(file);
    this.showEvalTypeModal.set(true);
    document.body.classList.add('modal-open');
  }

  closeEvalTypeModal(): void {
    this.showEvalTypeModal.set(false);
    this.evalTypeFile.set(null);
    document.body.classList.remove('modal-open');
  }

  confirmEvalType(result: EditEvalTypeResult): void {
    const file = this.evalTypeFile();
    if (!file) return;
    this.uploadedFiles.update((files) =>
      files.map((f) =>
        f.id === file.id
          ? { ...f, hasQcm: result.hasQcm, requiresCoding: result.requiresCoding }
          : f,
      ),
    );
    this.toastSuccess("Type d'évaluation mis à jour avec succès");
    this.closeEvalTypeModal();
  }

  setJobStatusFilter(
    filter: 'all' | 'open' | 'closed_with_hire' | 'closed_without_hire' | 'none',
  ): void {
    this.activeJobStatusFilter.set(filter);
    this.currentPage.set(1);
    this.loadPosts();
  }

  openJobStatusModal(file: UploadedFile): void {
    if (!file.id) {
      this.dialogError('Erreur', 'ID de la fiche manquant');
      return;
    }
    this.jobStatusFile.set(file);
    this.showJobStatusModal.set(true);
    document.body.classList.add('modal-open');
  }

  closeJobStatusModal(): void {
    this.showJobStatusModal.set(false);
    this.jobStatusFile.set(null);
    document.body.classList.remove('modal-open');
  }

  confirmJobStatus(result: EditJobStatusResult): void {
    const file = this.jobStatusFile();
    if (!file) return;

    this.uploadedFiles.update((files) =>
      files.map((f) =>
        f.id === file.id
          ? { ...f, jobStatus: result.jobStatus, linkedCandidateIds: result.linkedCandidateIds }
          : f,
      ),
    );

    this.toastSuccess('État de la fiche mis à jour avec succès');
    this.closeJobStatusModal();
  }
}
