import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginateQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Numéro de page', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Nombre de résultats par page', minimum: 1, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({ example: 'développeur', description: 'Mot clé de recherche' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', description: 'Filtrer par statut' })
  @IsOptional()
  @IsString()
  status?: string;
}