import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuestionDto {
  @ApiProperty({ example: 'Quelles sont les compétences requises pour ce poste ?', description: 'Question à poser à l\'assistant RH', minLength: 3 })
  @IsString()
  @IsNotEmpty({ message: 'La question ne peut pas être vide.' })
  @MinLength(3, { message: 'La question doit contenir au moins 3 caractères.' })
  question!: string;
}