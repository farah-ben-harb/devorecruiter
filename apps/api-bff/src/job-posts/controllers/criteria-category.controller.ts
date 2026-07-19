import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Delete } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { CreateCriteriaCategoryDto, UpdateCriteriaCategoryDto } from "../dtos/criteria-category.dto";
import { CriteriaCategory } from "../entities/criteria-category.entity";
import { CriteriaCategoryService } from "../services/criteria-category.service";

// criteria-category.controller.ts
@ApiTags('Criteria Categories')
@ApiBearerAuth('access-token')
@Controller('criteria-categories')
export class CriteriaCategoryController {
  constructor(private readonly service: CriteriaCategoryService) {}

  @Get()
  findAll(): Promise<CriteriaCategory[]> {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateCriteriaCategoryDto): Promise<CriteriaCategory> {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCriteriaCategoryDto,
  ): Promise<CriteriaCategory> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.service.remove(id);
    return { message: `Catégorie ${id} supprimée` };
  }
}