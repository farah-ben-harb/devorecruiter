import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@env/environment';
import { BrowserUiService } from '@core/services/browser-ui.service';
import { forkJoin } from 'rxjs';
import { JobPostService } from '../services/job-posts.service';
import {
  mapPostApiResponseToUploadedFile,
  mapResumeEvaluationToDisplay,
  sortScoringsByScore,
} from '../mappers/job-posts.mapper';
import {
  DriveFile,
  ModalConfig,
  PaginatedResponse,
  PostApiResponse,
  ScoringResume,
  UploadedFile,
  ToastType,
  Toast,
} from '../models/job-post.model';

@Injectable()
export class JobPostFacade {
  private readonly jobPostService = inject(JobPostService);
  private readonly browserUi = inject(BrowserUiService);

  readonly uploadedFiles = signal<UploadedFile[]>([]);
  readonly driveFiles = signal<DriveFile[]>([]);
  readonly driveLoading = signal(false);
  readonly driveError = signal('');
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(10);
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  readonly isModalOpen = signal(false);
  readonly dialogConfig = signal<ModalConfig | null>(null);
  readonly dialogVisible = signal(false);
  readonly toast = signal<Toast>({ message: '', type: 'info', visible: false });
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  readonly fileToDelete = signal<{ index: number; file: UploadedFile } | null>(null);
  readonly showDeleteModal = signal(false);

  readonly scorings = signal<ScoringResume[]>([]);
  readonly loadingScoring = signal(false);
  readonly loadingAll = signal(false);
  readonly loadingResumeId = signal<string | null>(null);
  readonly scoringError = signal<string | null>(null);
  readonly selectedScoringResume = signal<ScoringResume | null>(null);
  readonly showScoringListModal = signal(false);
  readonly showScoringDetailModal = signal(false);
  readonly scoringToastMessage = signal<string | null>(null);
  readonly scoringToastType = signal<'success' | 'error'>('success');
  private scoringToastTimer: ReturnType<typeof setTimeout> | null = null;
  readonly rescoringId = signal<number | null>(null);

