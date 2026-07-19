import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SourceDto {
  @ApiProperty({ example: 'Règlement intérieur TechSolutions', description: 'Titre du document source' })
  title!: string;

  @ApiProperty({ example: 'reglement_interne.pdf', description: 'Nom du fichier source' })
  source!: string;

  @ApiProperty({ example: 3, description: 'Numéro de page dans le document source' })
  page!: string | number;
}

export class RhResponseDto {
  @ApiProperty({ example: 'Les congés annuels sont de 30 jours ouvrables.', description: 'Réponse de l\'assistant RH' })
  response!: string;

  @ApiProperty({ type: () => [SourceDto], description: 'Sources utilisées pour générer la réponse' })
  sources!: SourceDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date et heure de la réponse' })
  timestamp!: Date;

  @ApiProperty({ example: 1, description: 'ID de la conversation' })
  conversationId!: number;
}

export class MessageDto {
  @ApiProperty({ example: 1, description: 'ID du message' })
  id!: number;

  @ApiProperty({ example: 'user', enum: ['user', 'assistant'], description: 'Rôle de l\'auteur du message' })
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'Quels sont mes droits aux congés ?', description: 'Contenu du message' })
  content!: string;

  @ApiPropertyOptional({ type: () => [SourceDto], description: 'Sources associées au message (uniquement pour les messages assistant)' })
  sources?: SourceDto[];

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de création du message' })
  createdAt!: Date;
}

export class ConversationHistoryDto {
  @ApiProperty({ example: 1, description: 'ID de la conversation' })
  conversationId!: number;

  @ApiProperty({ example: 42, description: 'ID de l\'utilisateur' })
  userId!: number;

  @ApiProperty({ type: () => [MessageDto], description: 'Liste des messages de la conversation' })
  messages!: MessageDto[];

  @ApiProperty({ example: 10, description: 'Nombre total de messages' })
  total!: number;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création de la conversation' })
  createdAt!: Date;
}