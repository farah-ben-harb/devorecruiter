import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCriteriaCategoryDto, UpdateCriteriaCategoryDto } from "../dtos/criteria-category.dto";
import { CriteriaCategory } from "../entities/criteria-category.entity";

// criteria-category.service.ts
@Injectable()
export class CriteriaCategoryService {
  constructor(
    @InjectRepository(CriteriaCategory)
    private readonly repo: Repository<CriteriaCategory>,
  ) {}

  findAll(): Promise<CriteriaCategory[]> {
    return this.repo.find({ order: { order: 'ASC', label: 'ASC' } });
  }

  async findOne(id: number): Promise<CriteriaCategory> {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Catégorie ${id} introuvable`);
    return cat;
  }

  create(dto: CreateCriteriaCategoryDto): Promise<CriteriaCategory> {
    return this.repo.save(this.repo.create({
      value: dto.value,
      label: dto.label,
      order: dto.order ?? 0,
    }));
  }

  async update(id: number, dto: UpdateCriteriaCategoryDto): Promise<CriteriaCategory> {
    const cat = await this.findOne(id);
    if (dto.value !== undefined) cat.value = dto.value;
    if (dto.label !== undefined) cat.label = dto.label;
    if (dto.order !== undefined) cat.order = dto.order;
    return this.repo.save(cat);
  }

  async remove(id: number): Promise<void> {
    const cat = await this.findOne(id);
    await this.repo.remove(cat);
  }
}