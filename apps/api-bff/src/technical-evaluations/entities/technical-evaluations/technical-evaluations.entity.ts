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

export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('technical_evaluations')
export class TechnicalEvaluation {
  @ApiProperty({ example: 1, description: 'ID unique de l\'évaluation technique' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 1, description: 'ID de l\'offre d\'emploi associée' })
  @Column()
  jobPostId!: number;

  @ApiProperty({ example: 'Évaluation technique Backend NestJS', description: 'Titre de l\'évaluation' })
  @Column()
  title!: string;

  @ApiProperty({ example: EvaluationStatus.PENDING, enum: EvaluationStatus, description: 'Statut de l\'évaluation', default: EvaluationStatus.PENDING })
  @Column({ type: 'enum', enum: EvaluationStatus, default: EvaluationStatus.PENDING })
  status!: EvaluationStatus;

  @ApiProperty({ example: 'uuid-drive-file-123', nullable: true, description: 'ID du fichier Google Drive' })
  @Column({ type: 'text', nullable: true })
  driveFileId!: string | null;

  @ApiProperty({ example: 'https://drive.google.com/file/d/xxx', nullable: true, description: 'URL du fichier Google Drive' })
  @Column({ type: 'text', nullable: true })
  driveFileUrl!: string | null;

  @ApiProperty({ example: '1.0', description: 'Version de l\'évaluation', default: '1.0' })
  @Column({ default: '1.0' })
  version!: string;

  @ApiProperty({ example: '<h1>Évaluation technique</h1><p>...</p>', nullable: true, description: 'Contenu HTML de l\'évaluation' })
  @Column({ type: 'text', nullable: true })
  htmlContent!: string | null;

  @ApiProperty({ example: 'https://github.com/org/repo-evaluation', nullable: true, description: 'URL du dépôt Git de l\'évaluation' })
  @Column({ type: 'text', nullable: true })
  gitRepoUrl!: string | null;

  @ApiProperty({ example: 'https://drive.google.com/file/d/yyy', nullable: true, description: 'URL du PDF de l\'évaluation' })
  @Column({ type: 'text', nullable: true })
  pdfUrl!: string | null;

  @ApiProperty({ example: 1, nullable: true, description: 'Index de l\'évaluation' })
  @Column({ type: 'int', nullable: true })
  index!: number | null;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de dernière modification' })
  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobPostId' })
  jobPost!: JobPost;

    @ApiProperty({ example: 'Évaluation Backend Senior v1', description: 'Nom personnalisé de l\'évaluation' })
  @Column({ type: 'varchar', nullable: true })
  name!: string | null;


  ///quizz

  @ApiPropertyOptional({
    description: 'JSON stringifié des questions SANS bonnes réponses — envoyé au candidat',
    example: '[{"id":1,"question":"Qu\'est-ce que NestJS ?","type":"single_choice","options":["A","B","C","D"],"domain":"NestJS","difficulty":"easy"}]',
  })
  @Column({ type: 'text', nullable: true })
  quizContent!: string | null;

  @ApiPropertyOptional({
    description: 'JSON stringifié du corrigé complet AVEC bonnes réponses + explications — stocké privé en DB',
  })
  @Column({ type: 'text', nullable: true })
  quizAnswerKey!: string | null;

}