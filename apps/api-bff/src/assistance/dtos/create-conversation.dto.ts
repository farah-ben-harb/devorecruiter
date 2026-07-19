import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiPropertyOptional({ example: 'Discussion sur le recrutement', description: 'Titre de la conversation', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;
}