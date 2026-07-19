// edit-job-status-modal.component.ts — Modal dédié à la gestion du statut métier de la fiche

import { Component, EventEmitter, Input, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { JobPostService } from '../../services/job-posts.service';
import {
  UploadedFile,
  CandidateSearchResult,
  JobPostActivityStatus,
  EditJobStatusResult,
} from '../../models/job-post.model';

const JOB_STATUS_OPTIONS = [
  {
    value: 'open' as JobPostActivityStatus,
    label: 'Ouverte',
    description: 'La recherche de candidats est en cours',
    icon: '🟢',
    selectedClass: 'border-green-500 bg-green-50 ring-2 ring-green-300',
  },
  {
    value: 'closed_with_hire' as JobPostActivityStatus,
    label: 'Clôturée avec candidat(s)',
    description: 'Un ou plusieurs candidats ont été recrutés',
    icon: '✅',
    selectedClass: 'border-blue-500 bg-blue-50 ring-2 ring-blue-300',
  },
  {
    value: 'closed_without_hire' as JobPostActivityStatus,
    label: 'Clôturée sans candidats',
    description: 'Le poste a été annulé ou mis en pause',
    icon: '⛔',
    selectedClass: 'border-red-500 bg-red-50 ring-2 ring-red-300',
  },
];

@Component({
  selector: 'app-edit-job-status-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-job-status-modal.component.html',
})
export class EditJobStatusModalComponent implements OnInit {
  @Input() jobPostId!: number;
  @Input() file?: UploadedFile | null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<EditJobStatusResult>();

  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);

  readonly jobStatus = signal<JobPostActivityStatus>(null);
  readonly linkedCandidates = signal<CandidateSearchResult[]>([]);
  readonly candidateSearchQuery = signal('');
  readonly candidateSearchResults = signal<CandidateSearchResult[]>([]);
  readonly candidateSearchLoading = signal(false);
  private readonly searchSubject = new Subject<string>();

  readonly showCandidateSearch = computed(() => this.jobStatus() === 'closed_with_hire');
  readonly jobStatusOptions = JOB_STATUS_OPTIONS;

  constructor(private readonly jobPostService: JobPostService) {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (!q.trim()) {
            this.candidateSearchResults.set([]);
            this.candidateSearchLoading.set(false);
            return of([]);
          }
          this.candidateSearchLoading.set(true);
          return this.jobPostService.searchCandidates(q);
        }),
      )
      .subscribe({
        next: (results) => {
          const ids = new Set(this.linkedCandidates().map((c) => c.id));
          this.candidateSearchResults.set(results.filter((r) => !ids.has(r.id)));
          this.candidateSearchLoading.set(false);
        },
        error: () => this.candidateSearchLoading.set(false),
      });
  }

  ngOnInit(): void {
    if (this.file) {
      this.jobStatus.set(this.file.jobStatus ?? null);
      if (this.file.linkedCandidateIds?.length && this.file.jobStatus === 'closed_with_hire') {
        this.loadLinkedCandidates(this.file.linkedCandidateIds);
      }
    }
  }

  private loadLinkedCandidates(ids: string[]): void {
    this.jobPostService.searchCandidates(undefined, ids).subscribe({
      next: (c) => this.linkedCandidates.set(c),
    });
  }

  setJobStatus(status: JobPostActivityStatus): void {
    this.jobStatus.set(status);
    if (status !== 'closed_with_hire') {
      this.linkedCandidates.set([]);
      this.candidateSearchResults.set([]);
      this.candidateSearchQuery.set('');
    }
  }

  onCandidateSearch(query: string): void {
    this.candidateSearchQuery.set(query);
    this.searchSubject.next(query);
  }

  linkCandidate(candidate: CandidateSearchResult): void {
    if (this.linkedCandidates().some((c) => c.id === candidate.id)) return;
    this.linkedCandidates.update((l) => [...l, candidate]);
    this.candidateSearchResults.update((l) => l.filter((c) => c.id !== candidate.id));
    this.candidateSearchQuery.set('');
    this.candidateSearchResults.set([]);
  }

  unlinkCandidate(id: string): void {
    this.linkedCandidates.update((l) => l.filter((c) => c.id !== id));
  }

  candidateDisplayName(c: CandidateSearchResult): string {
    return `${c.firstName ?? ''} ${c.name ?? ''}`.trim() || c.email || c.id;
  }

  save(): void {
    this.saving.set(true);
    this.errorMsg.set(null);

    const linkedCandidateIds =
      this.jobStatus() === 'closed_with_hire' ? this.linkedCandidates().map((c) => c.id) : [];

    this.jobPostService
      .updateJobStatus(this.jobPostId, this.jobStatus(), linkedCandidateIds)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit({
            jobStatus: this.jobStatus(),
            linkedCandidateIds,
            linkedCandidates:
              this.jobStatus() === 'closed_with_hire' ? this.linkedCandidates() : [],
          });
        },
        error: () => {
          this.saving.set(false);
          this.errorMsg.set('Erreur lors de la sauvegarde. Veuillez réessayer.');
        },
      });
  }

  onClose(): void {
    this.close.emit();
  }
}
