import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResumeEvaluationWebhookController } from './resume-evaluation-webhook.controller';
import { ResumeEvaluationService } from '../services/resume-evaluations.service';

type MockedResumeEvaluationService = jest.Mocked<Pick<ResumeEvaluationService, 'markOutdated'>>;

describe('ResumeEvaluationWebhookController', () => {
  let controller: ResumeEvaluationWebhookController;
  let service: MockedResumeEvaluationService;

  beforeEach(async () => {
    const mockService: MockedResumeEvaluationService = {
      markOutdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResumeEvaluationWebhookController],
      providers: [
        { provide: ResumeEvaluationService, useValue: mockService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ResumeEvaluationWebhookController>(ResumeEvaluationWebhookController);
    service = mockService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markOutdated', () => {
    it('calls service with highlightedFileId when present', () => {
      service.markOutdated.mockResolvedValue({ updated: 3 });

      const result = controller.markOutdated({ highlightedFileId: 'file-123' });

      expect(service.markOutdated).toHaveBeenCalledWith('file-123');
      expect(result).resolves.toEqual({ updated: 3 });
    });

    it('throws BadRequestException when highlightedFileId is missing', () => {
      expect(() => controller.markOutdated({ highlightedFileId: '' })).toThrow(BadRequestException);
      expect(service.markOutdated).not.toHaveBeenCalled();
    });
  });
});