import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CandidatesFacade, FilterType, SortField } from '../state/candidates/candidates.facade';
import { ResumeListItem, FILTER_OPTIONS } from '../models/candidate.model';
import { AppIconComponent } from '@app/core/icons/components/icon.component';
import { JobPostEvaluationComponent } from '../components/job-post-evaluations/job-post-evaluations.component';
import { UiFacade } from '../state/uis/ui.facade';
import { ResumeEvaluationFacade } from '../state/resume-evaluations/resume-evaluations.facade';
import { ExportService } from '@app/shared/services/export/export.service';
import { SendEvaluationModalComponent } from '../components/send-evaluations/send-evaluation-modal.component';

@Component({
  selector: 'app-candidates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppIconComponent,
    JobPostEvaluationComponent,
    SendEvaluationModalComponent,
  ],
  templateUrl: './candidates.component.html',
  providers: [CandidatesFacade, UiFacade, ResumeEvaluationFacade],
})
export class CandidatesComponent implements OnInit {
  private readonly facade = inject(CandidatesFacade);

  private readonly MENU_HEIGHT = 200;
  private readonly exportService = inject(ExportService);
  readonly filterOptions = FILTER_OPTIONS;

  readonly resumes = this.facade.resumes;
  readonly filtered = this.facade.filtered;
  readonly driveFiles = this.facade.driveFiles;
  readonly loading = this.facade.loading;
  readonly uploading = this.facade.uploading;
  readonly driveLoading = this.facade.driveLoading;
  readonly driveError = this.facade.driveError;
  readonly unifyingId = this.facade.unifyingId;
  readonly deletingId = this.facade.deletingId;
  readonly filter = this.facade.filter;
  readonly sortField = this.facade.sortField;
  readonly sortAsc = this.facade.sortAsc;
  readonly brutCount = this.facade.brutCount;
  readonly unifieCount = this.facade.unifieCount;
  readonly isModalOpen = this.facade.isModalOpen;
  readonly dialogConfig = this.facade.dialogConfig;
  readonly dialogVisible = this.facade.dialogVisible;
  readonly toast = this.facade.toast;
  readonly searchQuery = this.facade.searchQuery;

  readonly scoringPanelResume = this.facade.scoringPanelResume;
  readonly exportDropdownOpen = signal(false);
  readonly importReport = signal<{ added: number; errors: string[] } | null>(null);
  readonly scoringResult = this.facade.scoringResult;
  readonly scoringLoading = this.facade.scoringLoading;
  readonly scoringTriggering = this.facade.scoringTriggering;
  readonly scoringError = this.facade.scoringError;
  readonly downloadingFileId = this.facade.downloadingFileId;
  readonly currentPage = this.facade.currentPage;

  readonly resumeToDelete = this.facade.resumeToDelete;
  readonly showDeleteModal = this.facade.showDeleteModal;
  readonly showInvalidFileModal = this.facade.showInvalidFileModal;
  readonly filteredTotal = this.facade.filteredTotal;
  readonly filteredTotalPages = this.facade.filteredTotalPages;
  readonly filteredPages = this.facade.filteredPages;
  readonly incompleteResumes = this.facade.incompleteResumes;

  readonly showMissingFieldsModal = this.facade.showMissingFieldsModal;
  readonly missingFieldsTarget = this.facade.missingFieldsTarget;
  readonly savingFields = this.facade.savingFields;
  readonly showSendEvaluationModal = this.facade.showSendEvaluationModal;
  readonly sendEvaluationTarget = this.facade.sendEvaluationTarget;

  githubUsernameInput = '';
  emailInput = '';

  // ── Menu actions ─────────────────────────────────────────────────────────
  readonly openMenuId = signal<string | null>(null);
  menuPosition: { top: number; left: number } = { top: 0, left: 0 };

  ngOnInit(): void {
    this.facade.init();
  }

