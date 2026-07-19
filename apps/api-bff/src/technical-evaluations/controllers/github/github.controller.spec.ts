import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { GithubController } from './github.controller';
import { CandidateCodeEvaluationService } from '../../services/candidate-code-evaluations/candidate-code-evaluation.service';
import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';

// Types pour les mocks
interface PushPayload {
  ref: string;
  repository: {
    name: string;
  };
}

interface InvitationMock extends Partial<Invitation> {
  id: number;
}

const MOCK_INVITATION: InvitationMock = { id: 42 };

const pushPayload = (
  repoName: string,
  ref: string = 'refs/heads/feature/auth',
): PushPayload => ({
  ref,
  repository: { name: repoName },
});

describe('GithubController', () => {
  let controller: GithubController;
  let invitationRepo: jest.Mocked<Pick<Repository<Invitation>, 'findOne'>>;
  let codeEvalService: jest.Mocked<
    Pick<CandidateCodeEvaluationService, 'evaluateCandidateWork'>
  >;

  beforeEach(async () => {
    invitationRepo = {
      findOne: jest.fn(),
    };

    codeEvalService = {
      evaluateCandidateWork: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubController],
      providers: [
        { provide: CandidateCodeEvaluationService, useValue: codeEvalService },
        { provide: getRepositoryToken(Invitation), useValue: invitationRepo },
      ],
    }).compile();

    controller = module.get<GithubController>(GithubController);
    jest.clearAllMocks();
  });

  describe('event filtering', () => {
    it('should return { received: true } and do nothing for non-push events', async () => {
      const result = await controller.handleGithubWebhook(
        'pull_request',
        pushPayload('my-repo'),
      );

      expect(result).toEqual({ received: true });
      expect(invitationRepo.findOne).not.toHaveBeenCalled();
      expect(codeEvalService.evaluateCandidateWork).not.toHaveBeenCalled();
    });

    it('should return { received: true } for ping event', async () => {
      const result = await controller.handleGithubWebhook(
        'ping',
        pushPayload('my-repo'),
      );

      expect(result).toEqual({ received: true });
      expect(invitationRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('branch filtering', () => {
    it('should ignore push on main branch', async () => {
      const result = await controller.handleGithubWebhook(
        'push',
        pushPayload('my-repo', 'refs/heads/main'),
      );

      expect(result).toEqual({ received: true });
      expect(invitationRepo.findOne).not.toHaveBeenCalled();
    });

    it('should ignore push on master branch', async () => {
      const result = await controller.handleGithubWebhook(
        'push',
        pushPayload('my-repo', 'refs/heads/master'),
      );

      expect(result).toEqual({ received: true });
      expect(invitationRepo.findOne).not.toHaveBeenCalled();
    });

    it('should ignore push when ref is missing', async () => {
      const result = await controller.handleGithubWebhook('push', {
        ref: '',
        repository: { name: 'my-repo' },
      });

      expect(result).toEqual({ received: true });
      expect(invitationRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('repository filtering', () => {
    it('should ignore push when repository name is missing', async () => {
      const result = await controller.handleGithubWebhook('push', {
        ref: 'refs/heads/feature/auth',
        repository: { name: '' },
      });

      expect(result).toEqual({ received: true });
      expect(invitationRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('happy path', () => {
    it('should find invitation by repo name and trigger evaluation', async () => {
      invitationRepo.findOne.mockResolvedValue(MOCK_INVITATION as Invitation);
      codeEvalService.evaluateCandidateWork.mockResolvedValue({} as never);

      const result = await controller.handleGithubWebhook(
        'push',
        pushPayload('frontend-test-jean-dupont'),
      );

      expect(result).toEqual({ received: true });
      expect(invitationRepo.findOne).toHaveBeenCalledWith({
        where: { gitRepoUrl: Like('%frontend-test-jean-dupont%') },
      });
      expect(codeEvalService.evaluateCandidateWork).toHaveBeenCalledWith(
        MOCK_INVITATION.id,
      );
    });

    it('should return { received: true } even when no invitation is found', async () => {
      invitationRepo.findOne.mockResolvedValue(null);

      const result = await controller.handleGithubWebhook(
        'push',
        pushPayload('unknown-repo'),
      );

      expect(result).toEqual({ received: true });
      expect(codeEvalService.evaluateCandidateWork).not.toHaveBeenCalled();
    });

    it('should correctly strip refs/heads/ prefix from branch', async () => {
      invitationRepo.findOne.mockResolvedValue(MOCK_INVITATION as Invitation);
      codeEvalService.evaluateCandidateWork.mockResolvedValue({} as never);

      await controller.handleGithubWebhook(
        'push',
        pushPayload('my-repo', 'refs/heads/feature/my-feature'),
      );

      expect(invitationRepo.findOne).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not throw when evaluateCandidateWork rejects', async () => {
      invitationRepo.findOne.mockResolvedValue(MOCK_INVITATION as Invitation);
      codeEvalService.evaluateCandidateWork.mockRejectedValue(
        new Error('AI timeout'),
      );

      await expect(
        controller.handleGithubWebhook('push', pushPayload('my-repo')),
      ).resolves.toEqual({ received: true });
    });
  });
});
