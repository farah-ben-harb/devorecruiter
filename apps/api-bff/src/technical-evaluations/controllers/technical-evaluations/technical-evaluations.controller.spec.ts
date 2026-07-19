import { Test, TestingModule } from '@nestjs/testing';
import { TechnicalEvaluationController } from './technical-evaluations.controller';
import { TechnicalEvaluationService } from '../../services/technical-evaluations/technical-evaluations.service';
import { CandidateCodeEvaluationService } from '../../services/candidate-code-evaluations/candidate-code-evaluation.service';

// mock util (important car utilisé partout)
jest.mock('../../../common/utils/auth-request.util', () => ({
  requireGoogleAccessToken: jest.fn(() => ({ id: 1 })),
}));

describe('TechnicalEvaluationController', () => {
  let controller: TechnicalEvaluationController;

  const mockService = {
    generate: jest.fn(),
    syncFromDrive: jest.fn(),
    regenerate: jest.fn(),
    findAll: jest.fn(),
    findAllByJobPost: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    approve: jest.fn(),
    updateContent: jest.fn(),
    createGitRepo: jest.fn(),
  };

  const mockCodeService = {
    findByInvitation: jest.fn(),
    findByEvaluation: jest.fn(),
    evaluateCandidateWork: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechnicalEvaluationController],
      providers: [
        { provide: TechnicalEvaluationService, useValue: mockService },
        { provide: CandidateCodeEvaluationService, useValue: mockCodeService },
      ],
    }).compile();

    controller = module.get<TechnicalEvaluationController>(
      TechnicalEvaluationController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────
  // GENERATE
  // ─────────────────────────────
  it('should call generate service', async () => {
    mockService.generate.mockResolvedValue({ id: 1 });

    const result = await controller.generate(
      { user: {} } as any,
      { jobPostId: 1 } as any,
    );

    expect(mockService.generate).toHaveBeenCalledWith(1, { jobPostId: 1 });
    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────
  // SYNC DRIVE
  // ─────────────────────────────
  it('should sync drive', async () => {
    mockService.syncFromDrive.mockResolvedValue({ added: 1, removed: 0 });

    const result = await controller.syncFromDrive({} as any, 1);

    expect(mockService.syncFromDrive).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual({ added: 1, removed: 0 });
  });

  // ─────────────────────────────
  // REGENERATE
  // ─────────────────────────────
  it('should regenerate evaluation', async () => {
    mockService.regenerate.mockResolvedValue({ id: 1 });

    const result = await controller.regenerate(
      { user: {} } as any,
      { evaluationId: 1, jobPostId: 1 } as any,
    );

    expect(mockService.regenerate).toHaveBeenCalled();
    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────
  // FIND ALL
  // ─────────────────────────────
  it('should find all evaluations', async () => {
    mockService.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll({} as any, 1);

    // Le contrôleur passe toujours 3 arguments : (userId, jobPostId, mode)
    // mode est undefined quand non fourni dans la query
    expect(mockService.findAll).toHaveBeenCalledWith(1, 1, undefined);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('should find all evaluations with mode filter', async () => {
    mockService.findAll.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findAll({} as any, 1, 'coding');

    expect(mockService.findAll).toHaveBeenCalledWith(1, 1, 'coding');
    expect(result).toEqual([{ id: 1 }]);
  });

  // ─────────────────────────────
  // FIND BY JOB POST
  // ─────────────────────────────
  it('should find by job post', async () => {
    mockService.findAllByJobPost.mockResolvedValue([{ id: 1 }]);

    const result = await controller.findByJobPost('1');

    expect(mockService.findAllByJobPost).toHaveBeenCalledWith(1);
    expect(result).toEqual([{ id: 1 }]);
  });

  // ─────────────────────────────
  // FIND BY ID
  // ─────────────────────────────
  it('should find by id', async () => {
    mockService.findById.mockResolvedValue({ id: 1 });

    const result = await controller.findById(1);

    expect(mockService.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────
  // UPDATE
  // ─────────────────────────────
  it('should update evaluation', async () => {
    mockService.update.mockResolvedValue({ id: 1 });

    const result = await controller.update(1, { title: 'x' } as any);

    expect(mockService.update).toHaveBeenCalledWith(1, { title: 'x' });
    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────
  // DELETE
  // ─────────────────────────────
  it('should delete evaluation', async () => {
    mockService.delete.mockResolvedValue(undefined);

    const result = await controller.delete({} as any, 1);

    expect(mockService.delete).toHaveBeenCalledWith(1, 1);
    expect(result).toBeUndefined();
  });

  // ─────────────────────────────
  // APPROVE
  // ─────────────────────────────
  it('should approve evaluation', async () => {
    mockService.approve.mockResolvedValue({ id: 1 });

    const result = await controller.approve(1, { status: 'APPROVED' } as any);

    expect(mockService.approve).toHaveBeenCalledWith(1, {
      status: 'APPROVED',
    });

    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────
  // UPDATE CONTENT
  // ─────────────────────────────
  it('should update content', async () => {
    mockService.updateContent.mockResolvedValue({ id: 1 });

    const result = await controller.updateContent(
      {} as any,
      1,
      {
        htmlContent: 'x',
        isQuiz: true,
      } as any,
    );

    expect(mockService.updateContent).toHaveBeenCalled();
    expect(result).toEqual({ id: 1 });
  });

  // ─────────────────────────────
  // GIT REPO
  // ─────────────────────────────
  it('should create git repo', async () => {
    mockService.createGitRepo.mockResolvedValue({
      gitRepoUrl: 'http://github.com/repo',
    });

    const result = await controller.createGitRepo(1);

    expect(mockService.createGitRepo).toHaveBeenCalledWith(1);
    expect(result).toEqual({ gitRepoUrl: 'http://github.com/repo' });
  });

  // ─────────────────────────────
  // CANDIDATE CODE EVAL
  // ─────────────────────────────
  it('should evaluate candidate code', async () => {
    mockCodeService.evaluateCandidateWork.mockResolvedValue({ id: 1 });

    const result = await controller.evaluateCandidateCode('1');

    expect(mockCodeService.evaluateCandidateWork).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1 });
  });
});