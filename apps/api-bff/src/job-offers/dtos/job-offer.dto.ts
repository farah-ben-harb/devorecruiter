import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── POST /job-offers/generate ─────────────────────────────────
export class GenerateJobOfferDto {
  @ApiProperty({
    description: 'Prompt libre décrivant le poste à générer',
    example:
      'Génère une offre pour Développeur Python, secteur Fintech, CDI, Remote',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  promptLibre!: string;
}

// ── PATCH /job-offers/:id ─────────────────────────────────────
export class UpdateJobOfferDto {
  @ApiPropertyOptional({ example: 'Développeur Python — Fintech | Remote' })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({
    example: 'Rejoignez une fintech qui redéfinit les standards.',
  })
  @IsOptional()
  @IsString()
  accroche?: string;

  @ApiPropertyOptional({ description: 'Texte formaté LinkedIn complet' })
  @IsOptional()
  @IsString()
  formatLinkedin?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  missions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profil?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avantages?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  motsCles?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

// ── Réponse API ───────────────────────────────────────────────
export class JobOfferResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() promptLibre!: string;
  @ApiProperty() titre!: string;
  @ApiProperty() accroche!: string;
  @ApiProperty() formatLinkedin!: string;
  @ApiProperty({ type: [String] }) missions!: string[];
  @ApiProperty({ type: [String] }) profil!: string[];
  @ApiProperty({ type: [String] }) avantages!: string[];
  @ApiProperty({ type: [String] }) hashtags!: string[];
  @ApiProperty({ type: [String] }) motsCles!: string[];
  @ApiProperty() isPublished!: boolean;
  @ApiProperty() userId!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class GenerateFromJobPostDto {
  @ApiProperty({
    description: 'IDs des fiches de poste unifiées à partir desquelles générer les offres',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  jobPostIds!: number[];
}