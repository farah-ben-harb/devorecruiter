import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { JobOfferService } from '../services/job-offer.service';
import {
  JobOffer,
  JobOfferState,
  JobOfferStatus,
  GenerateJobOfferRequest,
  UpdateJobOfferRequest,
  initialJobOfferState,
} from '../models/job-offer.model';

@Injectable({ providedIn: 'root' })
export class JobOfferFacade {
  private readonly service = inject(JobOfferService);
  private readonly state$ = new BehaviorSubject<JobOfferState>(initialJobOfferState);
  private readonly _generatingCount = new BehaviorSubject<{ done: number; total: number } | null>(
    null,
  );
  generatingCount$: Observable<{ done: number; total: number } | null> =
    this._generatingCount.asObservable();

  // ── Selectors ─────────────────────────────────────────────
  get snapshot(): JobOfferState {
    return this.state$.getValue();
  }

  offers$: Observable<JobOffer[]> = this.state$.pipe(map((s) => s.offers));
  selectedOffer$: Observable<JobOffer | null> = this.state$.pipe(map((s) => s.selectedOffer));
  status$: Observable<JobOfferStatus> = this.state$.pipe(map((s) => s.status));
  isLoading$: Observable<boolean> = this.state$.pipe(map((s) => s.status === 'loading'));
  isGenerating$: Observable<boolean> = this.state$.pipe(
    map((s) => s.generateStatus === 'generating'),
  );
  error$: Observable<string | null> = this.state$.pipe(map((s) => s.error));
  generateError$: Observable<string | null> = this.state$.pipe(map((s) => s.generateError));

  // ── Updaters privés ───────────────────────────────────────
  private patch(partial: Partial<JobOfferState>): void {
    this.state$.next({ ...this.snapshot, ...partial });
  }

  // ── Actions ───────────────────────────────────────────────

  loadAll(): void {
    this.patch({ status: 'loading', error: null });
    this.service.findAll().subscribe({
      next: (offers) => this.patch({ offers, status: 'success' }),
      error: () => this.patch({ status: 'error', error: 'Impossible de charger les offres.' }),
    });
  }

  selectOffer(offer: JobOffer): void {
    this.patch({ selectedOffer: offer });
  }

  clearSelected(): void {
    this.patch({ selectedOffer: null });
  }

  generate(dto: GenerateJobOfferRequest): void {
    this.patch({ generateStatus: 'generating', generateError: null });
    this.service.generate(dto).subscribe({
      next: (offer) => {
        this.patch({
          offers: [offer, ...this.snapshot.offers],
          generateStatus: 'success',
          selectedOffer: offer,
        });
      },
      error: () =>
        this.patch({
          generateStatus: 'error',
          generateError: 'La génération a échoué. Vérifiez que le serveur IA est actif.',
        }),
    });
  }

  update(id: string, dto: UpdateJobOfferRequest): void {
    this.service.update(id, dto).subscribe({
      next: (updated) => {
        const offers = this.snapshot.offers.map((o) => (o.id === id ? updated : o));
        this.patch({
          offers,
          selectedOffer:
            this.snapshot.selectedOffer?.id === id ? updated : this.snapshot.selectedOffer,
        });
      },
      error: () => this.patch({ error: "Impossible de mettre à jour l'offre." }),
    });
  }

  delete(id: string): void {
    this.service.delete(id).subscribe({
      next: () => {
        const offers = this.snapshot.offers.filter((o) => o.id !== id);
        const selectedOffer =
          this.snapshot.selectedOffer?.id === id ? null : this.snapshot.selectedOffer;
        this.patch({ offers, selectedOffer });
      },
      error: () => this.patch({ error: "Impossible de supprimer l'offre." }),
    });
  }

  clearGenerateStatus(): void {
    this.patch({ generateStatus: 'idle', generateError: null });
  }

  generateFromJobPost(jobPostIds: number[]): void {
    this.patch({ generateStatus: 'generating', generateError: null });
    this._generatingCount.next({ done: 0, total: jobPostIds.length });

    this.service.generateFromJobPost(jobPostIds).subscribe({
      next: (offers) => {
        this._generatingCount.next({ done: jobPostIds.length, total: jobPostIds.length });
        this.patch({
          offers: [...offers, ...this.snapshot.offers],
          generateStatus: 'success',
          selectedOffer: offers[0] ?? null,
        });
      },
      error: () => {
        this._generatingCount.next(null);
        this.patch({
          generateStatus: 'error',
          generateError: 'La génération a échoué.',
        });
      },
    });
  }
}
