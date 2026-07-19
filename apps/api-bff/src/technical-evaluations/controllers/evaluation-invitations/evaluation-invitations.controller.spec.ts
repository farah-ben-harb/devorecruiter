import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from '../../services/evaluation-invitations/evaluation-invitations.service';
import { SendInvitationDto } from '../../dtos/evaluation-invitations/evaluation-invitation.dto';
import { InvitationsController } from './evaluation-invitations.controller';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let service: InvitationsService;

  const mockInvitationsService = {
    sendInvitations: jest.fn(),
    findByResumeFileId: jest.fn(),
    findByJobPost: jest.fn(),
    deleteInvitation: jest.fn(),
    findByEvaluation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: mockInvitationsService,
        },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
    service = module.get<InvitationsService>(InvitationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────────── send ─────────────────────────────
  it('should send invitations', async () => {
    const dto: SendInvitationDto = {
      evaluationId: 1,
      jobPostId: 2,
      dueDate: new Date().toISOString(),
      scoringResumeIds: [],
      unscoredResumeIds: [],
    };

    mockInvitationsService.sendInvitations.mockResolvedValue({ sent: 3 });

    const result = await controller.send(dto);

    expect(service.sendInvitations).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ sent: 3 });
  });

  // ─────────────────────── by resume file ───────────────────────
  it('should get invitations by resume file id', async () => {
    const resumeFileId = 'file-123';

    mockInvitationsService.findByResumeFileId.mockResolvedValue([
      { id: 1 },
    ]);

    const result = await controller.getByResumeFileId(resumeFileId);

    expect(service.findByResumeFileId).toHaveBeenCalledWith(resumeFileId);
    expect(result).toEqual([{ id: 1 }]);
  });

  // ─────────────────────── by job post ───────────────────────────
  it('should get invitations by job post', async () => {
    mockInvitationsService.findByJobPost.mockResolvedValue([{ id: 1 }]);

    const result = await controller.getByJobPost(5);

    expect(service.findByJobPost).toHaveBeenCalledWith(5);
    expect(result).toEqual([{ id: 1 }]);
  });

  // ─────────────────────── delete ────────────────────────────────
  it('should delete invitation', async () => {
    mockInvitationsService.deleteInvitation.mockResolvedValue(undefined);

    const result = await controller.deleteInvitation(10);

    expect(service.deleteInvitation).toHaveBeenCalledWith(10);
    expect(result).toBeUndefined();
  });

  // ─────────────────────── by evaluation ─────────────────────────
  it('should get invitations by evaluation', async () => {
    mockInvitationsService.findByEvaluation.mockResolvedValue([
      { id: 1 },
    ]);

    const result = await controller.getByEvaluation(3);

    expect(service.findByEvaluation).toHaveBeenCalledWith(3);
    expect(result).toEqual([{ id: 1 }]);
  });
});