import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GlobalCriteriaService } from '../services/global-criterias.service';
import { CreateGlobalCriteriaDto, UpdateGlobalCriteriaDto } from '../dtos/global-criterias.dto';
import { GlobalCriteria } from '../entities/global-criterias.entity';

@ApiTags('Global Criteria')
@ApiBearerAuth('access-token')
@Controller('global-criteria')
export class GlobalCriteriaController {
  constructor(private readonly service: GlobalCriteriaService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les critères globaux' })
  @ApiResponse({ status: 200, type: [GlobalCriteria] })
  findAll(): Promise<GlobalCriteria[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un critère global par ID' })
  @ApiParam({ name: 'id', description: 'ID du critère' })
  @ApiResponse({ status: 200, type: GlobalCriteria })
  @ApiResponse({ status: 404, description: 'Critère introuvable' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<GlobalCriteria> {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un critère global' })
  @ApiResponse({ status: 201, type: GlobalCriteria })
  create(@Body() dto: CreateGlobalCriteriaDto): Promise<GlobalCriteria> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un critère global' })
  @ApiParam({ name: 'id', description: 'ID du critère' })
  @ApiResponse({ status: 200, type: GlobalCriteria })
  @ApiResponse({ status: 404, description: 'Critère introuvable' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGlobalCriteriaDto,
  ): Promise<GlobalCriteria> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un critère global' })
  @ApiParam({ name: 'id', description: 'ID du critère' })
  @ApiResponse({ status: 200, description: 'Critère supprimé.' })
  @ApiResponse({ status: 404, description: 'Critère introuvable' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.service.remove(id);
    return { message: `Critère ${id} supprimé avec succès` };
  }
}