  init(): void {
    this.loadSavedPosts();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadSavedPosts();
    }
  }

  openDriveModal(): void {
    this.isModalOpen.set(true);
    this.browserUi.addBodyClass('modal-open');
    this.loadDriveFiles();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.browserUi.removeBodyClass('modal-open');
  }

  confirmDialog(): void {
    this.dialogConfig()?.onConfirm?.();
    this.closeDialog();
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.dialogConfig.set(null);
    this.browserUi.removeBodyClass('modal-open');
  }

  deletePost(index: number): void {
    const file = this.uploadedFiles()[index];
    if (!file.id) {
      this.dialogError('Erreur', 'ID de post manquant');
      return;
    }
    this.fileToDelete.set({ index, file });
    this.showDeleteModal.set(true);
    this.browserUi.addBodyClass('modal-open');
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.fileToDelete.set(null);
    this.browserUi.removeBodyClass('modal-open');
  }

  confirmDelete(): void {
    const target = this.fileToDelete();
    if (!target || !target.file.id) return;
    this.jobPostService.delete(target.file.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.toastSuccess(`"${target.file.name}" supprimé avec succès`);
        this.loadSavedPosts();
      },
      error: (err) => {
        this.dialogError('Erreur de suppression', err.error?.message ?? err.message);
        this.closeDeleteModal();
      },
    });
  }

  selectDriveFile(file: DriveFile): void {
    this.closeModal();
    const loadingFile: UploadedFile = {
      name: `${file.name} (traitement en cours...)`,
      displayName: `${file.name}_raw`,
      status: 'raw',
      url: '',
      type: file.mimeType,
      isDriveFile: true,
      isLoading: true,
      jobStatus: null,
      linkedCandidateIds: [],
    };
    this.uploadedFiles.update((files) => [loadingFile, ...files]);
    this.driveFiles.update((files) => files.filter((df) => df.id !== file.id));
    this.jobPostService
      .process({
        googleDriveFileId: file.id,
        name: file.name,
        type: file.mimeType,
        url: `https://drive.google.com/file/d/${file.id}/view`,
      })
      .subscribe({
        next: () => {
          this.toastSuccess('Fichier importé avec succès');
          this.loadSavedPosts();
        },
        error: (err) => {
          this.uploadedFiles.update((files) => files.filter((f) => f !== loadingFile));
          this.dialogError("Erreur d'import", err.error?.message ?? err.message);
        },
      });
  }

  downloadGeneratedFile(
    file: UploadedFile,
    triggerDownload: (blob: Blob, fileName: string) => void,
    stripExtension: (name: string) => string,
  ): void {
    if (!file.googleDocId) {
      this.dialogError('Erreur', 'Aucun document généré associé');
      return;
    }
    this.jobPostService.download(file.googleDocId).subscribe({
      next: (response) => {
        const blob = this.base64ToBlob(response.data, response.mimeType);
        triggerDownload(blob, response.fileName || `${stripExtension(file.name)}.pdf`);
        this.toastSuccess('Document généré téléchargé avec succès');
      },
      error: () =>
        this.dialogError('Erreur de téléchargement', 'Impossible de télécharger le document'),
    });
  }

  hideToast(): void {
    this.toast.update((t) => ({ ...t, visible: false }));
  }

  unscoredResumes(jobPostId: number): DriveFile[] {
    const scoredIds = new Set(
      this.scorings()
        .filter((s) => s.jobPostId === jobPostId)
        .map((s) => s.resumeFileId),
    );
    return this.driveFiles().filter((f) => !scoredIds.has(f.id));
  }

  loadScoringData(jobPostId: number): void {
    this.loadingScoring.set(true);
    this.scoringError.set(null);
    forkJoin({
      scorings: this.jobPostService.getScoringsByJobPost(jobPostId),
      driveFiles: this.jobPostService.listDriveFiles(environment.resumeFolderId),
    }).subscribe({
      next: ({ scorings, driveFiles }) => {
        this.scorings.set(sortScoringsByScore(scorings.map(mapResumeEvaluationToDisplay)));
        this.driveFiles.set(driveFiles);
        this.loadingScoring.set(false);
      },
      error: () => {
        this.scoringError.set('Erreur lors du chargement des données.');
        this.loadingScoring.set(false);
      },
    });
  }

  openScoringListModal(): void {
    this.showScoringListModal.set(true);
    this.browserUi.addBodyClass('modal-open');
  }

  closeScoringListModal(): void {
    this.showScoringListModal.set(false);
    this.browserUi.removeBodyClass('modal-open');
  }

  openScoringDetail(scoring: ScoringResume): void {
    this.selectedScoringResume.set(scoring);
    this.showScoringListModal.set(false);
    this.showScoringDetailModal.set(true);
  }

  backToScoringList(): void {
    this.showScoringDetailModal.set(false);
    this.showScoringListModal.set(true);
  }

  closeScoringDetailModal(): void {
    this.showScoringDetailModal.set(false);
    this.selectedScoringResume.set(null);
    this.browserUi.removeBodyClass('modal-open');
  }

  scoreAllCVs(
    jobPostId: number,
    payload: { jobPostGoogleDriveFileId: string; jobPostId: number },
  ): void {
    this.loadingAll.set(true);
    this.scoringError.set(null);
    this.jobPostService.triggerAllScoring(payload).subscribe({
      next: (results) => {
        this.scorings.set(sortScoringsByScore(results.map(mapResumeEvaluationToDisplay)));
        this.loadingAll.set(false);
        this.showScoringToast(`${results.length} CV(s) scoré(s) avec succès`, 'success');
      },
      error: () => {
        this.scoringError.set('Erreur lors du scoring — vérifiez que n8n est actif.');
        this.loadingAll.set(false);
        this.showScoringToast('Erreur lors du scoring en masse', 'error');
      },
    });
  }

  deleteScoringResume(id: number): void {
    this.jobPostService.deleteScoring(id).subscribe({
      next: () => {
        this.scorings.update((s) => s.filter((x) => x.id !== id));
        if (this.selectedScoringResume()?.id === id) this.selectedScoringResume.set(null);
        this.showScoringToast('Scoring supprimé avec succès', 'success');
      },
      error: () => this.showScoringToast('Erreur lors de la suppression', 'error'),
    });
  }

  showScoringToast(message: string, type: 'success' | 'error'): void {
    if (this.scoringToastTimer) clearTimeout(this.scoringToastTimer);
    this.scoringToastMessage.set(message);
    this.scoringToastType.set(type);
    this.scoringToastTimer = setTimeout(() => this.scoringToastMessage.set(null), 3000);
  }

  hideScoringToast(): void {
    this.scoringToastMessage.set(null);
  }

  private loadSavedPosts(): void {
    this.jobPostService.getAll(this.currentPage(), this.itemsPerPage()).subscribe({
      next: (response: PaginatedResponse<PostApiResponse>) => {
        this.uploadedFiles.set(response.data.map((f) => mapPostApiResponseToUploadedFile(f)));
        this.totalPages.set(response.meta?.totalPages ?? response.totalPages ?? 1);
        this.totalItems.set(response.meta?.total ?? response.total ?? 0);
      },
      error: (err) => console.error('Erreur récupération posts', err),
    });
  }

  private loadDriveFiles(): void {
    this.driveLoading.set(true);
    this.driveError.set('');
    forkJoin({
      driveFiles: this.jobPostService.listDriveFiles(environment.driveFolderJobPostsId),
      importedIds: this.jobPostService.getImportedFileIds(),
    }).subscribe({
      next: ({ driveFiles, importedIds }) => {
        this.driveFiles.set(driveFiles.filter((f) => !importedIds.includes(f.id)));
        this.driveLoading.set(false);
      },
      error: () => {
        this.driveError.set('Erreur lors de la récupération des fichiers Drive.');
        this.driveLoading.set(false);
      },
    });
  }

  private showToast(
    message: string,
    type: ToastType,
    duration = environment.toastDurationMs,
  ): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ message, type, visible: true });
    this.toastTimer = setTimeout(() => this.hideToast(), duration);
  }

  private toastSuccess(message: string): void {
    this.showToast(message, 'success');
  }

  private openDialog(config: ModalConfig): void {
    this.dialogConfig.set(config);
    this.dialogVisible.set(true);
    this.browserUi.addBodyClass('modal-open');
  }

  private dialogError(title: string, message: string): void {
    this.openDialog({ type: 'error', title, message, confirmText: 'OK' });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const bytes = atob(base64);
    const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    return new Blob([buffer], { type: mimeType });
  }

  rescoreOne(evaluationId: number): void {
    this.rescoringId.set(evaluationId);
    this.jobPostService.rescoreOne(evaluationId).subscribe({
      next: (updated) => {
        this.scorings.update((list) =>
          sortScoringsByScore(
            list.map((s) =>
              s.id === evaluationId
                ? mapResumeEvaluationToDisplay({ ...updated, isOutdated: false })
                : s,
            ),
          ),
        );
        // Met à jour le détail ouvert si c'est le même
        if (this.selectedScoringResume()?.id === evaluationId) {
          this.selectedScoringResume.set(
            mapResumeEvaluationToDisplay({ ...updated, isOutdated: false }),
          );
        }
        this.rescoringId.set(null);
        this.showScoringToast('CV rescoré avec succès', 'success');
      },
      error: () => {
        this.rescoringId.set(null);
        this.showScoringToast('Erreur lors du rescoring', 'error');
      },
    });
  }
}
