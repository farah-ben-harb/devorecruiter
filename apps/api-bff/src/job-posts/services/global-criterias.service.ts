import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalCriteria } from '../entities/global-criterias.entity';
import { CreateGlobalCriteriaDto, UpdateGlobalCriteriaDto } from '../dtos/global-criterias.dto';

@Injectable()
export class GlobalCriteriaService {
  constructor(
    @InjectRepository(GlobalCriteria)
    private readonly repo: Repository<GlobalCriteria>,
  ) {}

  findAll(): Promise<GlobalCriteria[]> {
    return this.repo.find({ order: { order: 'ASC', createdAt: 'ASC' } });
  }

  async findOne(id: number): Promise<GlobalCriteria> {
    const criteria = await this.repo.findOne({ where: { id } });
    if (!criteria) throw new NotFoundException(`Critère ${id} introuvable`);
    return criteria;
  }

  async create(dto: CreateGlobalCriteriaDto): Promise<GlobalCriteria> {
    const entity = this.repo.create({
      label: dto.label,
      description: dto.description ?? null,
      category: dto.category ?? null,
      order: dto.order ?? 0,
    });
    return this.repo.save(entity);
  }

  async update(id: number, dto: UpdateGlobalCriteriaDto): Promise<GlobalCriteria> {
    const criteria = await this.findOne(id);
    if (dto.label !== undefined) criteria.label = dto.label;
    if (dto.description !== undefined) criteria.description = dto.description ?? null;
    if (dto.category !== undefined) criteria.category = dto.category ?? null;
    if (dto.order !== undefined) criteria.order = dto.order;
    return this.repo.save(criteria);
  }

  async remove(id: number): Promise<void> {
    const criteria = await this.findOne(id);
    await this.repo.remove(criteria);
  }
}