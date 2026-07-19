import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  HostListener,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { JobOfferFacade } from '../states/job-offer.facade';
import { JobOffer } from '../models/job-offer.model';
import { JobPostService } from '../../job-posts/services/job-posts.service';
import { PostApiResponse, UploadedFile } from '../../job-posts/models/job-post.model';

@Component({
  selector: 'app-job-offers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-offers.component.html',
})
export class JobOffersComponent implements OnInit, OnDestroy {
  public facade = inject(JobOfferFacade);
  private readonly jobPostService = inject(JobPostService);
  private destroy$ = new Subject<void>();

  // ── Streams ───────────────────────────────────────────────
  offers$ = this.facade.offers$;
  selectedOffer$ = this.facade.selectedOffer$;
  isLoading$ = this.facade.isLoading$;
  isGenerating$ = this.facade.isGenerating$;
  error$ = this.facade.error$;
  generateError$ = this.facade.generateError$;
  generatingCount$ = this.facade.generatingCount$;

  // ── UI state ──────────────────────────────────────────────
  showGeneratePanel = false;
  showDetailPanel = false;
  showDeleteModal = false;
  showEditModal = false;
  showFullEditModal = false;
  pendingDeleteId: string | null = null;
  activeTab: 'linkedin' | 'details' = 'linkedin';
  copiedLinkedin = false;
  copiedDetails = false;
  isSaving = false;
  copiedLinkedinFull = false;

  // ── Sélection fiches de poste ─────────────────────────────
  unifiedJobPosts = signal<UploadedFile[]>([]);
  loadingJobPosts = signal(false);
  selectedJobPostIds = signal<Set<string>>(new Set());
  jobPostSearch = signal('');
  generatedJobPostIds = signal<Set<string>>(new Set());

  filteredJobPosts = computed(() => {
    const q = this.jobPostSearch().toLowerCase().trim();
    return this.unifiedJobPosts().filter(
      (jp) =>
        !q ||
        (jp.title ?? jp.name).toLowerCase().includes(q) ||
        (jp.company ?? '').toLowerCase().includes(q),
    );
  });

  // ── Edit simple ───────────────────────────────────────────
  editTitre = '';
  editAccroche = '';

  // ── Edit complet ──────────────────────────────────────────
  editFormatLinkedin = '';
  editMissions: string[] = [];
  editProfil: string[] = [];
  editAvantages: string[] = [];
  editMotsCles: string[] = [];

