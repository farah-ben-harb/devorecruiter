import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, SelectQueryBuilder, DeleteResult } from 'typeorm';
import { JobPost, JobPostStatus } from '../entities/job-post.entity';
import { JobPostRepository } from './job-posts.repository';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeJobPost(overrides: Partial<JobPost> = {}): JobPost {
  return {
    id: 1,
    title: 'Software Engineer',
    company: 'Acme Corp',
    status: JobPostStatus.RAW,
    googleDriveFileId: 'drive-file-id-123',
    googleDocId: null,
    unifiedUrl: null,
    startDate: null,
    requiresCoding: null,
    hasQcm: null,
    evaluationsFolderId: null,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as JobPost;
}

function makeDeleteResult(affected: number): DeleteResult {
  return { affected, raw: [] };
}

// ─── QueryBuilder mock ────────────────────────────────────────────────────────

type QueryBuilderMock = jest.Mocked<
  Pick<
    SelectQueryBuilder<JobPost>,
    | 'andWhere'
    | 'orderBy'
    | 'skip'
    | 'take'
    | 'getManyAndCount'
    | 'select'
    | 'from'
    | 'getRawMany'
  >
>;

function makeQbMock(
  data: JobPost[] = [],
  total = 0,
  rawMany: { jobPostId: number }[] = [],
): QueryBuilderMock {
  const qb = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([data, total]),
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawMany),
  };
  return qb as QueryBuilderMock;
}

// ─── TypeORM Repository mock type ────────────────────────────────────────────

type OrmRepoMock = jest.Mocked<
  Pick<Repository<JobPost>, 'create' | 'save' | 'findOne' | 'count' | 'delete'> & {
    createQueryBuilder: jest.Mock;
    manager: { createQueryBuilder: jest.Mock };
  }
