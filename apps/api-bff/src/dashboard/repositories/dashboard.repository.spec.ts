import { DashboardRepository } from './dashboard.repository';

describe('DashboardRepository (unit)', () => {
  let repo: DashboardRepository;

  const makeQB = (raw: any) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(raw),
    getCount: jest.fn().mockResolvedValue(raw),
    getMany: jest.fn().mockResolvedValue(raw),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    const anyRepo: any = {
      userRepo: { createQueryBuilder: jest.fn().mockReturnValue(makeQB(0)) },
      jobPostRepo: {
        count: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(makeQB(0)),
      },
      candidateRepo: {
        count: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(makeQB(0)),
      },
      evalRepo: {
        createQueryBuilder: jest.fn().mockReturnValue(
          makeQB([
            { status: 'pending', count: '2' },
            { status: 'completed', count: '3' },
          ]),
        ),
      },
      invitationRepo: {
        count: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue(makeQB(0)),
      },
      conversationRepo: {
        createQueryBuilder: jest.fn().mockReturnValue(makeQB(0)),
      },
      messageRepo: { createQueryBuilder: jest.fn().mockReturnValue(makeQB(0)) },
      userMemoryRepo: {
        createQueryBuilder: jest.fn().mockReturnValue(makeQB(0)),
      },
    };

    // construct with positional args expected by constructor
    repo = new DashboardRepository(
      anyRepo.userRepo,
      anyRepo.jobPostRepo,
      anyRepo.candidateRepo,
      anyRepo.evalRepo,
      anyRepo.invitationRepo,
      anyRepo.conversationRepo,
      anyRepo.messageRepo,
      anyRepo.userMemoryRepo,
    );
  });

  it('countJobPostsTotal forwards to repo.count', async () => {
    // replace jobPostRepo.count with a concrete value
    // @ts-ignore
    repo['jobPostRepo'].count = jest.fn().mockResolvedValue(7);

    const res = await repo.countJobPostsTotal();
    expect(res).toBe(7);
  });

  it('parses evaluation raw results into counts', async () => {
    // ensure evalRepo.createQueryBuilder(...).getRawMany() returned array from beforeEach
    const res = await repo.countEvaluationsByStatus();
    expect(res.pending).toBe(2);
    expect(res.completed).toBe(3);
    expect(res.in_progress).toBe(0);
  });

  it('countCvs returns computed bruts and unifies', async () => {
    // @ts-ignore
    repo['candidateRepo'].count = jest.fn().mockResolvedValue(10);
    // @ts-ignore override createQueryBuilder.getCount
    repo['candidateRepo'].createQueryBuilder = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(4),
    });

    const res = await repo.countCvs();
    expect(res.total).toBe(10);
    expect(res.unifies).toBe(4);
    expect(res.bruts).toBe(6);
  });
});
