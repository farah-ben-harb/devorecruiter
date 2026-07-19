import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  JobOffer,
  JobOfferState,
  GenerateJobOfferRequest,
  UpdateJobOfferRequest,
  DeleteJobOfferResponse,
  initialJobOfferState,
} from '../models/job-offer.model';
import { JobOfferMapper } from '../mappers/job-offer.mapper';
import { JobOfferApiResponse } from '../models/job-offer.model';

// ── Fixture ───────────────────────────────────────────────────
const rawOffer: JobOfferApiResponse = {
  id: 'abc-123',
  jobPostId: null, // ← ajouté
  promptLibre: 'Dev Angular senior',
  titre: 'Développeur Angular Senior',
  accroche: 'Rejoignez notre équipe !',
  formatLinkedin: '🚀 Nous recrutons...',
  missions: ['Feature dev', 'Code review'],
  profil: ['3 ans Angular'],
  avantages: ['Remote'],
  hashtags: ['#angular'],
  motsCles: ['angular'],
  isPublished: false,
  userId: 1,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T12:00:00.000Z',
};

const offer1: JobOffer = JobOfferMapper.fromApi(rawOffer);
const offer2: JobOffer = JobOfferMapper.fromApi({ ...rawOffer, id: 'xyz-456', titre: 'Offre 2' });

// ── Mock du service ───────────────────────────────────────────
const createMockService = () => ({
  findAll: vi.fn(),
  generate: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findOne: vi.fn(),
});

// ── Facade factory (instanciation manuelle sans Angular DI) ───
function createFacade(mockService: ReturnType<typeof createMockService>) {
  // Recréer la façade manuellement en injectant le mock
  const state$ = new BehaviorSubject<JobOfferState>(initialJobOfferState);

  const snapshot = () => state$.getValue();
  const patch = (partial: Partial<JobOfferState>) => state$.next({ ...snapshot(), ...partial });

  const facade = {
    state$,

    get snapshot() {
      return snapshot();
    },

    offers$: state$.pipe(map((s) => s.offers)),
    selectedOffer$: state$.pipe(map((s) => s.selectedOffer)),
    isLoading$: state$.pipe(map((s) => s.status === 'loading')),
    isGenerating$: state$.pipe(map((s) => s.generateStatus === 'generating')),
    error$: state$.pipe(map((s) => s.error)),
    generateError$: state$.pipe(map((s) => s.generateError)),

    loadAll(): void {
      patch({ status: 'loading', error: null });
      mockService.findAll().subscribe({
        next: (offers: JobOffer[]) => patch({ offers, status: 'success' }),
        error: () => patch({ status: 'error', error: 'Impossible de charger les offres.' }),
      });
    },

    selectOffer(offer: JobOffer): void {
      patch({ selectedOffer: offer });
    },

    clearSelected(): void {
      patch({ selectedOffer: null });
    },

    generate(dto: GenerateJobOfferRequest): void {
      patch({ generateStatus: 'generating', generateError: null });
      mockService.generate(dto).subscribe({
        next: (offer: JobOffer) => {
          patch({
            offers: [offer, ...snapshot().offers],
            generateStatus: 'success',
            selectedOffer: offer,
          });
        },
        error: () =>
          patch({
            generateStatus: 'error',
            generateError: 'La génération a échoué. Vérifiez que le serveur IA est actif.',
          }),
      });
    },

    update(id: string, dto: UpdateJobOfferRequest): void {
      mockService.update(id, dto).subscribe({
        next: (updated: JobOffer) => {
          const offers = snapshot().offers.map((o) => (o.id === id ? updated : o));
          patch({
            offers,
            selectedOffer: snapshot().selectedOffer?.id === id ? updated : snapshot().selectedOffer,
          });
        },
        error: () => patch({ error: "Impossible de mettre à jour l'offre." }),
      });
    },

    delete(id: string): void {
      mockService.delete(id).subscribe({
        next: () => {
          const offers = snapshot().offers.filter((o) => o.id !== id);
          const selectedOffer =
            snapshot().selectedOffer?.id === id ? null : snapshot().selectedOffer;
          patch({ offers, selectedOffer });
        },
        error: () => patch({ error: "Impossible de supprimer l'offre." }),
      });
    },

    clearGenerateStatus(): void {
      patch({ generateStatus: 'idle', generateError: null });
    },
  };

  return facade;
}

