import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { MessageEntity } from './message.entity';

@Entity('conversations')
export class ConversationEntity {
  @ApiProperty({ example: 'uuid-123', description: 'ID unique de la conversation' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'Discussion sur le recrutement', description: 'Titre de la conversation' })
  @Column()
  title!: string;

  @ApiProperty({ example: 42, description: 'ID de l\'utilisateur propriétaire' })
  @Column({ name: 'user_id' })
  userId!: number;

  @ApiProperty({ example: false, description: 'Indique si la conversation est épinglée' })
  @Column({ name: 'is_pinned', default: false })
  isPinned!: boolean;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de dernière modification' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => MessageEntity, (msg) => msg.conversation, {
    cascade: true,
    eager: false,
  })
  messages!: MessageEntity[];
}