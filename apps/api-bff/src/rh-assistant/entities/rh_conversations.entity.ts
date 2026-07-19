import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { RhMessageEntity } from './rh_messages.entity';

@Entity('rh_conversations')
export class RhConversationEntity {
  @ApiProperty({ example: 1, description: 'ID unique de la conversation RH' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'Discussion sur les congés annuels', description: 'Titre de la conversation', default: 'Nouvelle conversation' })
  @Column({ default: 'Nouvelle conversation' })
  title!: string;

  @ApiProperty({ example: 42, description: 'ID de l\'utilisateur propriétaire' })
  @Column({ name: 'user_id' })
  userId!: number;

  @ApiProperty({ example: true, description: 'Indique si la conversation est active', default: true })
  @Column({ default: true })
  isActive!: boolean;

  @ApiProperty({ example: false, description: 'Indique si la conversation est épinglée', default: false })
  @Column({ default: false })
  isPinned!: boolean;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de dernière modification' })
  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => RhMessageEntity, (message) => message.conversation, {
    cascade: true,
  })
  messages!: RhMessageEntity[];
}