>;

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('JobPostRepository', () => {
  let repo: JobPostRepository;
  let orm: OrmRepoMock;

  beforeEach(async () => {
    const qbMock = makeQbMock();

    orm = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostRepository,
        { provide: getRepositoryToken(JobPost), useValue: orm },
      ],
    }).compile();

    repo = module.get<JobPostRepository>(JobPostRepository);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and save a new job post', async () => {
      const post = makeJobPost();
      orm.create.mockReturnValue(post);
      orm.save.mockResolvedValue(post);

      const result = await repo.create({ title: 'Software Engineer' });

      expect(orm.create).toHaveBeenCalledWith({ title: 'Software Engineer' });
      expect(orm.save).toHaveBeenCalledWith(post);
      expect(result).toEqual(post);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    function setupFindAll(
      data: JobPost[],
      total: number,
      counts: [number, number, number] = [total, 0, total],
      rawMany: { jobPostId: number }[] = [],
    ): void {
      const qb = makeQbMock(data, total, rawMany);
      orm.createQueryBuilder.mockReturnValue(qb);
      orm.manager.createQueryBuilder.mockReturnValue(qb);
      orm.count
        .mockResolvedValueOnce(counts[0])
        .mockResolvedValueOnce(counts[1])
        .mockResolvedValueOnce(counts[2]);
    }

    it('should return a paginated result with correct meta', async () => {
      const post = makeJobPost();
      setupFindAll([post], 1, [10, 3, 7]);

      const result = await repo.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.totalAll).toBe(10);
      expect(result.meta.totalUnified).toBe(3);
      expect(result.meta.totalRaw).toBe(7);
    });

    it('should apply status filter for "unified"', async () => {
      setupFindAll([], 0);

      await repo.findAll(1, 10, undefined, JobPostStatus.UNIFIED);

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      expect(qb.andWhere).toHaveBeenCalledWith('jp.status = :status', {
        status: JobPostStatus.UNIFIED,
      });
    });

    it('should apply status filter for "raw" (excludes UNIFIED)', async () => {
      setupFindAll([], 0);

      await repo.findAll(1, 10, undefined, 'raw');

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      expect(qb.andWhere).toHaveBeenCalledWith('jp.status != :unified', {
        unified: JobPostStatus.UNIFIED,
      });
    });

    it('should not apply status filter when status is "all"', async () => {
      setupFindAll([], 0);

      await repo.findAll(1, 10, undefined, 'all');

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      const statusCalls = (qb.andWhere as jest.Mock).mock.calls.filter(
        ([clause]: [string]) =>
          clause.includes('jp.status = :status') ||
          clause.includes('jp.status != :unified'),
      );
      expect(statusCalls).toHaveLength(0);
    });

    it('should apply search filter when search term is provided', async () => {
      setupFindAll([], 0);

      await repo.findAll(1, 10, 'engineer');

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(jp.company ILIKE :term OR jp.name ILIKE :term OR jp.title ILIKE :term)',
        { term: '%engineer%' },
      );
    });

    it('should not apply search filter when search term is blank', async () => {
      setupFindAll([], 0);

      await repo.findAll(1, 10, '   ');

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      const searchCalls = (qb.andWhere as jest.Mock).mock.calls.filter(
        ([clause]: [string]) => clause.includes('ILIKE'),
      );
      expect(searchCalls).toHaveLength(0);
    });

    it('should filter by ids when onlyWithEvaluations is true and there are eval ids', async () => {
      const rawMany = [{ jobPostId: 1 }, { jobPostId: 2 }];
      setupFindAll([], 0, [0, 0, 0], rawMany);

      await repo.findAll(1, 10, undefined, undefined, true);

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      expect(qb.andWhere).toHaveBeenCalledWith('jp.id IN (:...ids)', {
        ids: expect.arrayContaining([1, 2]),
      });
    });

    it('should not filter by ids when onlyWithEvaluations is true but no evals exist', async () => {
      setupFindAll([], 0, [0, 0, 0], []);

      await repo.findAll(1, 10, undefined, undefined, true);

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      const idFilterCalls = (qb.andWhere as jest.Mock).mock.calls.filter(
        ([clause]: [string]) => clause.includes('jp.id IN'),
      );
      expect(idFilterCalls).toHaveLength(0);
    });

    it('should enrich data with hasEvaluation flag', async () => {
      const post = makeJobPost({ id: 1 });
      const rawMany = [{ jobPostId: 1 }];
      setupFindAll([post], 1, [1, 0, 1], rawMany);

      const result = await repo.findAll(1, 10);

      expect((result.data[0] as JobPost & { hasEvaluation: boolean }).hasEvaluation).toBe(true);
    });

    it('should calculate correct totalPages', async () => {
      const posts = Array.from({ length: 5 }, (_, i) => makeJobPost({ id: i + 1 }));
      setupFindAll(posts, 25, [25, 10, 15]);

      const result = await repo.findAll(1, 5);

      expect(result.meta.totalPages).toBe(5);
    });

    it('should apply correct pagination offset', async () => {
      setupFindAll([], 0);

      await repo.findAll(3, 10);

      const qb = orm.createQueryBuilder.mock.results[0].value as QueryBuilderMock;
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  // ── findByGoogleDriveFileId ───────────────────────────────────────────────

  describe('findByGoogleDriveFileId', () => {
    it('should return the job post with the matching google drive file id', async () => {
      const post = makeJobPost({ googleDriveFileId: 'drive-xyz' });
      orm.findOne.mockResolvedValue(post);

      const result = await repo.findByGoogleDriveFileId('drive-xyz');

      expect(orm.findOne).toHaveBeenCalledWith({
        where: { googleDriveFileId: 'drive-xyz' },
      });
      expect(result).toEqual(post);
    });

    it('should return null when no job post matches', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repo.findByGoogleDriveFileId('unknown');

      expect(result).toBeNull();
    });
  });

  // ── findBy ────────────────────────────────────────────────────────────────

  describe('findBy', () => {
    it('should return the job post matching the criteria', async () => {
      const post = makeJobPost({ id: 5 });
      orm.findOne.mockResolvedValue(post);

      const criteria: FindOptionsWhere<JobPost> = { id: 5 };
      const result = await repo.findBy(criteria);

      expect(orm.findOne).toHaveBeenCalledWith({ where: criteria });
      expect(result?.id).toBe(5);
    });

    it('should return null when no post matches the criteria', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repo.findBy({ id: 999 });

      expect(result).toBeNull();
    });
  });

  // ── save ──────────────────────────────────────────────────────────────────

  describe('save', () => {
    it('should save and return the entity', async () => {
      const post = makeJobPost({ title: 'Updated' });
      orm.save.mockResolvedValue(post);

      const result = await repo.save(post);

      expect(orm.save).toHaveBeenCalledWith(post);
      expect(result.title).toBe('Updated');
    });
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should update the status and return the updated post', async () => {
      const post = makeJobPost({ status: JobPostStatus.RAW });
      const updated = makeJobPost({ status: JobPostStatus.UNIFIED });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(updated);

      const result = await repo.updateStatus(1, JobPostStatus.UNIFIED);

      expect(post.status).toBe(JobPostStatus.UNIFIED);
      expect(orm.save).toHaveBeenCalledWith(post);
      expect(result.status).toBe(JobPostStatus.UNIFIED);
    });

    it('should throw NotFoundException when post is not found', async () => {
      orm.findOne.mockResolvedValue(null);

      await expect(repo.updateStatus(999, JobPostStatus.UNIFIED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── updateUnifie ──────────────────────────────────────────────────────────

  describe('updateUnifie', () => {
    it('should update all provided fields and save', async () => {
      const post = makeJobPost();
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue({ ...post, googleDocId: 'doc-1', status: JobPostStatus.UNIFIED });

      await repo.updateUnifie(1, {
        googleDocId: 'doc-1',
        status: JobPostStatus.UNIFIED,
        unifiedUrl: 'https://example.com',
        company: 'NewCorp',
        startDate: '2024-06-01',
        title: 'Senior Dev',
        requiresCoding: true,
        hasQcm: false,
      });

      expect(post.googleDocId).toBe('doc-1');
      expect(post.status).toBe(JobPostStatus.UNIFIED);
      expect(post.unifiedUrl).toBe('https://example.com');
      expect(post.company).toBe('NewCorp');
      expect(post.startDate).toBe('2024-06-01');
      expect(post.title).toBe('Senior Dev');
      expect(post.requiresCoding).toBe(true);
      expect(post.hasQcm).toBe(false);
      expect(orm.save).toHaveBeenCalledWith(post);
    });

    it('should update only required fields when optional fields are omitted', async () => {
      const post = makeJobPost({ company: 'Original Corp' });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateUnifie(1, {
        googleDocId: 'doc-min',
        status: JobPostStatus.UNIFIED,
      });

      expect(post.googleDocId).toBe('doc-min');
      expect(post.status).toBe(JobPostStatus.UNIFIED);
      expect(post.company).toBe('Original Corp');
    });

    it('should set requiresCoding to null when explicitly passed undefined via ?? null', async () => {
      const post = makeJobPost({ requiresCoding: true });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateUnifie(1, {
        googleDocId: 'doc-1',
        status: JobPostStatus.UNIFIED,
        requiresCoding: null,
      });

      expect(post.requiresCoding).toBeNull();
    });

    it('should throw NotFoundException when post is not found', async () => {
      orm.findOne.mockResolvedValue(null);

      await expect(
        repo.updateUnifie(999, { googleDocId: 'doc', status: JobPostStatus.UNIFIED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteBy ──────────────────────────────────────────────────────────────

  describe('deleteBy', () => {
    it('should delete the post matching the criteria', async () => {
      orm.delete.mockResolvedValue(makeDeleteResult(1));

      await expect(repo.deleteBy({ id: 1 })).resolves.toBeUndefined();
      expect(orm.delete).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException when no post matched', async () => {
      orm.delete.mockResolvedValue(makeDeleteResult(0));

      await expect(repo.deleteBy({ id: 999 })).rejects.toThrow(NotFoundException);
    });
  });

  // ── resetToRaw ────────────────────────────────────────────────────────────

  describe('resetToRaw', () => {
    it('should reset all unified fields and set status to RAW', async () => {
      const post = makeJobPost({
        googleDocId: 'doc-id',
        unifiedUrl: 'https://example.com',
        company: 'Corp',
        startDate: '2024-01-01',
        status: JobPostStatus.UNIFIED,
        title: 'Engineer',
      });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.resetToRaw(1);

      expect(post.googleDocId).toBeNull();
      expect(post.unifiedUrl).toBeNull();
      expect(post.company).toBeNull();
      expect(post.startDate).toBeNull();
      expect(post.title).toBeNull();
      expect(post.status).toBe(JobPostStatus.RAW);
      expect(orm.save).toHaveBeenCalledWith(post);
    });

    it('should throw NotFoundException when post is not found', async () => {
      orm.findOne.mockResolvedValue(null);

      await expect(repo.resetToRaw(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateEvaluationsFolder ───────────────────────────────────────────────

  describe('updateEvaluationsFolder', () => {
    it('should set evaluationsFolderId and save', async () => {
      const post = makeJobPost();
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateEvaluationsFolder(1, 'folder-abc');

      expect(post.evaluationsFolderId).toBe('folder-abc');
      expect(orm.save).toHaveBeenCalledWith(post);
    });

    it('should throw NotFoundException when post is not found', async () => {
      orm.findOne.mockResolvedValue(null);

      await expect(repo.updateEvaluationsFolder(999, 'folder-abc')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── updateRequiresCoding ──────────────────────────────────────────────────

  describe('updateRequiresCoding', () => {
    it('should set requiresCoding to true', async () => {
      const post = makeJobPost({ requiresCoding: null });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue({ ...post, requiresCoding: true });

      await repo.updateRequiresCoding(1, true);

      expect(post.requiresCoding).toBe(true);
      expect(orm.save).toHaveBeenCalledWith(post);
    });

    it('should set requiresCoding to false', async () => {
      const post = makeJobPost({ requiresCoding: null });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateRequiresCoding(1, false);

      expect(post.requiresCoding).toBe(false);
    });

    it('should set requiresCoding to null', async () => {
      const post = makeJobPost({ requiresCoding: true });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateRequiresCoding(1, null);

      expect(post.requiresCoding).toBeNull();
    });

    it('should throw NotFoundException when post is not found', async () => {
      orm.findOne.mockResolvedValue(null);

      await expect(repo.updateRequiresCoding(999, true)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateHasQcm ─────────────────────────────────────────────────────────

  describe('updateHasQcm', () => {
    it('should set hasQcm to true', async () => {
      const post = makeJobPost({ hasQcm: null });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateHasQcm(1, true);

      expect(post.hasQcm).toBe(true);
      expect(orm.save).toHaveBeenCalledWith(post);
    });

    it('should set hasQcm to false', async () => {
      const post = makeJobPost({ hasQcm: null });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateHasQcm(1, false);

      expect(post.hasQcm).toBe(false);
    });

    it('should set hasQcm to null', async () => {
      const post = makeJobPost({ hasQcm: true });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      await repo.updateHasQcm(1, null);

      expect(post.hasQcm).toBeNull();
    });

    it('should throw NotFoundException when post is not found', async () => {
      orm.findOne.mockResolvedValue(null);

      await expect(repo.updateHasQcm(999, true)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateTitle ───────────────────────────────────────────────────────────

  describe('updateTitle', () => {
    it('should update title and company then save', async () => {
      const post = makeJobPost({ title: 'Old Title', company: 'Old Corp' });
      orm.findOne.mockResolvedValue(post);
      orm.save.mockResolvedValue(post);

      const result = await repo.updateTitle(1, 'New Title', 'New Corp');

      expect(post.title).toBe('New Title');
      expect(post.company).toBe('New Corp');
      expect(orm.save).toHaveBeenCalledWith(post);
      expect(result.title).toBe('New Title');
    });

    it('should throw NotFoundException when post is not found', async () => {
      orm.findOne.mockResolvedValue(null);

      await expect(repo.updateTitle(999, 'Title', 'Corp')).rejects.toThrow(NotFoundException);
    });
  });
});