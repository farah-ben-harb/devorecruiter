import { IsString, IsOptional, IsNotEmpty, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateGlobalCriteriaDto {
  @ApiProperty({ example: 'Maîtrise de TypeScript' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiPropertyOptional({ example: 'Compétence technique indispensable' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'technique' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

export class UpdateGlobalCriteriaDto extends PartialType(CreateGlobalCriteriaDto) {}