  ngOnInit(): void {
    this.facade.loadAll();
    this.facade.offers$.pipe(takeUntil(this.destroy$)).subscribe((offers) => {
      this.generatedJobPostIds.set(
        new Set(offers.filter((o) => o.jobPostId !== null).map((o) => o.jobPostId!.toString())),
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Panneau génération ────────────────────────────────────

  openGeneratePanel(): void {
    this.showGeneratePanel = true;
    this.selectedJobPostIds.set(new Set());
    this.jobPostSearch.set('');
    this.loadUnifiedJobPosts();
  }

  closeGeneratePanel(): void {
    this.showGeneratePanel = false;
    this.selectedJobPostIds.set(new Set());
  }

  private loadUnifiedJobPosts(): void {
    this.loadingJobPosts.set(true);
    this.jobPostService.getAll(1, 999, undefined, 'unified').subscribe({
      next: (res) => {
        this.unifiedJobPosts.set(
          res.data.map((d: PostApiResponse) => ({
            id: d.id?.toString(),
            name: d.name ?? 'Sans nom',
            type: d.type ?? '',
            isDriveFile: true,
            isLoading: false,
            url: d.url ?? '',
            googleDocId: d.googleDocId ?? d.generatedDocId,
            driveFileId: d.googleDriveFileId,
            status: d.status ?? 'unified',
            company: d.company,
            title: d.title,
            hasEvaluation: d.hasEvaluation ?? false,
            requiresCoding: d.requiresCoding ?? null,
            hasQcm: d.hasQcm ?? null,
            jobStatus: null,
            linkedCandidateIds: [],
          })),
        );
        this.loadingJobPosts.set(false);
      },
      error: () => this.loadingJobPosts.set(false),
    });
  }

  toggleJobPostSelection(id: string): void {
    const next = new Set(this.selectedJobPostIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedJobPostIds.set(next);
  }

  isJobPostSelected(id: string): boolean {
    return this.selectedJobPostIds().has(id);
  }

  toggleSelectAll(): void {
    const filtered = this.filteredJobPosts();
    const allSelected = filtered.every((jp) => this.isJobPostSelected(jp.id!));
    const next = new Set(this.selectedJobPostIds());
    if (allSelected) {
      filtered.forEach((jp) => next.delete(jp.id!));
    } else {
      filtered.forEach((jp) => next.add(jp.id!));
    }
    this.selectedJobPostIds.set(next);
  }

  isAllSelected(): boolean {
    const filtered = this.filteredJobPosts();
    return filtered.length > 0 && filtered.every((jp) => this.isJobPostSelected(jp.id!));
  }

  isIndeterminate(): boolean {
    const filtered = this.filteredJobPosts();
    const count = filtered.filter((jp) => this.isJobPostSelected(jp.id!)).length;
    return count > 0 && count < filtered.length;
  }

  selectedCount(): number {
    return this.selectedJobPostIds().size;
  }

  generate(): void {
    const ids = Array.from(this.selectedJobPostIds()).map((id) => +id);
    if (!ids.length) return;

    this.facade.generateFromJobPost(ids);

    this.facade.isGenerating$.pipe(takeUntil(this.destroy$)).subscribe((generating) => {
      if (!generating) {
        this.closeGeneratePanel();
        const offer = this.facade.snapshot.selectedOffer;
        if (offer) this.openDetail(offer);
      }
    });
  }

  // ── Select & Detail ───────────────────────────────────────
  openDetail(offer: JobOffer): void {
    this.facade.selectOffer(offer);
    this.showDetailPanel = true;
    this.activeTab = 'linkedin';
  }

  closeDetail(): void {
    this.showDetailPanel = false;
    this.facade.clearSelected();
  }

  setTab(tab: 'linkedin' | 'details'): void {
    this.activeTab = tab;
  }

  // ── Copy LinkedIn ─────────────────────────────────────────
  copyLinkedin(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.copiedLinkedin = true;
      setTimeout(() => (this.copiedLinkedin = false), 2000);
    });
  }

  copyLinkedinFull(offer: JobOffer): void {
    const hashtags = offer.hashtags.join(' ');
    const text = `${offer.accroche}\n\n${offer.formatLinkedin}\n\n${hashtags}`;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedLinkedinFull = true;
      setTimeout(() => (this.copiedLinkedinFull = false), 2000);
    });
  }

  // ── Copy Details ──────────────────────────────────────────
  copyDetails(offer: JobOffer): void {
    const text = [
      `✅ MISSIONS\n${offer.missions.map((m) => `• ${m}`).join('\n')}`,
      `\n🎯 PROFIL RECHERCHÉ\n${offer.profil.map((p) => `• ${p}`).join('\n')}`,
      `\n🎁 AVANTAGES\n${offer.avantages.map((a) => `• ${a}`).join('\n')}`,
      `\n🔑 MOTS CLÉS\n${offer.motsCles.join(', ')}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    this.copiedDetails = true;
    setTimeout(() => (this.copiedDetails = false), 2000);
  }

  // ── Edit simple ───────────────────────────────────────────
  openEdit(offer: JobOffer, event: MouseEvent): void {
    event.stopPropagation();
    this.editTitre = offer.titre;
    this.editAccroche = offer.accroche;
    this.facade.selectOffer(offer);
    this.showEditModal = true;
  }

  confirmEdit(): void {
    const id = this.facade.snapshot.selectedOffer?.id;
    if (!id) return;
    this.facade.update(id, {
      titre: this.editTitre.trim() || undefined,
      accroche: this.editAccroche.trim() || undefined,
    });
    this.showEditModal = false;
  }

  cancelEdit(): void {
    this.showEditModal = false;
  }

  // ── Edit complet ──────────────────────────────────────────
  openFullEdit(offer: JobOffer, event: Event): void {
    event.stopPropagation();
    this.editTitre = offer.titre;
    this.editAccroche = offer.accroche;
    this.editFormatLinkedin = offer.formatLinkedin;
    this.editMissions = [...offer.missions];
    this.editProfil = [...offer.profil];
    this.editAvantages = [...offer.avantages];
    this.editMotsCles = [...offer.motsCles];
    this.facade.selectOffer(offer);
    this.showFullEditModal = true;
  }

  confirmFullEdit(): void {
    const offer = this.facade.snapshot.selectedOffer;
    if (!offer) return;
    this.isSaving = true;
    this.facade.update(offer.id, {
      titre: this.editTitre.trim() || undefined,
      accroche: this.editAccroche.trim() || undefined,
      formatLinkedin: this.editFormatLinkedin.trim() || undefined,
      missions: this.editMissions.filter((m) => m.trim()),
      profil: this.editProfil.filter((p) => p.trim()),
      avantages: this.editAvantages.filter((a) => a.trim()),
      motsCles: this.editMotsCles.filter((k) => k.trim()),
    });
    this.isSaving = false;
    this.showFullEditModal = false;
  }

  cancelFullEdit(): void {
    this.showFullEditModal = false;
  }

  // ── Helpers listes dynamiques ─────────────────────────────
  addItem(list: string[]): void {
    list.push('');
  }
  removeItem(list: string[], i: number): void {
    list.splice(i, 1);
  }
  trackByIndex(index: number): number {
    return index;
  }

  // ── Delete ────────────────────────────────────────────────
  openDelete(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.pendingDeleteId = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.pendingDeleteId) return;
    this.facade.delete(this.pendingDeleteId);
    this.showDeleteModal = false;
    this.showDetailPanel = false;
    this.pendingDeleteId = null;
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.pendingDeleteId = null;
  }

  // ── Toggle publish ────────────────────────────────────────
  togglePublish(offer: JobOffer, event: MouseEvent): void {
    event.stopPropagation();
    this.facade.update(offer.id, { isPublished: !offer.isPublished });
  }

  // ── Escape ────────────────────────────────────────────────
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showDeleteModal) this.cancelDelete();
    else if (this.showFullEditModal) this.cancelFullEdit();
    else if (this.showEditModal) this.cancelEdit();
    else if (this.showDetailPanel) this.closeDetail();
    else if (this.showGeneratePanel) this.closeGeneratePanel();
  }

  // ── Utils ─────────────────────────────────────────────────
  trackById(_: number, offer: JobOffer): string {
    return offer.id;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  isAlreadyGenerated(id: string): boolean {
    return this.generatedJobPostIds().has(id);
  }
}
