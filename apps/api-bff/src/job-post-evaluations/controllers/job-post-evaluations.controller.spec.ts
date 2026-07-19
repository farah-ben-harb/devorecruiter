import { Test, TestingModule } from '@nestjs/testing';
import { JobPostEvaluationController } from './job-post-evaluations.controller';
import { JobPostEvaluationService } from '../services/job-post-evaluations.service';

describe('JobPostEvaluationController', () => {
  let controller: JobPostEvaluationController;
  const mockService = {
    triggerScoring: jest.fn(),
    getLatestResult: jest.fn(),
    getHistory: jest.fn(),
    deleteResult: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobPostEvaluationController],
      providers: [{ provide: JobPostEvaluationService, useValue: mockService }],
    }).compile();

    controller = module.get<JobPostEvaluationController>(
      JobPostEvaluationController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call service.triggerScoring', async () => {
    mockService.triggerScoring.mockResolvedValue({
      message: 'ok',
      totalMatch: 1,
      matches: [],
      scoringId: '1',
      completedAt: new Date(),
    });
    const result = await controller.triggerScoring('id-1');
    expect(mockService.triggerScoring).toHaveBeenCalledWith('id-1');
    expect(result.message).toBe('ok');
  });

  it('should call service.getLatestResult', async () => {
    mockService.getLatestResult.mockResolvedValue(null);
    const result = await controller.getLatestResult('id-1');
    expect(mockService.getLatestResult).toHaveBeenCalledWith('id-1');
    expect(result).toBeNull();
  });

  it('should call service.getHistory', async () => {
    mockService.getHistory.mockResolvedValue([]);
    const result = await controller.getHistory('id-1');
    expect(mockService.getHistory).toHaveBeenCalledWith('id-1');
    expect(result).toEqual([]);
  });

  it('should call service.deleteResult', async () => {
    mockService.deleteResult.mockResolvedValue(undefined);
    await controller.deleteResult('id-1');
    expect(mockService.deleteResult).toHaveBeenCalledWith('id-1');
  });
});