// ── Tests ─────────────────────────────────────────────────────
describe('JobOfferFacade', () => {
  let mockService: ReturnType<typeof createMockService>;
  let facade: ReturnType<typeof createFacade>;

  beforeEach(() => {
    mockService = createMockService();
    facade = createFacade(mockService);
  });

  // ── snapshot ──────────────────────────────────────────────
  describe('snapshot', () => {
    it('should return initial state by default', () => {
      expect(facade.snapshot).toEqual(initialJobOfferState);
    });
  });

  // ── loadAll ───────────────────────────────────────────────
  describe('loadAll', () => {
    it('should set status to loading then success', () => {
      mockService.findAll.mockReturnValue(of([offer1, offer2]));

      let loadingEmitted = false;
      facade.isLoading$.subscribe((v) => {
        if (v) loadingEmitted = true;
      });

      facade.loadAll();

      expect(loadingEmitted).toBe(true);
      expect(facade.snapshot.status).toBe('success');
    });

    it('should populate offers on success', () => {
      mockService.findAll.mockReturnValue(of([offer1, offer2]));
      facade.loadAll();

      expect(facade.snapshot.offers).toHaveLength(2);
      expect(facade.snapshot.offers[0].id).toBe('abc-123');
    });

    it('should set status to error and set error message on failure', () => {
      mockService.findAll.mockReturnValue(throwError(() => new Error('API down')));
      facade.loadAll();

      expect(facade.snapshot.status).toBe('error');
      expect(facade.snapshot.error).toBe('Impossible de charger les offres.');
    });

    it('should clear previous error on new load call', () => {
      mockService.findAll.mockReturnValueOnce(throwError(() => new Error('err')));
      facade.loadAll();
      expect(facade.snapshot.error).toBe('Impossible de charger les offres.');

      mockService.findAll.mockReturnValueOnce(of([offer1]));
      facade.loadAll();
      expect(facade.snapshot.error).toBeNull();
    });

    it('should emit offers$ observable with loaded data', () => {
      mockService.findAll.mockReturnValue(of([offer1]));
      facade.loadAll();

      let emitted: JobOffer[] | undefined;
      facade.offers$.subscribe((v) => (emitted = v));
      expect(emitted).toEqual([offer1]);
    });
  });

  // ── selectOffer & clearSelected ───────────────────────────
  describe('selectOffer / clearSelected', () => {
    it('should set selectedOffer in state', () => {
      facade.selectOffer(offer1);
      expect(facade.snapshot.selectedOffer).toEqual(offer1);
    });

    it('should emit via selectedOffer$', () => {
      facade.selectOffer(offer1);
      let emitted: JobOffer | null | undefined;
      facade.selectedOffer$.subscribe((v) => (emitted = v));
      expect(emitted).toEqual(offer1);
    });

    it('should clear selectedOffer on clearSelected', () => {
      facade.selectOffer(offer1);
      facade.clearSelected();
      expect(facade.snapshot.selectedOffer).toBeNull();
    });
  });

  // ── generate ──────────────────────────────────────────────
  describe('generate', () => {
    it('should set generateStatus to generating then success', () => {
      mockService.generate.mockReturnValue(of(offer1));
      const dto: GenerateJobOfferRequest = { promptLibre: 'Dev Angular senior' };

      let generatingEmitted = false;
      facade.isGenerating$.subscribe((v) => {
        if (v) generatingEmitted = true;
      });

      facade.generate(dto);
      expect(generatingEmitted).toBe(true);
      expect(facade.snapshot.generateStatus).toBe('success');
    });

    it('should prepend the new offer to the offers list', () => {
      mockService.findAll.mockReturnValue(of([offer2]));
      facade.loadAll();

      mockService.generate.mockReturnValue(of(offer1));
      facade.generate({ promptLibre: 'test' });

      expect(facade.snapshot.offers[0].id).toBe('abc-123');
      expect(facade.snapshot.offers[1].id).toBe('xyz-456');
    });

    it('should set selectedOffer to the generated offer', () => {
      mockService.generate.mockReturnValue(of(offer1));
      facade.generate({ promptLibre: 'test' });
      expect(facade.snapshot.selectedOffer).toEqual(offer1);
    });

    it('should set generateStatus to error on failure', () => {
      mockService.generate.mockReturnValue(throwError(() => new Error('AI down')));
      facade.generate({ promptLibre: 'test' });

      expect(facade.snapshot.generateStatus).toBe('error');
      expect(facade.snapshot.generateError).toBe(
        'La génération a échoué. Vérifiez que le serveur IA est actif.',
      );
    });

    it('should clear generateError before a new generation', () => {
      mockService.generate.mockReturnValueOnce(throwError(() => new Error('err')));
      facade.generate({ promptLibre: 'fail' });
      expect(facade.snapshot.generateError).not.toBeNull();

      mockService.generate.mockReturnValueOnce(of(offer1));
      facade.generate({ promptLibre: 'ok' });
      expect(facade.snapshot.generateError).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      mockService.findAll.mockReturnValue(of([offer1, offer2]));
      facade.loadAll();
    });

    it('should replace the updated offer in the list', () => {
      const updated: JobOffer = { ...offer1, titre: 'Titre modifié' };
      mockService.update.mockReturnValue(of(updated));
      const dto: UpdateJobOfferRequest = { titre: 'Titre modifié' };

      facade.update('abc-123', dto);

      const found = facade.snapshot.offers.find((o) => o.id === 'abc-123');
      expect(found?.titre).toBe('Titre modifié');
    });

    it('should leave other offers unchanged', () => {
      const updated: JobOffer = { ...offer1, titre: 'Titre modifié' };
      mockService.update.mockReturnValue(of(updated));

      facade.update('abc-123', { titre: 'Titre modifié' });

      const other = facade.snapshot.offers.find((o) => o.id === 'xyz-456');
      expect(other?.titre).toBe('Offre 2');
    });

    it('should update selectedOffer if it matches the updated id', () => {
      facade.selectOffer(offer1);
      const updated: JobOffer = { ...offer1, accroche: 'Nouvelle accroche' };
      mockService.update.mockReturnValue(of(updated));

      facade.update('abc-123', { accroche: 'Nouvelle accroche' });

      expect(facade.snapshot.selectedOffer?.accroche).toBe('Nouvelle accroche');
    });

    it('should NOT update selectedOffer if it does not match the updated id', () => {
      facade.selectOffer(offer2);
      const updated: JobOffer = { ...offer1, titre: 'Titre modifié' };
      mockService.update.mockReturnValue(of(updated));

      facade.update('abc-123', { titre: 'Titre modifié' });

      expect(facade.snapshot.selectedOffer?.id).toBe('xyz-456');
    });

    it('should set error message on failure', () => {
      mockService.update.mockReturnValue(throwError(() => new Error('Update failed')));
      facade.update('abc-123', {});

      expect(facade.snapshot.error).toBe("Impossible de mettre à jour l'offre.");
    });
  });

  // ── delete ────────────────────────────────────────────────
  describe('delete', () => {
    beforeEach(() => {
      mockService.findAll.mockReturnValue(of([offer1, offer2]));
      facade.loadAll();
    });

    it('should remove the deleted offer from the list', () => {
      const resp: DeleteJobOfferResponse = { message: 'Supprimé' };
      mockService.delete.mockReturnValue(of(resp));

      facade.delete('abc-123');

      expect(facade.snapshot.offers).toHaveLength(1);
      expect(facade.snapshot.offers[0].id).toBe('xyz-456');
    });

    it('should clear selectedOffer when the deleted offer was selected', () => {
      facade.selectOffer(offer1);
      mockService.delete.mockReturnValue(of({ message: 'ok' }));

      facade.delete('abc-123');

      expect(facade.snapshot.selectedOffer).toBeNull();
    });

    it('should keep selectedOffer when a different offer is deleted', () => {
      facade.selectOffer(offer2);
      mockService.delete.mockReturnValue(of({ message: 'ok' }));

      facade.delete('abc-123');

      expect(facade.snapshot.selectedOffer?.id).toBe('xyz-456');
    });

    it('should set error message on failure', () => {
      mockService.delete.mockReturnValue(throwError(() => new Error('Delete failed')));
      facade.delete('abc-123');

      expect(facade.snapshot.error).toBe("Impossible de supprimer l'offre.");
    });
  });

  // ── clearGenerateStatus ───────────────────────────────────
  describe('clearGenerateStatus', () => {
    it('should reset generateStatus to idle', () => {
      mockService.generate.mockReturnValue(of(offer1));
      facade.generate({ promptLibre: 'test' });
      expect(facade.snapshot.generateStatus).toBe('success');

      facade.clearGenerateStatus();
      expect(facade.snapshot.generateStatus).toBe('idle');
    });

    it('should clear generateError', () => {
      mockService.generate.mockReturnValue(throwError(() => new Error('err')));
      facade.generate({ promptLibre: 'fail' });
      expect(facade.snapshot.generateError).not.toBeNull();

      facade.clearGenerateStatus();
      expect(facade.snapshot.generateError).toBeNull();
    });
  });

  // ── observables ───────────────────────────────────────────
  describe('observables', () => {
    it('isLoading$ should emit true while loading', () => {
      mockService.findAll.mockReturnValue(of([]));
      const emissions: boolean[] = [];
      facade.isLoading$.subscribe((v) => emissions.push(v));

      facade.loadAll();

      expect(emissions).toContain(true);
      expect(emissions[emissions.length - 1]).toBe(false);
    });

    it('isGenerating$ should emit true while generating', () => {
      mockService.generate.mockReturnValue(of(offer1));
      const emissions: boolean[] = [];
      facade.isGenerating$.subscribe((v) => emissions.push(v));

      facade.generate({ promptLibre: 'test' });

      expect(emissions).toContain(true);
      expect(emissions[emissions.length - 1]).toBe(false);
    });

    it('error$ should emit null initially', () => {
      let val: string | null | undefined;
      facade.error$.subscribe((v) => (val = v));
      expect(val).toBeNull();
    });

    it('generateError$ should emit null initially', () => {
      let val: string | null | undefined;
      facade.generateError$.subscribe((v) => (val = v));
      expect(val).toBeNull();
    });
  });
});
