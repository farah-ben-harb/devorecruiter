import {
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScoredJobPost } from '../entities/job-post-evaluation.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScoreDimensionDto {
  @ApiProperty({ example: 85, description: 'Score entre 0 et 100', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiProperty({ example: 'Maîtrise de NestJS et TypeScript', description: 'Détail du score' })
  @IsString()
  detail!: string;
}

export class ScoreDetailDto {
  // ❌ double @ApiProperty() corrigé
  @ApiProperty({ example: 85, description: 'Score global entre 0 et 100', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  scoreGlobal!: number;

  // ❌ example string corrigé → type: () => Classe
  @ApiProperty({ type: () => ScoreDimensionDto, description: 'Compétences techniques' })
  @ValidateNested()
  @Type(() => ScoreDimensionDto)
  technicalSkills!: ScoreDimensionDto;

  @ApiProperty({ type: () => ScoreDimensionDto, description: 'Expérience professionnelle' })
  @ValidateNested()
  @Type(() => ScoreDimensionDto)
  experience!: ScoreDimensionDto;

  @ApiProperty({ type: () => ScoreDimensionDto, description: 'Formation académique' })
  @ValidateNested()
  @Type(() => ScoreDimensionDto)
  education!: ScoreDimensionDto;

  @ApiProperty({ type: () => ScoreDimensionDto, description: 'Soft skills' })
  @ValidateNested()
  @Type(() => ScoreDimensionDto)
  softSkills!: ScoreDimensionDto;

  @ApiProperty({ type: () => ScoreDimensionDto, description: 'Langues' })
  @ValidateNested()
  @Type(() => ScoreDimensionDto)
  languages!: ScoreDimensionDto;

  // ❌ example string corrigé → type: [String] avec exemple réaliste
  @ApiProperty({ type: [String], example: ['Bonne maîtrise de Node.js', 'Expérience en microservices'], description: 'Points forts du candidat' })
  @IsArray()
  @IsString({ each: true })
  strengths!: string[];

  @ApiProperty({ type: [String], example: ['Manque d\'expérience en DevOps'], description: 'Points faibles du candidat' })
  @IsArray()
  @IsString({ each: true })
  weaknesses!: string[];

  @ApiProperty({ example: 'Candidat solide avec bonne base technique.', description: 'Résumé de l\'évaluation' })
  @IsString()
  resume!: string;

  @ApiProperty({ example: 'ACCEPTED', enum: ['ACCEPTED', 'REJECTED'], description: 'Recommandation finale' })
  @IsIn(['ACCEPTED', 'REJECTED'])
  recommendation!: 'ACCEPTED' | 'REJECTED';
}

export class ScoredJobPostDto {
  @ApiProperty({ example: 'uuid-fichier-123', description: 'ID du fichier CV' })
  @IsString()
  fileId!: string;

  @ApiProperty({ example: 'cv_john_doe.pdf', description: 'Nom du fichier CV' })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: 'Développeur Backend NestJS', description: 'Intitulé du poste' })
  @IsString()
  jobTitle!: string;

  // ❌ example string corrigé → nombre réaliste
  @ApiProperty({ example: 90, description: 'Score global entre 0 et 100', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  scoreGlobal!: number;

  @ApiProperty({ example: 'MATCH', enum: ['MATCH', 'NO_MATCH'], description: 'Statut du matching' })
  @IsIn(['MATCH', 'NO_MATCH'])
  status!: 'MATCH' | 'NO_MATCH';

  // ❌ example string corrigé → type: () => Classe
  @ApiProperty({ type: () => ScoreDetailDto, description: 'Détail du scoring' })
  @ValidateNested()
  @Type(() => ScoreDetailDto)
  detail!: ScoreDetailDto;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de création' })
  @IsDateString()
  createdAt!: string;
}

export class N8nScoringResponseDto {
  @ApiProperty({ example: 3, description: 'Nombre total de matchs' })
  @IsNumber()
  totalMatch!: number;

  @ApiProperty({ type: () => [ScoredJobPostDto], description: 'Liste des résultats de scoring' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoredJobPostDto)
  matches!: ScoredJobPostDto[];

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z', description: 'Date de génération du scoring' })
  @IsString()
  @IsOptional()
  generatedAt?: string;
}

export class TriggerScoringResponseDto {
  @ApiProperty({ example: 'Scoring lancé avec succès', description: 'Message de confirmation' })
  message!: string;

  @ApiProperty({ example: 3, description: 'Nombre total de matchs' })
  totalMatch!: number;

  @ApiProperty({ type: 'array', description: 'Liste des matchs' })
  matches!: ScoredJobPost[];

  @ApiProperty({ example: 'uuid-scoring-456', description: 'ID du scoring' })
  scoringId!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de complétion' })
  completedAt!: Date;
}

export class ScoringResultResponseDto {
  @ApiProperty({ example: 'uuid-123', description: 'ID du résultat de scoring' })
  id!: string;

  @ApiProperty({ example: 'uuid-candidat-456', description: 'ID du candidat' })
  candidateId!: string;

  @ApiProperty({ example: 'COMPLETED', enum: ['PENDING', 'COMPLETED', 'FAILED'], description: 'Statut du scoring' })
  status!: string;

  @ApiProperty({ example: 3, description: 'Nombre total de matchs' })
  totalMatch!: number;

  @ApiProperty({ type: 'array', description: 'Liste des matchs' })
  matches!: ScoredJobPost[] | null;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', nullable: true, description: 'Date de complétion' })
  completedAt!: Date | null;
}