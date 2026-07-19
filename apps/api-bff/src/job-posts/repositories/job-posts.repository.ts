import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, Repository, Not } from 'typeorm';
import { JobPost, JobPostActivityStatus, JobPostStatus } from '../entities/job-post.entity';
import { IJobPostRepository } from '../interfaces/job-post.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class JobPostRepository implements IJobPostRepository {
  constructor(
    @InjectRepository(JobPost)
    private readonly jobPost: Repository<JobPost>,
  ) { }

  async create(data: Partial<JobPost>): Promise<JobPost> {
    const post = this.jobPost.create(data);
    return this.jobPost.save(post);
  }

  async findAll(
  page: number,
  limit: number,
  search?: string,
  status?: string,
  onlyWithEvaluations = false,
  jobStatus?: string, // ← NOUVEAU
): Promise<PaginatedResult<JobPost>> {
  const skip = (page - 1) * limit;
  const qb = this.jobPost.createQueryBuilder('jp');

  if (status && status !== 'all') {
    if (status === 'raw') {
      qb.andWhere('jp.status != :unified', {
        unified: JobPostStatus.UNIFIED,
      });
    } else {
      qb.andWhere('jp.status = :status', { status });
    }
  }

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    qb.andWhere(
      '(jp.company ILIKE :term OR jp.name ILIKE :term OR jp.title ILIKE :term)',
      { term },
    );
  }

  // ── NOUVEAU : filtre par statut métier ──────────────────────────────
  if (jobStatus && jobStatus !== 'all') {
    if (jobStatus === 'none') {
      qb.andWhere('jp.jobStatus IS NULL');
    } else {
      qb.andWhere('jp.jobStatus = :jobStatus', { jobStatus });
    }
  }

  // ── Récupérer les jobPostIds ayant au moins une évaluation ──
  const evalIds = await this.jobPost.manager
    .createQueryBuilder()
    .select('DISTINCT te.jobPostId', 'jobPostId')
    .from('technical_evaluations', 'te')
    .getRawMany<{ jobPostId: number }>();

  const jobPostIdsWithEval = new Set(evalIds.map((e) => e.jobPostId));

  // ── Filtre "avec évaluation" ──
  if (onlyWithEvaluations && jobPostIdsWithEval.size > 0) {
    qb.andWhere('jp.id IN (:...ids)', { ids: [...jobPostIdsWithEval] });
  }

  qb.orderBy('jp.createdAt', 'DESC').skip(skip).take(limit);

  const [data, total] = await qb.getManyAndCount();

  const [totalAll, totalUnified, totalRaw] = await Promise.all([
    this.jobPost.count(),
    this.jobPost.count({ where: { status: JobPostStatus.UNIFIED } }),
    this.jobPost.count({ where: { status: Not(JobPostStatus.UNIFIED) } }),
  ]);

  const enrichedData = data.map((jp) => ({
    ...jp,
    hasEvaluation: jobPostIdsWithEval.has(jp.id),
  }));

  return {
    data: enrichedData,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalAll,
      totalUnified,
      totalRaw,
      totalWithEvaluation: jobPostIdsWithEval.size,
    },
  };
}

  async findByGoogleDriveFileId(
    googleDriveFileId: string,
  ): Promise<JobPost | null> {
    return this.jobPost.findOne({ where: { googleDriveFileId } });
  }

  async findBy(criteria: FindOptionsWhere<JobPost>): Promise<JobPost | null> {
    return this.jobPost.findOne({ where: criteria });
  }

  async save(entity: JobPost): Promise<JobPost> {
    return this.jobPost.save(entity);
  }

  async updateStatus(id: number, status: JobPostStatus): Promise<JobPost> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    post.status = status;
    return this.jobPost.save(post);
  }

  async updateUnifie(
    id: number,
    data: {
      googleDocId: string;
      status: JobPostStatus;
      unifiedUrl?: string;
      company?: string;
      startDate?: string;
      title?: string;
      requiresCoding?: boolean | null;
      hasQcm?: boolean | null;
      unifiedDocxId?: string;
    },
  ): Promise<JobPost> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);

    post.googleDocId = data.googleDocId;
    post.status = data.status;
    if (data.unifiedUrl) post.unifiedUrl = data.unifiedUrl;
    if (data.company) post.company = data.company;
    if (data.startDate) post.startDate = data.startDate;
    if (data.title) post.title = data.title;
    if (data.requiresCoding !== undefined) post.requiresCoding = data.requiresCoding ?? null;
    if (data.hasQcm !== undefined) post.hasQcm = data.hasQcm ?? null; // ligne manquante
    if (data.unifiedDocxId !== undefined) post.unifiedDocxId = data.unifiedDocxId ?? null;
    return this.jobPost.save(post);
  }

  async deleteBy(criteria: FindOptionsWhere<JobPost>): Promise<void> {
    const result = await this.jobPost.delete(criteria);
    if (result.affected === 0) throw new NotFoundException('Post not found');
  }

  async resetToRaw(id: number): Promise<JobPost> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);

    post.googleDocId = null;
    post.unifiedUrl = null;
    post.company = null;
    post.startDate = null;
    post.status = JobPostStatus.RAW;
    post.title = null;

    return this.jobPost.save(post);
  }

  async updateEvaluationsFolder(id: number, folderId: string): Promise<void> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    post.evaluationsFolderId = folderId;
    await this.jobPost.save(post);
  }

  async updateRequiresCoding(id: number, requiresCoding: boolean | null): Promise<JobPost> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    post.requiresCoding = requiresCoding;
    return this.jobPost.save(post);
  }

  async updateHasQcm(id: number, hasQcm: boolean | null): Promise<JobPost> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    post.hasQcm = hasQcm;
    return this.jobPost.save(post);
  }

  async updateTitle(id: number, title: string, company: string): Promise<JobPost> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    post.title = title;
    post.company = company;
    return this.jobPost.save(post);
  }

    async updateJobStatus(
    id: number,
    jobStatus: import('../entities/job-post.entity').JobPostActivityStatus | null,
    linkedCandidateIds?: string[],
  ): Promise<import('../entities/job-post.entity').JobPost> {
    const post = await this.findBy({ id });
    if (!post) throw new NotFoundException(`Post ${id} not found`);
    post.jobStatus = jobStatus;
    if (linkedCandidateIds !== undefined) {
      post.linkedCandidateIds = linkedCandidateIds;
    }
    // Si on passe à un statut sans embauche, vider les candidats liés
    if (
      jobStatus === JobPostActivityStatus.CLOSED_WITHOUT_HIRE ||
      jobStatus === JobPostActivityStatus.OPEN
    ) {
      post.linkedCandidateIds = [];
    }
    return this.jobPost.save(post);
  }
}
