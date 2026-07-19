import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JobOfferRepository } from './job-offer.repository';
import { JobOffer } from '../entities/job-offer.entity';
import { ICreateJobOfferData, IUpdateJobOfferData } from '../interfaces/job-offer.interface';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeOffer = (overrides: Partial<JobOffer> = {}): JobOffer =>
  ({
    id: 'uuid-1',
    promptLibre: 'Développeur JS',
    titre: 'Développeur JS H/F',
    accroche: 'Accroche test',
    formatLinkedin: 'Format linkedin test',
    missions: ['Mission 1'],
    profil: ['Profil 1'],
    avantages: ['Avantage 1'],
    hashtags: ['#JS'],
    motsCles: ['javascript'],
    isPublished: false,
    userId: 42,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    user: {} as never,
    ...overrides,
  } as JobOffer);

const makeCreateData = (overrides: Partial<ICreateJobOfferData> = {}): ICreateJobOfferData => ({
  promptLibre: 'Développeur JS',
  titre: 'Développeur JS H/F',
  accroche: 'Accroche test',
  formatLinkedin: 'Format linkedin test',
  missions: ['Mission 1'],
  profil: ['Profil 1'],
  avantages: ['Avantage 1'],
  hashtags: ['#JS'],
  motsCles: ['javascript'],
  userId: 42,
  ...overrides,
});

// ── Mock TypeORM repository ───────────────────────────────────────────────────

interface MockTypeOrmRepo {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  remove: jest.Mock;
}

describe('JobOfferRepository', () => {
  let repo: JobOfferRepository;
  let ormRepo: MockTypeOrmRepo;

  beforeEach(async () => {
    ormRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOfferRepository,
        { provide: getRepositoryToken(JobOffer), useValue: ormRepo },
      ],
    }).compile();

    repo = module.get<JobOfferRepository>(JobOfferRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and save a job offer', async () => {
      const data = makeCreateData();
      const offer = makeOffer();

      ormRepo.create.mockReturnValue(offer);
      ormRepo.save.mockResolvedValue(offer);

      const result = await repo.create(data);

      expect(ormRepo.create).toHaveBeenCalledWith(data);
      expect(ormRepo.save).toHaveBeenCalledWith(offer);
      expect(result).toEqual(offer);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all offers for a given userId ordered by createdAt DESC', async () => {
      const offers = [makeOffer(), makeOffer({ id: 'uuid-2' })];
      ormRepo.find.mockResolvedValue(offers);

      const result = await repo.findAll(42);

      expect(ormRepo.find).toHaveBeenCalledWith({
        where: { userId: 42 },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when the user has no offers', async () => {
      ormRepo.find.mockResolvedValue([]);

      const result = await repo.findAll(99);

      expect(result).toEqual([]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the offer when it belongs to the user', async () => {
      const offer = makeOffer();
      ormRepo.findOne.mockResolvedValue(offer);

      const result = await repo.findOne('uuid-1', 42);

      expect(ormRepo.findOne).toHaveBeenCalledWith({ where: { id: 'uuid-1', userId: 42 } });
      expect(result).toEqual(offer);
    });

    it('should return null when the offer does not exist', async () => {
      ormRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOne('unknown', 42);

      expect(result).toBeNull();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the offer', async () => {
      const offer = makeOffer();
      const updateData: IUpdateJobOfferData = { titre: 'Nouveau titre', isPublished: true };
      const updated = makeOffer({ titre: 'Nouveau titre', isPublished: true });

      ormRepo.findOne.mockResolvedValue(offer);
      ormRepo.save.mockResolvedValue(updated);

      const result = await repo.update('uuid-1', 42, updateData);

      expect(ormRepo.save).toHaveBeenCalled();
      expect(result.titre).toBe('Nouveau titre');
      expect(result.isPublished).toBe(true);
    });

    it('should throw NotFoundException when the offer does not belong to the user', async () => {
      ormRepo.findOne.mockResolvedValue(null);

      await expect(repo.update('uuid-1', 99, { titre: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should remove the offer', async () => {
      const offer = makeOffer();
      ormRepo.findOne.mockResolvedValue(offer);
      ormRepo.remove.mockResolvedValue(undefined);

      await repo.delete('uuid-1', 42);

      expect(ormRepo.remove).toHaveBeenCalledWith(offer);
    });

    it('should throw NotFoundException when the offer is not found', async () => {
      ormRepo.findOne.mockResolvedValue(null);

      await expect(repo.delete('uuid-1', 42)).rejects.toThrow(NotFoundException);
    });
  });
});