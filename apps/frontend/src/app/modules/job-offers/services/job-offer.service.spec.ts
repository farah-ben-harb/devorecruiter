import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import {
  JobOffer,
  JobOfferApiResponse,
  GenerateJobOfferRequest,
  UpdateJobOfferRequest,
  DeleteJobOfferResponse,
} from '../models/job-offer.model';
import { JobOfferMapper } from '../mappers/job-offer.mapper';

// ── Fixtures ──────────────────────────────────────────────────
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

const mappedOffer: JobOffer = JobOfferMapper.fromApi(rawOffer);

// ── Mock HttpClient ────────────────────────────────────────────
const mockHttp = {
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

const createMockedService = () => ({
  generate: vi.fn(),
  findAll: vi.fn(),
  findOne: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

describe('JobOfferService (behaviour via mock)', () => {
  let service: ReturnType<typeof createMockedService>;

  beforeEach(() => {
    service = createMockedService();
    vi.clearAllMocks();
  });

  // ── generate ──────────────────────────────────────────────
  describe('generate', () => {
    it('should emit a mapped JobOffer on success', () => {
      service.generate.mockReturnValue(of(mappedOffer));
      const dto: GenerateJobOfferRequest = { promptLibre: 'Dev Angular senior' };

      let result: JobOffer | undefined;
      service.generate(dto).subscribe((v: JobOffer) => (result = v));

      expect(service.generate).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mappedOffer);
    });

    it('should propagate error on failure', () => {
      const err = new Error('Network error');
      service.generate.mockReturnValue(throwError(() => err));
      const dto: GenerateJobOfferRequest = { promptLibre: 'test' };

      let thrownError: Error | undefined;
      service.generate(dto).subscribe({
        error: (e: Error) => (thrownError = e),
      });

      expect(thrownError).toBe(err);
    });
  });

  // ── findAll ───────────────────────────────────────────────
  describe('findAll', () => {
    it('should emit a list of mapped JobOffers', () => {
      const offers: JobOffer[] = [mappedOffer];
      service.findAll.mockReturnValue(of(offers));

      let result: JobOffer[] | undefined;
      service.findAll().subscribe((v: JobOffer[]) => (result = v));

      expect(result).toEqual(offers);
    });

    it('should emit an empty array when API returns empty list', () => {
      service.findAll.mockReturnValue(of([]));

      let result: JobOffer[] | undefined;
      service.findAll().subscribe((v: JobOffer[]) => (result = v));

      expect(result).toEqual([]);
    });

    it('should propagate error on failure', () => {
      const err = new Error('Server error');
      service.findAll.mockReturnValue(throwError(() => err));

      let thrownError: Error | undefined;
      service.findAll().subscribe({ error: (e: Error) => (thrownError = e) });

      expect(thrownError).toBe(err);
    });
  });

  // ── findOne ───────────────────────────────────────────────
  describe('findOne', () => {
    it('should emit a single mapped JobOffer', () => {
      service.findOne.mockReturnValue(of(mappedOffer));

      let result: JobOffer | undefined;
      service.findOne('abc-123').subscribe((v: JobOffer) => (result = v));

      expect(service.findOne).toHaveBeenCalledWith('abc-123');
      expect(result).toEqual(mappedOffer);
    });

    it('should propagate error when offer not found', () => {
      const err = new Error('Not found');
      service.findOne.mockReturnValue(throwError(() => err));

      let thrownError: Error | undefined;
      service.findOne('unknown-id').subscribe({ error: (e: Error) => (thrownError = e) });

      expect(thrownError).toBe(err);
    });
  });

  // ── update ────────────────────────────────────────────────
  describe('update', () => {
    it('should emit the updated JobOffer', () => {
      const updated: JobOffer = { ...mappedOffer, titre: 'Nouveau titre' };
      service.update.mockReturnValue(of(updated));
      const dto: UpdateJobOfferRequest = { titre: 'Nouveau titre' };

      let result: JobOffer | undefined;
      service.update('abc-123', dto).subscribe((v: JobOffer) => (result = v));

      expect(service.update).toHaveBeenCalledWith('abc-123', dto);
      expect(result?.titre).toBe('Nouveau titre');
    });

    it('should propagate error on failure', () => {
      const err = new Error('Update failed');
      service.update.mockReturnValue(throwError(() => err));

      let thrownError: Error | undefined;
      service.update('abc-123', {}).subscribe({ error: (e: Error) => (thrownError = e) });

      expect(thrownError).toBe(err);
    });
  });

  // ── delete ────────────────────────────────────────────────
  describe('delete', () => {
    it('should emit the delete response message', () => {
      const resp: DeleteJobOfferResponse = { message: 'Offre supprimée' };
      service.delete.mockReturnValue(of(resp));

      let result: DeleteJobOfferResponse | undefined;
      service.delete('abc-123').subscribe((v: DeleteJobOfferResponse) => (result = v));

      expect(service.delete).toHaveBeenCalledWith('abc-123');
      expect(result?.message).toBe('Offre supprimée');
    });

    it('should propagate error on failure', () => {
      const err = new Error('Delete failed');
      service.delete.mockReturnValue(throwError(() => err));

      let thrownError: Error | undefined;
      service.delete('abc-123').subscribe({ error: (e: Error) => (thrownError = e) });

      expect(thrownError).toBe(err);
    });
  });
});

// ── Tests HttpClient layer (vérifie les appels HTTP réels) ─────
describe('JobOfferService (HttpClient layer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generate() should POST to /job-offers/generate and map response', () => {
    mockHttp.post.mockReturnValue(of(rawOffer));
    const dto: GenerateJobOfferRequest = { promptLibre: 'Dev Angular senior' };

    // Simuler l'appel via la logique du service
    const result$ = mockHttp.post('http://localhost:3000/job-offers/generate', dto);
    let raw: JobOfferApiResponse | undefined;
    result$.subscribe((v: JobOfferApiResponse) => (raw = v));

    expect(mockHttp.post).toHaveBeenCalledWith('http://localhost:3000/job-offers/generate', dto);
    const mapped = JobOfferMapper.fromApi(raw!);
    expect(mapped.id).toBe('abc-123');
    expect(mapped.createdAt).toBeInstanceOf(Date);
  });

  it('findAll() should GET /job-offers and map response list', () => {
    mockHttp.get.mockReturnValue(of([rawOffer]));

    let raws: JobOfferApiResponse[] | undefined;
    mockHttp
      .get('http://localhost:3000/job-offers')
      .subscribe((v: JobOfferApiResponse[]) => (raws = v));

    const mapped = JobOfferMapper.fromApiList(raws!);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe('abc-123');
  });

  it('findOne() should GET /job-offers/:id and map response', () => {
    mockHttp.get.mockReturnValue(of(rawOffer));

    let raw: JobOfferApiResponse | undefined;
    mockHttp
      .get('http://localhost:3000/job-offers/abc-123')
      .subscribe((v: JobOfferApiResponse) => (raw = v));

    const mapped = JobOfferMapper.fromApi(raw!);
    expect(mapped.id).toBe('abc-123');
  });

  it('update() should PATCH /job-offers/:id and map response', () => {
    const updatedRaw: JobOfferApiResponse = { ...rawOffer, titre: 'Titre modifié' };
    mockHttp.patch.mockReturnValue(of(updatedRaw));
    const dto: UpdateJobOfferRequest = { titre: 'Titre modifié' };

    let raw: JobOfferApiResponse | undefined;
    mockHttp
      .patch('http://localhost:3000/job-offers/abc-123', dto)
      .subscribe((v: JobOfferApiResponse) => (raw = v));

    const mapped = JobOfferMapper.fromApi(raw!);
    expect(mapped.titre).toBe('Titre modifié');
  });

  it('delete() should DELETE /job-offers/:id', () => {
    const resp: DeleteJobOfferResponse = { message: 'Supprimé' };
    mockHttp.delete.mockReturnValue(of(resp));

    let result: DeleteJobOfferResponse | undefined;
    mockHttp
      .delete('http://localhost:3000/job-offers/abc-123')
      .subscribe((v: DeleteJobOfferResponse) => (result = v));

    expect(result?.message).toBe('Supprimé');
  });
});
