import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendInvitationDto {
  @ApiPropertyOptional({ type: [Number], example: [1, 2, 3], description: 'IDs des CVs scorés à inviter' })
  @IsArray()
  @IsOptional()
  scoringResumeIds?: number[];

  @ApiPropertyOptional({ type: [String], example: ['uuid-cv-1', 'uuid-cv-2'], description: 'IDs des CVs non scorés à inviter' })
  @IsArray()
  @IsOptional()
  unscoredResumeIds?: string[];

  @ApiProperty({ example: 1, description: 'ID de l\'évaluation associée' })
  @IsInt()
  @Type(() => Number)
  evaluationId!: number;

  @ApiProperty({ example: 1, description: 'ID de l\'offre d\'emploi' })
  @IsInt()
  @Type(() => Number)
  jobPostId!: number;

  @ApiProperty({ example: '2024-02-15', description: 'Date limite pour compléter l\'évaluation (format YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  dueDate!: string;
}