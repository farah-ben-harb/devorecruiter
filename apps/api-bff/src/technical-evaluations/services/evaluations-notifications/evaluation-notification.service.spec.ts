import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationNotificationService } from './evaluation-notification.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../../users/entities/user.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import { JobPost } from '../../../job-posts/entities/job-post.entity';

// ── Types pour les mocks ──────────────────────────────────────────────────────
interface MockMailer {
  sendMail: jest.Mock;
}

interface MockConfig {
  get: jest.Mock;
}

interface MockUserRepo {
  find: jest.Mock;
}

describe('EvaluationNotificationService', () => {
  let service: EvaluationNotificationService;
  let mailerServiceMock: MockMailer;
  let configServiceMock: MockConfig;
  let userRepoMock: MockUserRepo;

  beforeEach(async () => {
    mailerServiceMock = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    configServiceMock = {
      get: jest.fn().mockReturnValue('http://frontend-url.com'),
    };

    userRepoMock = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationNotificationService,
        { provide: MailerService, useValue: mailerServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: getRepositoryToken(User), useValue: userRepoMock },
      ],
    }).compile();

    service = module.get<EvaluationNotificationService>(
      EvaluationNotificationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send emails to all referents', async () => {
    userRepoMock.find.mockResolvedValue([
      {
        id: 1,
        email: 'ref1@test.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      {
        id: 2,
        email: 'ref2@test.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    ]);

    const evaluation: Partial<TechnicalEvaluation> = {
      title: 'NestJS Test',
      version: 'v1',
      quizContent: null,
      driveFileUrl: 'http://file.com',
      pdfUrl: null,
    };

    const jobPost: Partial<JobPost> = {
      id: 10,
      name: 'Backend Developer',
    };

    await service.notifyReferents(
      evaluation as TechnicalEvaluation,
      jobPost as JobPost,
    );

    expect(userRepoMock.find).toHaveBeenCalledWith({
      where: { roles: UserRole.TECHNICAL_REFERENT },
      select: ['id', 'email', 'firstName', 'lastName'],
    });

    expect(mailerServiceMock.sendMail).toHaveBeenCalledTimes(2);
  });

  it('should not send emails if no referents exist', async () => {
    userRepoMock.find.mockResolvedValue([]);

    const loggerSpy = jest.spyOn(service['logger'], 'warn');

    const evaluation: Partial<TechnicalEvaluation> = {
      title: 'Test',
      quizContent: null,
    };

    const jobPost: Partial<JobPost> = {
      id: 1,
      name: 'Job',
    };

    await service.notifyReferents(
      evaluation as TechnicalEvaluation,
      jobPost as JobPost,
    );

    expect(mailerServiceMock.sendMail).not.toHaveBeenCalled();
    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should handle mailer errors without crashing', async () => {
    userRepoMock.find.mockResolvedValue([
      {
        id: 1,
        email: 'fail@test.com',
      },
    ]);

    mailerServiceMock.sendMail.mockRejectedValueOnce(
      new Error('SMTP error'),
    );

    const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

    const evaluation: Partial<TechnicalEvaluation> = {
      title: 'Eval',
      quizContent: null,
      version: '1',
      driveFileUrl: null,
      pdfUrl: null,
    };

    const jobPost: Partial<JobPost> = {
      id: 1,
      name: 'Job',
    };

    await service.notifyReferents(
      evaluation as TechnicalEvaluation,
      jobPost as JobPost,
    );

    expect(loggerErrorSpy).toHaveBeenCalled();
  });
});