// job-offer.model.spec.ts

import {
  JobOffer,
  GenerateJobOfferRequest,
  UpdateJobOfferRequest,
  JobOfferState,
  JobOfferStatus,
  initialJobOfferState,
  JobOfferApiResponse,
  DeleteJobOfferResponse,
} from './job-offer.model';

describe('Job Offer Models', () => {
  describe('JobOffer Interface', () => {
    it('should create a valid JobOffer object', () => {
      const jobOffer: JobOffer = {
        id: '1',
        jobPostId: null,
        promptLibre: 'Développeur Angular',
        titre: 'Développeur Frontend Angular',
        accroche: 'Rejoignez notre équipe tech',
        formatLinkedin: 'Description LinkedIn complète',
        missions: ['Développer des composants'],
        profil: ['3 ans expérience Angular'],
        avantages: ['Télétravail'],
        hashtags: ['#Angular'],
        motsCles: ['angular', 'typescript'],
        isPublished: false,
        userId: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(jobOffer).toBeDefined();

      expect(jobOffer.titre).toBe('Développeur Frontend Angular');

      expect(jobOffer.isPublished).toBe(false);

      expect(jobOffer.missions).toContain('Développer des composants');

      expect(jobOffer.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('GenerateJobOfferRequest Interface', () => {
    it('should create a valid GenerateJobOfferRequest object', () => {
      const request: GenerateJobOfferRequest = {
        promptLibre: 'Créer une offre backend NestJS',
      };

      expect(request.promptLibre).toBe('Créer une offre backend NestJS');
    });
  });

  describe('UpdateJobOfferRequest Interface', () => {
    it('should create a valid partial UpdateJobOfferRequest object', () => {
      const updateRequest: UpdateJobOfferRequest = {
        titre: 'Nouveau titre',
        isPublished: true,
      };

      expect(updateRequest.titre).toBe('Nouveau titre');

      expect(updateRequest.isPublished).toBe(true);
    });

    it('should allow empty UpdateJobOfferRequest object', () => {
      const updateRequest: UpdateJobOfferRequest = {};

      expect(updateRequest).toEqual({});
    });
  });

  describe('JobOfferStatus Type', () => {
    it('should accept valid status values', () => {
      const status1: JobOfferStatus = 'idle';
      const status2: JobOfferStatus = 'loading';
      const status3: JobOfferStatus = 'generating';
      const status4: JobOfferStatus = 'success';
      const status5: JobOfferStatus = 'error';

      expect(status1).toBe('idle');
      expect(status2).toBe('loading');
      expect(status3).toBe('generating');
      expect(status4).toBe('success');
      expect(status5).toBe('error');
    });
  });

  describe('JobOfferState Interface', () => {
    it('should create a valid JobOfferState object', () => {
      const state: JobOfferState = {
        offers: [],
        selectedOffer: null,
        status: 'idle',
        error: null,
        generateStatus: 'idle',
        generateError: null,
      };

      expect(state.offers).toEqual([]);

      expect(state.selectedOffer).toBeNull();

      expect(state.status).toBe('idle');

      expect(state.error).toBeNull();
    });
  });

  describe('initialJobOfferState', () => {
    it('should match the expected initial state', () => {
      expect(initialJobOfferState).toEqual({
        offers: [],
        selectedOffer: null,
        status: 'idle',
        error: null,
        generateStatus: 'idle',
        generateError: null,
      });
    });

    it('should initialize with empty offers array', () => {
      expect(initialJobOfferState.offers).toHaveLength(0);
    });

    it('should initialize statuses as idle', () => {
      expect(initialJobOfferState.status).toBe('idle');

      expect(initialJobOfferState.generateStatus).toBe('idle');
    });
  });

  describe('JobOfferApiResponse Interface', () => {
    it('should create a valid JobOfferApiResponse object', () => {
      const response: JobOfferApiResponse = {
        id: '1',
        jobPostId: null, // ← ajouté
        promptLibre: 'Prompt test',
        titre: 'Titre test',
        accroche: 'Accroche test',
        formatLinkedin: 'Format LinkedIn',
        missions: ['Mission 1'],
        profil: ['Profil 1'],
        avantages: ['Avantage 1'],
        hashtags: ['#Test'],
        motsCles: ['test'],
        isPublished: true,
        userId: 5,
        createdAt: '2026-05-20T10:00:00.000Z',
        updatedAt: '2026-05-20T11:00:00.000Z',
      };

      expect(response.isPublished).toBe(true);

      expect(response.createdAt).toContain('2026');

      expect(response.hashtags).toContain('#Test');
    });
  });

  describe('DeleteJobOfferResponse Interface', () => {
    it('should create a valid DeleteJobOfferResponse object', () => {
      const response: DeleteJobOfferResponse = {
        message: 'Offre supprimée avec succès',
      };

      expect(response.message).toBe('Offre supprimée avec succès');
    });
  });
});
