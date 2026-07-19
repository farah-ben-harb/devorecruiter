import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @ApiProperty({
    example: 1,
    description: 'ID de la question à laquelle le candidat répond',
  })
  @IsInt()
  @Type(() => Number)
  questionId!: number;

  @ApiProperty({
    example: 'Option A',
    description: 'Texte exact de la réponse choisie par le candidat (doit correspondre à l\'une des options)',
  })
  @IsString()
  @IsNotEmpty()
  answer!: string;
}

export class SubmitQuizDto {
  @ApiProperty({
    type: [QuizAnswerDto],
    description: 'Liste des réponses soumises par le candidat (une entrée par question)',
    example: [
      { questionId: 1, answer: 'Option A' },
      { questionId: 2, answer: 'Option C' },
      { questionId: 3, answer: 'Option B' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];

  @ApiPropertyOptional({
    example: 1245,
    description: 'Durée totale de complétion du quiz en secondes (optionnel, mesuré côté frontend)',
    minimum: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  durationSeconds?: number;
}