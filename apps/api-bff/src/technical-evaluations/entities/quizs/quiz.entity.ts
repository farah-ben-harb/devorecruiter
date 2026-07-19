import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobPost } from '../../../job-posts/entities/job-post.entity';

export enum QuizStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('quizzes')
export class Quiz {
  @ApiProperty({ example: 1, description: 'ID unique du quiz' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 1, description: "ID de l'offre d'emploi associée" })
  @Column()
  jobPostId!: number;

  @ApiProperty({ example: 'Quiz technique Backend NestJS', description: 'Titre du quiz' })
  @Column()
  title!: string;

  @ApiProperty({
    example: QuizStatus.PENDING,
    enum: QuizStatus,
    description: 'Statut du quiz',
    default: QuizStatus.PENDING,
  })
  @Column({ type: 'enum', enum: QuizStatus, default: QuizStatus.PENDING })
  status!: QuizStatus;

  @ApiProperty({ example: '1.0', description: 'Version du quiz', default: '1.0' })
  @Column({ default: '1.0' })
  version!: string;

  @ApiProperty({ example: 1, nullable: true, description: 'Index du quiz' })
  @Column({ type: 'int', nullable: true })
  index!: number | null;

  @ApiPropertyOptional({
    description:
      "JSON stringifié des questions SANS bonnes réponses — envoyé au candidat",
    example:
      '[{"id":1,"question":"Qu\'est-ce que NestJS ?","type":"single_choice","options":["A","B","C","D"],"domain":"NestJS","difficulty":"easy"}]',
  })
  @Column({ type: 'text', nullable: true })
  quizContent!: string | null;

  @ApiPropertyOptional({
    description:
      'JSON stringifié du corrigé complet AVEC bonnes réponses + explications — stocké privé en DB',
  })
  @Column({ type: 'text', nullable: true })
  quizAnswerKey!: string | null;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de dernière modification' })
  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobPostId' })
  jobPost!: JobPost;
}