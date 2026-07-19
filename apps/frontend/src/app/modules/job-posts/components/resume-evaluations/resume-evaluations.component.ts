import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '@core/icons/components/icon.component';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { JobPostFacade } from '../../state/job-posts.facade';
import { ScoringResume, DriveFile } from '../../models/job-post.model';

@Component({
  selector: 'app-scoring-resume',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './resume-evaluations.component.html',
  providers: [JobPostFacade],
})
export class ResumeEvaluationComponent implements OnInit, OnChanges {
  @Input() jobPostId!: number;
  @Input() jobPostGoogleDriveFileId!: string;
  @Input() jobPostName!: string;
  @Output() closePanelEvent = new EventEmitter<void>();

  private readonly facade = inject(JobPostFacade);

  readonly scorings = this.facade.scorings;
  readonly loading = this.facade.loadingScoring;
  readonly loadingAll = this.facade.loadingAll;
  readonly loadingResumeId = this.facade.loadingResumeId;
  readonly errorMessage = this.facade.scoringError;
  readonly selectedScoringResume = this.facade.selectedScoringResume;
  readonly showListModal = this.facade.showScoringListModal;
  readonly showDetailModal = this.facade.showScoringDetailModal;
  readonly toastMessage = this.facade.scoringToastMessage;
  readonly toastType = this.facade.scoringToastType;
  readonly showCvPreview = signal(false);
  readonly rescoringId = this.facade.rescoringId;

  private readonly sanitizer = inject(DomSanitizer);

  ngOnInit(): void {
    this.facade.loadScoringData(this.jobPostId);
  }

  ngOnChanges(): void {
    if (this.jobPostId) this.facade.loadScoringData(this.jobPostId);
    this.facade.openScoringListModal();
  }

  unscoredResumes(): DriveFile[] {
    return this.facade.unscoredResumes(this.jobPostId);
  }

  openListModal(): void {
    this.facade.openScoringListModal();
  }

  openDetail(s: ScoringResume): void {
    this.facade.openScoringDetail(s);
  }

  backToList(): void {
    this.facade.backToScoringList();
  }

  closeListModal(): void {
    this.facade.closeScoringListModal();
    this.closePanelEvent.emit();
  }

  closeDetailModal(): void {
    this.facade.closeScoringDetailModal();
    this.closePanelEvent.emit();
  }

  scoreAllCVs(): void {
    this.facade.scoreAllCVs(this.jobPostId, {
      jobPostGoogleDriveFileId: this.jobPostGoogleDriveFileId,
      jobPostId: this.jobPostId,
    });
  }

  deleteScoringResume(event: Event, id: number): void {
    event.stopPropagation();
    this.facade.deleteScoringResume(id);
  }

  criteriaItems(scoring: ScoringResume) {
    const hasCertif = !!scoring.criteria.certifications;

    const items = hasCertif
      ? [
          {
            label: 'Compétences techniques (35%)',
            score: scoring.criteria.technicalSkills.score,
            detail: scoring.criteria.technicalSkills.detail,
          },
          {
            label: 'Expérience (25%)',
            score: scoring.criteria.experience.score,
            detail: scoring.criteria.experience.detail,
          },
          {
            label: 'Formation (13%)',
            score: scoring.criteria.education.score,
            detail: scoring.criteria.education.detail,
          },
          {
            label: 'Certifications (13%)',
            score: scoring.criteria.certifications!.score,
            detail: scoring.criteria.certifications!.detail,
          },
          {
            label: 'Soft skills (9%)',
            score: scoring.criteria.softSkills.score,
            detail: scoring.criteria.softSkills.detail,
          },
          {
            label: 'Langues (5%)',
            score: scoring.criteria.languages.score,
            detail: scoring.criteria.languages.detail,
          },
        ]
      : [
          {
            label: 'Compétences techniques (40%)',
            score: scoring.criteria.technicalSkills.score,
            detail: scoring.criteria.technicalSkills.detail,
          },
          {
            label: 'Expérience (30%)',
            score: scoring.criteria.experience.score,
            detail: scoring.criteria.experience.detail,
          },
          {
            label: 'Formation (15%)',
            score: scoring.criteria.education.score,
            detail: scoring.criteria.education.detail,
          },
          {
            label: 'Soft skills (10%)',
            score: scoring.criteria.softSkills.score,
            detail: scoring.criteria.softSkills.detail,
          },
          {
            label: 'Langues (5%)',
            score: scoring.criteria.languages.score,
            detail: scoring.criteria.languages.detail,
          },
        ];

    return items;
  }

  getBarColor(score: number): string {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }

  getTextColor(score: number): string {
    if (score >= 70) return 'text-green-700';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-700';
  }

  getBadgeClass(status: string): string {
    return status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  }

  getScoreCircleClass(score: number): string {
    if (score >= 70) return 'border-green-400 text-green-700 bg-green-50';
    if (score >= 40) return 'border-amber-400 text-amber-700 bg-amber-50';
    return 'border-red-400 text-red-700 bg-red-50';
  }

  openHighlightedCv(fileId: string): void {
    window.open(`https://drive.google.com/file/d/${fileId}/view`, '_blank');
  }

  toggleCvPreview(): void {
    this.showCvPreview.update((v) => !v);
  }

  getCvPreviewUrl(fileId: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://drive.google.com/file/d/${fileId}/preview`,
    );
  }

  rescoreOne(event: Event, id: number): void {
    event.stopPropagation();
    this.facade.rescoreOne(id);
  }
}
