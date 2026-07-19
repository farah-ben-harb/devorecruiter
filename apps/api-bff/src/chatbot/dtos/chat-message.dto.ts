import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ example: 'Combien j\'ai d\'utilisateurs ?', description: 'Message envoyé au chatbot' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ example: 'abc-123', description: 'ID unique de session de conversation' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}

export class ChatResponseDto {
  @ApiProperty({ example: 'Vous avez 42 utilisateurs actifs.', description: 'Réponse du chatbot' })
  response!: string;

  @ApiProperty({ example: 'abc-123' })
  sessionId!: string;

  @ApiProperty({ example: '2025-01-01T10:00:00.000Z' })
  timestamp!: Date;
}