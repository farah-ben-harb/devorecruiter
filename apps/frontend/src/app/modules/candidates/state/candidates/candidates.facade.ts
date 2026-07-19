import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '@env/environment';
import { BrowserUiService } from '@core/services/browser-ui.service';
import { CandidatesService } from '../../services/candidates.service';
import { mapCandidateRawToResumeListItems } from '../../mappers/candidates.mapper';
import { CandidateRaw, ResumeListItem, ResumeStatus } from '../../models/candidate.model';
import { UiFacade } from '../uis/ui.facade';
import { ResumeEvaluationFacade } from '../resume-evaluations/resume-evaluations.facade';
import { DriveFile, PaginatedResponse } from '@shared/models/shared.model';

export type FilterType = 'all' | 'brut' | 'unifie';
export type SortField = 'name' | 'createdAt' | 'status';

const ALLOWED_CV_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;

const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024;

function isCandidateRaw(item: ResumeListItem | CandidateRaw): item is CandidateRaw {
  return 'brutDriveName' in item;
}

@Injectable()
export class CandidatesFacade implements OnDestroy {
  private readonly candidatesService = inject(CandidatesService);
  private readonly browserUi = inject(BrowserUiService);
  private readonly destroy$ = new Subject<void>();

  // ── Sub-facades ───────────────────────────────────────────────────────────
  readonly ui = inject(UiFacade);
  readonly scoring = inject(ResumeEvaluationFacade);
  readonly showSendEvaluationModal = signal(false);
  readonly sendEvaluationTarget = signal<ResumeListItem | null>(null);

  // ── Expose ui signals directement pour ne pas casser le composant ─────────
  readonly toast = this.ui.toast;
  readonly dialogConfig = this.ui.dialogConfig;
  readonly dialogVisible = this.ui.dialogVisible;
  readonly showInvalidFileModal = this.ui.showInvalidFileModal;

  // ── Expose scoring signals directement ───────────────────────────────────
  readonly scoringPanelResume = this.scoring.scoringPanelResume;
  readonly scoringResult = this.scoring.scoringResult;
  readonly scoringLoading = this.scoring.scoringLoading;
  readonly scoringTriggering = this.scoring.scoringTriggering;
  readonly scoringError = this.scoring.scoringError;
  readonly downloadingFileId = this.scoring.downloadingFileId;

