import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '@core/icons/components/icon.component';

import { CandidatesFacade } from '../../state/candidates/candidates.facade';
import { ResumeListItem } from '../../models/candidate.model';

@Component({
  selector: 'app-scoring-job-post-panel',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './job-post-evaluations.component.html',
})
export class JobPostEvaluationComponent implements OnInit, OnDestroy {
  @Input({ required: true }) resume!: ResumeListItem;
  @Output() closed = new EventEmitter<void>();

  private readonly facade = inject(CandidatesFacade);

  readonly result = this.facade.scoringResult;
  readonly loading = this.facade.scoringLoading;
  readonly triggering = this.facade.scoringTriggering;
  readonly error = this.facade.scoringError;
  readonly downloadingFileId = this.facade.downloadingFileId;

  ngOnInit(): void {
    this.facade.loadScoringResult(this.resume.id);
  }

  ngOnDestroy(): void {
    this.facade.ngOnDestroy();
  }

  triggerScoring(): void {
    this.facade.triggerScoring(this.resume.id);
  }

  close(): void {
    this.closed.emit();
  }

  downloadJobPost(fileId: string, fileName: string): void {
    this.facade.downloadJobPost(fileId, fileName);
  }

  scoreCircleClass(score: number): string {
    if (score >= 70) return 'border-green-400 text-green-600 bg-green-50';
    if (score >= 50) return 'border-yellow-400 text-yellow-600 bg-yellow-50';
    return 'border-red-300 text-red-500 bg-red-50';
  }

  scoreBarColor(score: number): string {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-400';
  }
}
