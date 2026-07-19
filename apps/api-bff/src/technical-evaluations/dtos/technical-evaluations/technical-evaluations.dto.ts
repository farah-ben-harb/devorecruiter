import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationStatus } from '../../entities/technical-evaluations/technical-evaluations.entity';

export class CreateTechnicalEvaluationDto {
  @ApiProperty({ example: 1, description: 'ID de l\'offre d\'emploi' })
  @IsInt()
  @IsNotEmpty()
  jobPostId!: number;

  @ApiPropertyOptional({ example: EvaluationStatus.PENDING, enum: EvaluationStatus, description: 'Statut de l\'évaluation' })
  @IsEnum(EvaluationStatus)
  @IsOptional()
  status?: EvaluationStatus;

  @ApiPropertyOptional({ example: 85, description: 'Score entre 0 et 100', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({ example: 'Candidat très motivé avec bonne base technique.', description: 'Notes sur l\'évaluation' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'coding', enum: ['coding', 'quiz'], description: 'Mode de génération' })
  @IsOptional()
  @IsEnum(['coding', 'quiz'])
  mode?: 'coding' | 'quiz';
}

export class UpdateTechnicalEvaluationDto {
  @ApiProperty({ example: 'Évaluation Backend NestJS', description: 'Titre de l\'évaluation' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: EvaluationStatus.PENDING, enum: EvaluationStatus, description: 'Statut de l\'évaluation' })
  @IsEnum(EvaluationStatus)
  @IsOptional()
  status?: EvaluationStatus;

  @ApiPropertyOptional({ example: 78, description: 'Score entre 0 et 100', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Nom du candidat' })
  @IsString()
  @IsOptional()
  candidateName?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com', description: 'Email du candidat' })
  @IsString()
  @IsOptional()
  candidateEmail?: string;

  @ApiPropertyOptional({ example: 'Bonne communication, manque d\'expérience DevOps.', description: 'Notes sur l\'évaluation' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RegenerateTechnicalEvaluationDto {
  @ApiProperty({ example: 1, description: 'ID de l\'offre d\'emploi' })
  @IsInt()
  @IsNotEmpty()
  jobPostId!: number;

  @ApiProperty({ example: 1, description: 'ID de l\'évaluation à regénérer' })
  @IsInt()
  @IsNotEmpty()
  evaluationId!: number;

  @ApiProperty({ example: 'Ajouter une section sur les compétences cloud.', description: 'Prompt pour la regénération' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({ example: 'minor', enum: ['minor', 'major'], description: 'Type de modification à apporter' })
  @IsOptional()
  @IsEnum(['minor', 'major'])
  changeType?: 'minor' | 'major';
}

export class ApproveEvaluationDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'rejected'], description: 'Décision d\'approbation de l\'évaluation' })
  @IsEnum(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Le candidat répond bien aux critères du poste.', description: 'Commentaire sur la décision' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateEvaluationContentDto {
  @ApiPropertyOptional({
    example: '<h1>Évaluation technique</h1>',
    description: 'Contenu HTML (évaluation coding kata)',
  })
  @IsString()
  @IsOptional()
  htmlContent?: string;

  @ApiPropertyOptional({
    description: 'JSON public du quiz sans réponses — envoyé au candidat',
  })
  @IsString()
  @IsOptional()
  quizContent?: string;

  @ApiPropertyOptional({
    description: 'JSON corrigé du quiz avec réponses — stocké privé en DB',
  })
  @IsString()
  @IsOptional()
  quizAnswerKey?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'true si l\'évaluation est un quiz',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isQuiz?: boolean;

  @ApiPropertyOptional({
    example: 'minor',
    enum: ['minor', 'major'],
    description: 'Type de modification apportée',
  })
  @IsOptional()
  @IsEnum(['minor', 'major'])
  changeType?: 'minor' | 'major';
}