  // ── State liste ───────────────────────────────────────────────────────────
  readonly resumes = signal<ResumeListItem[]>([]);
  readonly driveFiles = signal<DriveFile[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly driveLoading = signal(false);
  readonly driveError = signal('');
  readonly unifyingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly isModalOpen = signal(false);
  readonly resumeToDelete = signal<ResumeListItem | null>(null);
  readonly showDeleteModal = signal(false);

  // ── Missing fields ────────────────────────────────────────────────────────
  readonly showMissingFieldsModal = signal(false);
  readonly missingFieldsTarget = signal<ResumeListItem | null>(null);
  readonly savingFields = signal(false);

  // ── Filtres / tri / pagination ────────────────────────────────────────────
  readonly totalPages = signal(1);
  readonly totalItems = signal(0);
  readonly filter = signal<FilterType>('all');
  readonly sortField = signal<SortField>('createdAt');
  readonly sortAsc = signal(false);
  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(10);

  readonly brutCount = computed(() => this.resumes().filter((c) => c.type === 'brut').length);
  readonly unifieCount = computed(() => this.resumes().filter((c) => c.type === 'unifie').length);
  readonly incompleteResumes = computed(() =>
    this.resumes().filter((c) => c.type === 'unifie' && c.hasMissingFields),
  );

  readonly filteredTotal = computed(() => {
    let list = this.resumes();
    const f = this.filter();
    const q = this.searchQuery().trim().toLowerCase();
    if (f !== 'all') list = list.filter((c) => c.type === f);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));
    return list.length;
  });

  readonly filteredTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredTotal() / this.itemsPerPage())),
  );

  readonly filteredPages = computed(() =>
    Array.from({ length: this.filteredTotalPages() }, (_, i) => i + 1),
  );

  readonly filtered = computed(() => {
    let list = this.resumes();
    const f = this.filter();
    const q = this.searchQuery().trim().toLowerCase();
    if (f !== 'all') list = list.filter((c) => c.type === f);
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));

    const field = this.sortField();
    const asc = this.sortAsc() ? 1 : -1;
    list = [...list].sort((a, b) => {
      // Unifié toujours en haut (tri prioritaire)
      const typeOrder = (x: ResumeListItem) => (x.type === 'unifie' ? 0 : 1);
      const typeDiff = typeOrder(a) - typeOrder(b);
      if (typeDiff !== 0) return typeDiff;

      // Ensuite le tri choisi par l'utilisateur
      if (field === 'createdAt')
        return asc * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return asc * a[field].localeCompare(b[field]);
    });

    const page = this.currentPage();
    const limit = this.itemsPerPage();
    return list.slice((page - 1) * limit, page * limit);
  });

  init(): void {
    this.loadResumes();
    this.syncInBackground();
  }

  ngOnDestroy(): void {
    this.ui.destroy();
    this.scoring.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page >= 1 && page <= this.filteredTotalPages()) {
      this.currentPage.set(page);
    }
  }

  setFilter(f: FilterType): void {
    this.filter.set(f);
    this.currentPage.set(1);
  }

  setSort(field: SortField): void {
    if (this.sortField() === field) this.sortAsc.update((v) => !v);
    else {
      this.sortField.set(field);
      this.sortAsc.set(true);
    }
    this.currentPage.set(1);
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
    this.currentPage.set(1);
  }

  // ── Modal Drive ───────────────────────────────────────────────────────────

  openDriveModal(): void {
    this.isModalOpen.set(true);
    this.browserUi.addBodyClass('modal-open');
    this.loadDriveFiles();
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.browserUi.removeBodyClass('modal-open');
  }

  // ── Délégation ui ────────────────────────────────────────────────────────

  hideToast(): void {
    this.ui.hideToast();
  }
  confirmDialog(): void {
    this.ui.confirmDialog();
  }
  closeDialog(): void {
    this.ui.closeDialog();
  }
  closeInvalidFileModal(): void {
    this.ui.closeInvalidFileModal();
  }

  // ── Délégation scoring ────────────────────────────────────────────────────

  openScoringPanel(resume: ResumeListItem): void {
    this.scoring.openScoringPanel(resume);
  }
  closeScoringPanel(): void {
    this.scoring.closeScoringPanel();
  }
  triggerScoring(id: string): void {
    this.scoring.triggerScoring(id);
  }
  downloadJobPost(fileId: string, fileName: string): void {
    this.scoring.downloadJobPost(fileId, fileName);
  }
  loadScoringResult(candidateId: string): void {
    this.scoring.loadScoringResult(candidateId);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteResume(resume: ResumeListItem): void {
    this.resumeToDelete.set(resume);
    this.showDeleteModal.set(true);
    this.browserUi.addBodyClass('modal-open');
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.resumeToDelete.set(null);
    this.browserUi.removeBodyClass('modal-open');
  }

  confirmDelete(): void {
    const target = this.resumeToDelete();
    if (!target) return;
    this.candidatesService.deleteResume(target.id, target.type).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.ui.toastSuccess(`"${target.name}" supprimé avec succès`);
        this.loadResumes();
      },
      error: (err) => {
        this.ui.dialogError('Erreur de suppression', err.error?.message ?? err.message);
        this.closeDeleteModal();
      },
    });
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    if (!ALLOWED_CV_MIME_TYPES.includes(file.type as never)) {
      this.ui.showInvalidFileModal.set(true);
      return;
    }
    if (file.size > MAX_CV_SIZE_BYTES) {
      this.ui.dialogError('Fichier trop volumineux', `Max ${MAX_CV_SIZE_BYTES / 1024 / 1024} Mo`);
      return;
    }

    this.uploading.set(true);
    this.candidatesService.uploadResume(file, environment.driveFolderCandidatesBrutsId).subscribe({
      next: (candidate: CandidateRaw) => {
        const [brutItem] = mapCandidateRawToResumeListItems(candidate);
        this.resumes.update((list) => [brutItem, ...list]);
        this.uploading.set(false);
        this.ui.toastSuccess('CV importé avec succès !');
      },
      error: (err) => {
        this.ui.dialogError("Erreur d'import", err.error?.message ?? err.message);
        this.uploading.set(false);
      },
    });
  }

  // ── Unification ───────────────────────────────────────────────────────────

  unify(resume: ResumeListItem): void {
    this.ui.openDialog({
      type: 'warning',
      title: 'Unifier ce CV',
      message: `Voulez-vous déclencher l'unification de "${resume.name}" ?`,
      showCancel: true,
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: () => {
        this.unifyingId.set(resume.id);
        this.resumes.update((list) =>
          list.map((c) =>
            c.id === resume.id && c.type === 'brut'
              ? { ...c, status: 'processing' as ResumeStatus }
              : c,
          ),
        );
        this.candidatesService.triggerUnification(resume.id).subscribe({
          next: () => {
            this.unifyingId.set(null);
            this.candidatesService
              .getAll(this.currentPage(), this.itemsPerPage())
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (response) => {
                  const normalized = response.data.flatMap((item) =>
                    isCandidateRaw(item) ? mapCandidateRawToResumeListItems(item) : [item],
                  );
                  this.resumes.set(normalized);
                  this.totalPages.set(response.meta.totalPages);
                  this.totalItems.set(response.meta.total);

                  const unified = normalized.find((c) => c.id === resume.id && c.type === 'unifie');
                  if (unified?.hasMissingFields) {
                    this.ui.showToast(
                      "CV unifié ! Certains champs n'ont pas pu être extraits automatiquement.",
                      'info',
                      6000,
                    );
                    setTimeout(() => this.openMissingFieldsModal(unified), 600);
                  } else {
                    this.ui.toastSuccess('CV unifié avec succès !');
                  }
                },
              });
          },
          error: (err) => {
            this.ui.dialogError('Erreur', err.error?.message ?? err.message);
            this.unifyingId.set(null);
            this.loadResumes();
          },
        });
      },
    });
  }

  // ── Download ──────────────────────────────────────────────────────────────

  downloadResume(
    resume: ResumeListItem,
    triggerDownload: (blob: Blob, fileName: string) => void,
  ): void {
    this.candidatesService.downloadDriveFile(resume.driveId).subscribe({
      next: (blob) => triggerDownload(blob, resume.name),
      error: () => this.ui.dialogError('Erreur', 'Impossible de télécharger le fichier'),
    });
  }

  // ── Missing fields ────────────────────────────────────────────────────────

  openMissingFieldsModal(resume: ResumeListItem): void {
    this.missingFieldsTarget.set(resume);
    this.showMissingFieldsModal.set(true);
  }

  closeMissingFieldsModal(): void {
    this.showMissingFieldsModal.set(false);
    this.missingFieldsTarget.set(null);
  }

  saveFields(fields: { githubUsername?: string; email?: string }): void {
    const resume = this.missingFieldsTarget();
    if (!resume) return;
    this.savingFields.set(true);
    this.candidatesService.updateFields(resume.id, fields).subscribe({
      next: () => {
        this.savingFields.set(false);
        this.closeMissingFieldsModal();
        this.ui.toastSuccess('Champs mis à jour avec succès !');
        this.loadResumes();
      },
      error: (err) => {
        this.savingFields.set(false);
        this.ui.dialogError('Erreur', err.error?.message ?? err.message);
      },
    });
  }

  private loadResumes(): void {
    this.loading.set(true);
    this.candidatesService.getAll(1, 9999).subscribe({
      next: (response: PaginatedResponse<ResumeListItem>) => {
        this.resumes.set(response.data);
        this.totalPages.set(response.meta.totalPages);
        this.totalItems.set(response.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.ui.showToast('Erreur lors du chargement des CVs.', 'error');
        this.loading.set(false);
      },
    });
  }

  private readonly isSyncing = signal(false);
  private syncInBackground(): void {
    if (this.isSyncing()) return;

    this.isSyncing.set(true);

    setTimeout(() => {
      this.candidatesService
        .syncDrive()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: ({ added, removed }) => {
            this.isSyncing.set(false);
            if (added > 0 || removed > 0) {
              const parts: string[] = [];
              if (added > 0) parts.push(`${added} ajouté(s)`);
              if (removed > 0) parts.push(`${removed} supprimé(s)`);
              this.ui.showToast(`Drive: ${parts.join(', ')}`, 'info');
              this.loadResumes();
            }
          },
          error: () => {
            this.isSyncing.set(false);
          },
        });
    }, 2000);
  }

  private loadDriveFiles(): void {
    this.driveLoading.set(true);
    this.driveError.set('');
    this.candidatesService.listDriveFiles(environment.driveFolderCandidatesBrutsId).subscribe({
      next: (files) => {
        this.driveFiles.set(files);
        this.driveLoading.set(false);
      },
      error: () => {
        this.driveError.set('Erreur lors de la récupération des fichiers Drive.');
        this.driveLoading.set(false);
      },
    });
  }
  openSendEvaluationModal(resume: ResumeListItem): void {
    this.sendEvaluationTarget.set(resume);
    this.showSendEvaluationModal.set(true);
  }

  closeSendEvaluationModal(): void {
    this.showSendEvaluationModal.set(false);
    this.sendEvaluationTarget.set(null);
  }
}
