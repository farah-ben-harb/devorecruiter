import { Repository } from 'typeorm';
import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { ResumeEvaluation } from '../../../resume-evaluations/entities/resume-evaluation.entity';
import { Candidate } from '../../../candidates/entities/candidate.entity';
import { CandidateCodeEvaluation } from '../../entities/candidate-code-evaluations/candidate-code-evaluations.entity';
import { SendInvitationDto } from '../../dtos/evaluation-invitations/evaluation-invitation.dto';
import { InvitationsService } from './evaluation-invitations.service';
import { MailerService } from '@nestjs-modules/mailer';
import { GithubService } from '../github/github.service';
import { ConfigService } from '@nestjs/config';

// ── Types pour les mocks ──────────────────────────────────────────────────────
interface MockMailer {
  sendMail: jest.Mock;
}

interface MockGithub {
  createRepoForCandidate: jest.Mock;
}

interface MockConfig {
  get: jest.Mock;
  getOrThrow: jest.Mock;
}

// ── Type pour un repo mock simplifié (pas besoin de toutes les méthodes TypeORM)
interface MockRepository<T> {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  delete: jest.Mock;
  findOneBy?: jest.Mock;
  findBy?: jest.Mock;
  findAndCount?: jest.Mock;
  count?: jest.Mock;
  update?: jest.Mock;
  remove?: jest.Mock;
  softDelete?: jest.Mock;
  restore?: jest.Mock;
  query?: jest.Mock;
  createQueryBuilder?: jest.Mock;
  metadata?: unknown;
  target?: unknown;
  manager?: unknown;
}

// ── Helper pour créer un repo mock ─────────────────────────────────────────────
function createMockRepo<T>(): MockRepository<T> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
}

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invitationRepo: MockRepository<Invitation>;
  let evaluationRepo: MockRepository<TechnicalEvaluation>;
  let resumeRepo: MockRepository<ResumeEvaluation>;
  let candidateRepo: MockRepository<Candidate>;
  let codeRepo: MockRepository<CandidateCodeEvaluation>;
  let mailerService: MockMailer;
  let githubService: MockGithub;
  let configService: MockConfig;

  beforeEach(() => {
    invitationRepo = createMockRepo<Invitation>();
    invitationRepo.create.mockImplementation((dto) => dto as Invitation);
    invitationRepo.save.mockImplementation((e) => Promise.resolve(e as Invitation));

    evaluationRepo = createMockRepo<TechnicalEvaluation>();
    resumeRepo = createMockRepo<ResumeEvaluation>();
    candidateRepo = createMockRepo<Candidate>();
    codeRepo = createMockRepo<CandidateCodeEvaluation>();

    mailerService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    githubService = {
      createRepoForCandidate: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('http://frontend'),
      getOrThrow: jest.fn().mockReturnValue('http://frontend'),
    };

    service = new InvitationsService(
      invitationRepo as unknown as Repository<Invitation>,
      evaluationRepo as unknown as Repository<TechnicalEvaluation>,
      resumeRepo as unknown as Repository<ResumeEvaluation>,
      candidateRepo as unknown as Repository<Candidate>,
      codeRepo as unknown as Repository<CandidateCodeEvaluation>,
      mailerService as unknown as MailerService,
      githubService as unknown as GithubService,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error if evaluation not found', async () => {
    evaluationRepo.findOne.mockResolvedValue(null);

    const dto: SendInvitationDto = {
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '2026-01-01',
    };

    await expect(service.sendInvitations(dto)).rejects.toThrow(
      'Évaluation 1 introuvable.',
    );
  });

  it('should send invitation for scoring resumes', async () => {
    evaluationRepo.findOne.mockResolvedValue({
      id: 1,
      title: 'Test Eval',
      quizContent: null,
    } as TechnicalEvaluation);

    resumeRepo.find.mockResolvedValue([
      { id: 1, resumeFileId: 'file1' },
    ] as ResumeEvaluation[]);

    candidateRepo.findOne.mockResolvedValue({
      id: 'c1',
      email: 'test@mail.com',
      name: 'Doe',
      firstName: 'John',
      githubUsername: 'john',
    } as Candidate);

    githubService.createRepoForCandidate.mockResolvedValue(
      'https://github.com/test/repo',
    );

    const dto: SendInvitationDto = {
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '2026-01-01',
      scoringResumeIds: [1],
    };

    const result = await service.sendInvitations(dto);

    expect(result.sent).toBe(1);
    expect(mailerService.sendMail).toHaveBeenCalled();
    expect(invitationRepo.save).toHaveBeenCalled();
  });

  it('should skip candidate without email', async () => {
    evaluationRepo.findOne.mockResolvedValue({
      id: 1,
      title: 'Test Eval',
      quizContent: null,
    } as TechnicalEvaluation);

    resumeRepo.find.mockResolvedValue([
      { id: 1, resumeFileId: 'file1' },
    ] as ResumeEvaluation[]);

    candidateRepo.findOne.mockResolvedValue(null);

    const dto: SendInvitationDto = {
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '2026-01-01',
      scoringResumeIds: [1],
    };

    const result = await service.sendInvitations(dto);

    expect(result.sent).toBe(0);
  });

  it('should create quiz invitation with token', async () => {
    evaluationRepo.findOne.mockResolvedValue({
      id: 1,
      title: 'Quiz Eval',
      quizContent: '[]',
      gitRepoUrl: null,
    } as TechnicalEvaluation);

    resumeRepo.find.mockResolvedValue([]);
    candidateRepo.findOne.mockResolvedValue({
      id: 'c1',
      email: 'test@mail.com',
      name: 'Doe',
      firstName: 'John',
    } as Candidate);

    githubService.createRepoForCandidate.mockResolvedValue(null);

    const dto: SendInvitationDto = {
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '2026-01-01',
      unscoredResumeIds: ['file1'],
    };

    await service.sendInvitations(dto);

    expect(mailerService.sendMail).toHaveBeenCalled();
  });
});
