import { describe, it, expect } from 'vitest';
import { JobOfferMapper } from './job-offer.mapper';
import { JobOfferApiResponse, JobOffer } from '../models/job-offer.model';

// ── Fixture ───────────────────────────────────────────────────
const rawOffer: JobOfferApiResponse = {
  id: 'abc-123',
  jobPostId: null, // ← ajouté
  promptLibre: 'Développeur Angular senior',
  titre: 'Développeur Angular Senior',
  accroche: 'Rejoignez notre équipe tech !',
  formatLinkedin: '🚀 Nous recrutons...',
  missions: ['Développer des features', 'Code review'],
  profil: ['3 ans Angular', 'TypeScript avancé'],
  avantages: ['Remote', 'RTT'],
  hashtags: ['#angular', '#typescript'],
  motsCles: ['angular', 'frontend'],
  isPublished: false,
  userId: 42,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T12:00:00.000Z',
};

describe('JobOfferMapper', () => {
  // ── fromApi ───────────────────────────────────────────────
  describe('fromApi', () => {
    it('should map all scalar fields correctly', () => {
      const result: JobOffer = JobOfferMapper.fromApi(rawOffer);

      expect(result.id).toBe('abc-123');
      expect(result.promptLibre).toBe('Développeur Angular senior');
      expect(result.titre).toBe('Développeur Angular Senior');
      expect(result.accroche).toBe('Rejoignez notre équipe tech !');
      expect(result.formatLinkedin).toBe('🚀 Nous recrutons...');
      expect(result.isPublished).toBe(false);
      expect(result.userId).toBe(42);
    });

    it('should map array fields correctly', () => {
      const result: JobOffer = JobOfferMapper.fromApi(rawOffer);

      expect(result.missions).toEqual(['Développer des features', 'Code review']);
      expect(result.profil).toEqual(['3 ans Angular', 'TypeScript avancé']);
      expect(result.avantages).toEqual(['Remote', 'RTT']);
      expect(result.hashtags).toEqual(['#angular', '#typescript']);
      expect(result.motsCles).toEqual(['angular', 'frontend']);
    });

    it('should convert createdAt string to Date', () => {
      const result: JobOffer = JobOfferMapper.fromApi(rawOffer);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should convert updatedAt string to Date', () => {
      const result: JobOffer = JobOfferMapper.fromApi(rawOffer);

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.toISOString()).toBe('2024-01-16T12:00:00.000Z');
    });

    it('should default missions to [] when null/undefined in response', () => {
      const raw: JobOfferApiResponse = {
        ...rawOffer,
        missions: null as unknown as string[],
      };
      const result: JobOffer = JobOfferMapper.fromApi(raw);
      expect(result.missions).toEqual([]);
    });

    it('should default profil to [] when null/undefined in response', () => {
      const raw: JobOfferApiResponse = {
        ...rawOffer,
        profil: null as unknown as string[],
      };
      const result: JobOffer = JobOfferMapper.fromApi(raw);
      expect(result.profil).toEqual([]);
    });

    it('should default avantages to [] when null/undefined in response', () => {
      const raw: JobOfferApiResponse = {
        ...rawOffer,
        avantages: null as unknown as string[],
      };
      const result: JobOffer = JobOfferMapper.fromApi(raw);
      expect(result.avantages).toEqual([]);
    });

    it('should default hashtags to [] when null/undefined in response', () => {
      const raw: JobOfferApiResponse = {
        ...rawOffer,
        hashtags: null as unknown as string[],
      };
      const result: JobOffer = JobOfferMapper.fromApi(raw);
      expect(result.hashtags).toEqual([]);
    });

    it('should default motsCles to [] when null/undefined in response', () => {
      const raw: JobOfferApiResponse = {
        ...rawOffer,
        motsCles: null as unknown as string[],
      };
      const result: JobOffer = JobOfferMapper.fromApi(raw);
      expect(result.motsCles).toEqual([]);
    });

    it('should map isPublished=true correctly', () => {
      const raw: JobOfferApiResponse = { ...rawOffer, isPublished: true };
      const result: JobOffer = JobOfferMapper.fromApi(raw);
      expect(result.isPublished).toBe(true);
    });
  });

  // ── fromApiList ───────────────────────────────────────────
  describe('fromApiList', () => {
    it('should map an empty array to an empty array', () => {
      const result: JobOffer[] = JobOfferMapper.fromApiList([]);
      expect(result).toEqual([]);
    });

    it('should map a list of one item', () => {
      const result: JobOffer[] = JobOfferMapper.fromApiList([rawOffer]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('abc-123');
    });

    it('should map multiple items preserving order', () => {
      const raw2: JobOfferApiResponse = { ...rawOffer, id: 'xyz-456', titre: 'Deuxième offre' };
      const result: JobOffer[] = JobOfferMapper.fromApiList([rawOffer, raw2]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('abc-123');
      expect(result[1].id).toBe('xyz-456');
      expect(result[1].titre).toBe('Deuxième offre');
    });

    it('should return Date instances for each item', () => {
      const raw2: JobOfferApiResponse = { ...rawOffer, id: 'xyz-456' };
      const result: JobOffer[] = JobOfferMapper.fromApiList([rawOffer, raw2]);

      result.forEach((offer) => {
        expect(offer.createdAt).toBeInstanceOf(Date);
        expect(offer.updatedAt).toBeInstanceOf(Date);
      });
    });
  });
});
