import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ConversationEntity } from './conversation.entity';

@Entity('messages')
export class MessageEntity {
  @ApiProperty({ example: 'uuid-message-123', description: 'ID unique du message' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'user', enum: ['user', 'assistant'], description: 'Rôle de l\'auteur du message' })
  @Column({ type: 'enum', enum: ['user', 'assistant'] })
  role!: 'user' | 'assistant';

  @ApiProperty({ example: 'Quels sont mes droits aux congés ?', description: 'Contenu du message' })
  @Column('text')
  content!: string;

  @ApiProperty({ example: 'uuid-conversation-456', description: 'ID de la conversation associée' })
  @Column({ name: 'conversation_id' })
  conversationId!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de création du message' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => ConversationEntity, (conv) => conv.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: ConversationEntity;
}