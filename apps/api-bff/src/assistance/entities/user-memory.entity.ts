import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Entity('user_memory')
export class UserMemoryEntity {
  @ApiProperty({ example: 'uuid-memory-123', description: 'ID unique de la mémoire utilisateur' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 42, description: 'ID de l\'utilisateur associé' })
  @Column({ name: 'user_id' })
  userId!: number;

  @ApiProperty({ example: 'L\'utilisateur préfère les réponses concises.', nullable: true, description: 'Résumé de la mémoire contextuelle de l\'utilisateur' })
  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de dernière mise à jour' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}