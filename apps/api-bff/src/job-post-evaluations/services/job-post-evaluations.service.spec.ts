import { Test, TestingModule } from '@nestjs/testing';
import { JobPostEvaluationService } from './job-post-evaluations.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SCORING_JOB_POST_REPOSITORY } from '../interfaces/job-post-evaluations.interface';
import { CANDIDATE_REPOSITORY } from '../../candidates/interfaces/candidate-repository.interface';

describe('JobPostEvaluationService', () => {
  let service: JobPostEvaluationService;

  const mockScoringRepo = {
    createWithResults: jest.fn(),
    findLatestByCandidateId: jest.fn(),
    findAllByCandidateId: jest.fn(),
    deleteById: jest.fn(),
  };

  const mockCandidateRepo = {
    findBy: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostEvaluationService,
        { provide: SCORING_JOB_POST_REPOSITORY, useValue: mockScoringRepo },
        { provide: CANDIDATE_REPOSITORY, useValue: mockCandidateRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JobPostEvaluationService>(JobPostEvaluationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerScoring', () => {
    it('should throw NotFoundException if candidate not found', async () => {
      mockCandidateRepo.findBy.mockResolvedValue(null);
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'N8N_TIMEOUT_MS') return 900_000;
        return null;
      });

      await expect(service.triggerScoring('id-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if candidate has no CV', async () => {
      mockCandidateRepo.findBy.mockResolvedValue({
        id: 'id-1',
        unifieDriveId: null,
      });
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'N8N_TIMEOUT_MS') return 900_000;
        return null;
      });

      await expect(service.triggerScoring('id-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw InternalServerErrorException if N8N url not configured', async () => {
      mockCandidateRepo.findBy.mockResolvedValue({
        id: 'id-1',
        unifieDriveId: 'file-1',
      });
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'N8N_TIMEOUT_MS') return 900_000;
        return null;
      });

      await expect(service.triggerScoring('id-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should call repository and return TriggerScoringResponseDto on success', async () => {
      const candidate = { id: 'id-1', unifieDriveId: 'file-1' };
      mockCandidateRepo.findBy.mockResolvedValue(candidate);

      // Chaque clé reçoit la bonne valeur
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'N8N_SCORING_WEBHOOK_URL') return 'http://n8n-webhook';
        if (key === 'N8N_TIMEOUT_MS') return 900_000;
        if (key === 'N8N_SCORING_JOB_POST_MIN_SCORE') return '10';
        return null;
      });

      const n8nData = { matches: [{ scoreGlobal: 80, fileId: 'file-1' }] };
      mockHttpService.post.mockReturnValue(of({ data: n8nData }));
      mockScoringRepo.createWithResults.mockResolvedValue({
        id: 'score-1',
        completedAt: new Date(),
      });

      const result = await service.triggerScoring('id-1');

      expect(result).toHaveProperty('message');
      expect(result.totalMatch).toBe(1);
      expect(mockScoringRepo.createWithResults).toHaveBeenCalled();
    });
  });
});