  // ── Menu positioning (smart: ouvre vers le haut si pas assez de place) ──
  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.openMenuId() === id) {
      this.closeMenu();
      return;
    }

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

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  goToPage(page: number): void {
    this.facade.goToPage(page);
  }

  // ── Filtres / tri ────────────────────────────────────────────────────────
  setFilter(f: FilterType): void {
    this.facade.setFilter(f);
  }

  setSort(field: SortField): void {
    this.facade.setSort(field);
  }

  setSearchQuery(q: string): void {
    this.facade.setSearchQuery(q);
  }

  // ── Modales / dialogs ────────────────────────────────────────────────────
  openDriveModal(): void {
    this.facade.openDriveModal();
  }

  closeModal(): void {
    this.facade.closeModal();
  }

  closeInvalidFileModal(): void {
    this.facade.closeInvalidFileModal();
  }

  closeDialog(): void {
    this.facade.closeDialog();
  }

  confirmDialog(): void {
    this.facade.confirmDialog();
  }

  hideToast(): void {
    this.facade.hideToast();
  }

  // ── CV actions ───────────────────────────────────────────────────────────
  deleteResume(resume: ResumeListItem): void {
    this.facade.deleteResume(resume);
  }

  closeDeleteModal(): void {
    this.facade.closeDeleteModal();
  }

  confirmDelete(): void {
    this.facade.confirmDelete();
  }

  unify(resume: ResumeListItem): void {
    this.facade.unify(resume);
  }

  onFileSelected(event: Event): void {
    this.facade.onFileSelected(event);
  }

  openDrive(link: string): void {
    window.open(link, '_blank');
  }

  downloadResume(resume: ResumeListItem): void {
    this.facade.downloadResume(resume, this.triggerDownload.bind(this));
  }

  // ── Scoring ──────────────────────────────────────────────────────────────
  openScoringPanel(resume: ResumeListItem): void {
    this.facade.openScoringPanel(resume);
  }

  closeScoringPanel(): void {
    this.facade.closeScoringPanel();
  }

  triggerScoring(): void {
    const resume = this.facade.scoringPanelResume();
    if (resume) this.facade.triggerScoring(resume.id);
  }

  downloadJobPost(fileId: string, fileName: string): void {
    this.facade.downloadJobPost(fileId, fileName);
  }

  // ── Helpers affichage ────────────────────────────────────────────────────
  sortIcon(field: SortField): string {
    if (this.facade.sortField() !== field) return '↕';
    return this.facade.sortAsc() ? '↑' : '↓';
  }

  statusLabel(s: string): string {
    return (
      (
        {
          pending: 'En attente',
          processing: 'En cours',
          done: 'Unifié',
          error: 'Erreur',
        } as Record<string, string>
      )[s] ?? s
    );
  }

  statusClass(s: string): string {
    return (
      (
        {
          pending: 'bg-gray-100 text-gray-600',
          processing: 'bg-yellow-100 text-yellow-700',
          done: 'bg-green-100 text-green-700',
          error: 'bg-red-100 text-red-700',
        } as Record<string, string>
      )[s] ?? ''
    );
  }

  scoreCircleClass(score: number): string {
    if (score >= 85) return 'border-green-400 text-green-600 bg-green-50';
    if (score >= 70) return 'border-yellow-400 text-yellow-600 bg-yellow-50';
    return 'border-red-300 text-red-500 bg-red-50';
  }

  scoreBarColor(score: number): string {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-400';
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    a.remove();
    globalThis.URL.revokeObjectURL(url);
  }

  openMissingFieldsModal(resume: ResumeListItem): void {
    this.githubUsernameInput = resume.githubUsername ?? '';
    this.emailInput = resume.email ?? '';
    this.facade.openMissingFieldsModal(resume);
  }

  closeMissingFieldsModal(): void {
    this.facade.closeMissingFieldsModal();
  }

  saveFields(): void {
    this.facade.saveFields({
      githubUsername: this.githubUsernameInput || undefined,
      email: this.emailInput || undefined,
    });
  }

  exportExcel(): void {
    this.exportService.exportCandidatesExcel();
  }

  exportZip(): void {
    this.exportService.exportCandidatesZip();
  }
  toggleExportDropdown(): void {
    this.exportDropdownOpen.update((v) => !v);
  }

  closeExportDropdown(): void {
    this.exportDropdownOpen.set(false);
  }

  openSendEvaluationModal(resume: ResumeListItem): void {
    this.facade.openSendEvaluationModal(resume);
  }

  closeSendEvaluationModal(): void {
    this.facade.closeSendEvaluationModal();
  }

  onEvaluationSent(): void {
    this.facade.closeSendEvaluationModal();
  }
}
