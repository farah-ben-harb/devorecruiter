import { IsUUID, IsString, IsIn, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'uuid-conversation-123', description: 'ID de la conversation associée' })
  @IsUUID()
  conversationId!: string;

  @ApiProperty({ example: 'user', enum: ['user', 'assistant'], description: 'Rôle de l\'auteur du message' })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'Quelles sont les offres disponibles ?', description: 'Contenu du message', minLength: 1 })
  @IsString()
  @MinLength(1)
  content!: string;
}