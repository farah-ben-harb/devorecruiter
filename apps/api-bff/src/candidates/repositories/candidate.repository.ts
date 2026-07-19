import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Candidate, ResumeStatus } from '../entities/candidate.entity';
import { ICandidateRepository } from '../interfaces/candidate-repository.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class CandidateRepository implements ICandidateRepository {
  private readonly logger = new Logger(CandidateRepository.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly repo: Repository<Candidate>,
  ) {}

  async create(data: Partial<Candidate>): Promise<Candidate> {
    this.logger.log(`Création candidat : ${data.brutDriveName}`);
    const candidate = this.repo.create(data);
    return this.repo.save(candidate);
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Candidate>> {
    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBy(
    criteria: FindOptionsWhere<Candidate>,
  ): Promise<Candidate | null> {
    return this.repo.findOne({ where: criteria });
  }

  async save(candidate: Candidate): Promise<Candidate> {
    return this.repo.save(candidate);
  }

  async updateStatus(id: string, status: ResumeStatus): Promise<Candidate> {
    const candidate = await this.findBy({ id });
    if (!candidate) throw new NotFoundException(`Candidat ${id} introuvable`);
    candidate.status = status;
    return this.repo.save(candidate);
  }

  async updateUnifie(
    id: string,
    data: {
      unifieDriveId: string;
      unifieDriveName: string;
      unifieDriveLink: string;
      status: ResumeStatus;
      email?: string | null;
      githubUsername?: string | null;
    },
  ): Promise<Candidate> {
    const candidate = await this.findBy({ id });
    if (!candidate) throw new NotFoundException(`Candidat ${id} introuvable`);
    candidate.unifieDriveId = data.unifieDriveId;
    candidate.unifieDriveName = data.unifieDriveName;
    candidate.unifieDriveLink = data.unifieDriveLink;
    candidate.status = data.status;
    if (data.email) candidate.email = data.email;
    if (data.githubUsername) candidate.githubUsername = data.githubUsername;
    return this.repo.save(candidate);
  }

  async deleteBy(criteria: FindOptionsWhere<Candidate>): Promise<void> {
    const candidate = await this.findBy(criteria);
    if (!candidate) throw new NotFoundException(`Candidat introuvable`);
    await this.repo.remove(candidate);
  }
}
