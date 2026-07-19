import { inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BrowserUiService } from '@core/services/browser-ui.service';
import { CandidatesService } from '../../services/candidates.service';
import {
  mapScoringResult,
  mapTriggerResponseToScoringResult,
} from '../../mappers/candidates.mapper';
import { ResumeListItem, ScoringResult } from '../../models/candidate.model';
import { UiFacade } from '../uis/ui.facade';

@Injectable()
export class ResumeEvaluationFacade {
  private readonly candidatesService = inject(CandidatesService);
  private readonly browserUi = inject(BrowserUiService);
  private readonly ui = inject(UiFacade);
  private readonly destroy$ = new Subject<void>();

  readonly scoringPanelResume = signal<ResumeListItem | null>(null);
  readonly scoringResult = signal<ScoringResult | null>(null);
  readonly scoringLoading = signal(false);
  readonly scoringTriggering = signal(false);
  readonly scoringError = signal('');
  readonly downloadingFileId = signal<string | null>(null);

  // ── Panel ─────────────────────────────────────────────────────────────────

  openScoringPanel(resume: ResumeListItem): void {
    this.scoringPanelResume.set(resume);
    this.scoringResult.set(null);
    this.scoringError.set('');
    this.browserUi.addBodyClass('modal-open');
    this.loadScoringResult(resume.id);
  }

  closeScoringPanel(): void {
    this.scoringPanelResume.set(null);
    this.scoringResult.set(null);
    this.scoringError.set('');
    this.browserUi.removeBodyClass('modal-open');
  }

  loadScoringResult(candidateId: string): void {
    this.scoringLoading.set(true);
    this.scoringError.set('');
    this.candidatesService
      .getScoringResult(candidateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.scoringResult.set(res ? mapScoringResult(res) : null);
          this.scoringLoading.set(false);
        },
        error: () => {
          this.scoringError.set('Impossible de charger les résultats.');
          this.scoringLoading.set(false);
        },
      });
  }

  triggerScoring(candidateId: string): void {
    this.scoringTriggering.set(true);
    this.scoringError.set('');
    this.candidatesService
      .triggerScoring(candidateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.scoringResult.set(mapTriggerResponseToScoringResult(candidateId, res));
          this.scoringTriggering.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.scoringError.set(
            err?.error?.message ?? err?.message ?? 'Erreur lors du déclenchement',
          );
          this.scoringTriggering.set(false);
        },
      });
  }

  // ── Job Post Download ─────────────────────────────────────────────────────

  downloadJobPost(fileId: string, fileName: string): void {
    if (this.downloadingFileId()) return;
    this.downloadingFileId.set(fileId);
    this.candidatesService.downloadJobPost(fileId).subscribe({
      next: (response) => {
        const bytes = atob(response.data);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: response.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace(/\.[^/.]+$/, '') + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.downloadingFileId.set(null);
      },
      error: () => this.downloadingFileId.set(null),
    });
  }

  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
