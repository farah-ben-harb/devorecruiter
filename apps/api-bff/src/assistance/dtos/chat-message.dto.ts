import { IsString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageItemDto {
  @ApiProperty({ example: 'user', enum: ['user', 'assistant'], description: 'Rôle de l\'auteur du message' })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'Bonjour, quelles sont les offres disponibles ?', description: 'Contenu du message' })
  @IsString()
  content!: string;
}

export class SendChatDto {
  @ApiProperty({ example: 'uuid-conversation-123', description: 'ID de la conversation' })
  @IsString()
  conversationId!: string;

  @ApiProperty({ type: () => [ChatMessageItemDto], description: 'Historique des messages de la conversation' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageItemDto)
  messages!: ChatMessageItemDto[];
}