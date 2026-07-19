import { Test, TestingModule } from '@nestjs/testing';
import { JobOfferController } from './job-offer.controller';
import { JobOfferService } from '../services/job-offer.service';
import { JobOffer } from '../entities/job-offer.entity';
import { GenerateJobOfferDto, UpdateJobOfferDto } from '../dtos/job-offer.dto';
import { AuthRequest } from '../../auth/interfaces/auth.interface';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// requireGoogleAccessToken is a utility; we mock it to always return a known user
jest.mock('../../common/utils/auth-request.util', () => ({
  requireGoogleAccessToken: jest.fn().mockReturnValue({ id: 42, email: 'user@test.com' }),
}));

import { requireGoogleAccessToken } from '../../common/utils/auth-request.util';

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

// Fake AuthRequest – controller only forwards it to requireGoogleAccessToken
const fakeReq = {} as AuthRequest;

interface MockJobOfferService {
  generate: jest.Mock;
  findAll: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
}

describe('JobOfferController', () => {
  let controller: JobOfferController;
  let serviceMock: MockJobOfferService;

  beforeEach(async () => {
    serviceMock = {
      generate: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobOfferController],
      providers: [{ provide: JobOfferService, useValue: serviceMock }],
    })
      // Skip guards for unit tests
      .overrideGuard(require('../../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../../auth/guards/roles.guard').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JobOfferController>(JobOfferController);
  });

  afterEach(() => jest.clearAllMocks());

  // ── generate ──────────────────────────────────────────────────────────────

  describe('generate', () => {
    it('should call service.generate with the extracted userId and return the offer', async () => {
      const offer = makeOffer();
      serviceMock.generate.mockResolvedValue(offer);

      const dto: GenerateJobOfferDto = { promptLibre: 'Développeur JS en startup' };
      const result = await controller.generate(fakeReq, dto);

      expect(requireGoogleAccessToken).toHaveBeenCalledWith(fakeReq);
      expect(serviceMock.generate).toHaveBeenCalledWith(dto, 42);
      expect(result).toEqual(offer);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all offers for the authenticated user', async () => {
      const offers = [makeOffer(), makeOffer({ id: 'uuid-2' })];
      serviceMock.findAll.mockResolvedValue(offers);

      const result = await controller.findAll(fakeReq);

      expect(serviceMock.findAll).toHaveBeenCalledWith(42);
      expect(result).toHaveLength(2);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return the offer matching the given id', async () => {
      const offer = makeOffer();
      serviceMock.findOne.mockResolvedValue(offer);

      const result = await controller.findOne(fakeReq, 'uuid-1');

      expect(serviceMock.findOne).toHaveBeenCalledWith('uuid-1', 42);
      expect(result).toEqual(offer);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call service.update and return the updated offer', async () => {
      const updated = makeOffer({ titre: 'Nouveau titre' });
      serviceMock.update.mockResolvedValue(updated);

      const dto: UpdateJobOfferDto = { titre: 'Nouveau titre' };
      const result = await controller.update(fakeReq, 'uuid-1', dto);

      expect(serviceMock.update).toHaveBeenCalledWith('uuid-1', 42, dto);
      expect(result.titre).toBe('Nouveau titre');
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should call service.remove and return the confirmation message', async () => {
      const message = { message: 'Job offer #uuid-1 deleted successfully' };
      serviceMock.remove.mockResolvedValue(message);

      const result = await controller.remove(fakeReq, 'uuid-1');

      expect(serviceMock.remove).toHaveBeenCalledWith('uuid-1', 42);
      expect(result).toEqual(message);
    });
  });
});