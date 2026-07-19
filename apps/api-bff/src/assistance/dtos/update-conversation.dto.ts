import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConversationDto {
  @ApiPropertyOptional({ example: 'Discussion sur le recrutement', description: 'Nouveau titre de la conversation', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ example: false, description: 'Épingler ou désépingler la conversation' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}