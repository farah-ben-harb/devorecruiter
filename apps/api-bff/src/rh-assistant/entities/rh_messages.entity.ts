import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RhConversationEntity } from './rh_conversations.entity';

@Entity('rh_messages')
export class RhMessageEntity {
  @ApiProperty({ example: 1, description: 'ID unique du message' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 1, description: 'ID de la conversation associée' })
  @Column({ name: 'conversation_id' })
  conversationId!: number;

  @ApiProperty({ example: 'user', enum: ['user', 'assistant'], description: 'Rôle de l\'auteur du message' })
  @Column({ type: 'enum', enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'Quels sont mes droits aux congés ?', description: 'Contenu du message' })
  @Column({ type: 'text' })
  content!: string;

  // json nullable avec tableau d'objets → example détaillé + nullable: true
  @ApiProperty({
    nullable: true,
    description: 'Sources utilisées pour générer la réponse',
    example: [
      { title: 'Règlement intérieur TechSolutions', source: 'reglement_interne.pdf', page: 3 },
    ],
  })
  @Column({ type: 'json', nullable: true })
  sources!:
    | {
        title: string;
        source: string;
        page: string | number;
      }[]
    | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de création du message' })
  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => RhConversationEntity, (conv) => conv.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: RhConversationEntity;
}