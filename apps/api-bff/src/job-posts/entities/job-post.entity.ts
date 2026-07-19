import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum JobPostStatus {
  RAW = 'raw',
  PROCESSING = 'processing',
  UNIFIED = 'unified',
  ERROR = 'error',
}

/** Statut métier de la fiche de poste */
export enum JobPostActivityStatus {
  OPEN              = 'open',
  CLOSED_WITH_HIRE  = 'closed_with_hire',
  CLOSED_WITHOUT_HIRE = 'closed_without_hire',
}

@Entity('job_posts')
export class JobPost {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'uuid-google-drive-123', nullable: true })
  @Index()
  @Column({ nullable: true })
  googleDriveFileId!: string;

  @ApiProperty({ example: 'Développeur Backend NestJS' })
  @Column()
  name!: string;

  @ApiProperty({ example: 'PDF', nullable: true })
  @Column({ nullable: true })
  type!: string;

  @ApiProperty({ example: 'https://drive.google.com/file/d/xxx', nullable: true })
  @Column({ nullable: true })
  url!: string;

  @ApiProperty({ example: 'uuid-google-doc-456', nullable: true })
  @Column({ type: 'text', nullable: true })
  googleDocId!: string | null;

  @ApiProperty({ example: 'https://docs.google.com/document/d/xxx', nullable: true })
  @Column({ type: 'text', nullable: true })
  unifiedUrl!: string | null;

  @ApiProperty({ example: 'TechSolutions', nullable: true })
  @Column({ type: 'text', nullable: true })
  company!: string | null;

  @ApiProperty({ example: '2024-03-01', nullable: true })
  @Column({ type: 'text', nullable: true })
  startDate!: string | null;

  @ApiProperty({ example: 'uuid-folder-789', nullable: true })
  @Column({ type: 'text', nullable: true })
  evaluationsFolderId!: string | null;

  @ApiProperty({ example: JobPostStatus.RAW, enum: JobPostStatus })
  @Column({ type: 'enum', enum: JobPostStatus, default: JobPostStatus.RAW })
  status!: JobPostStatus;

  @ApiProperty({ example: 'Développeur Backend Senior', nullable: true })
  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  @UpdateDateColumn()
  updatedAt!: Date;

  @ApiProperty({ example: false, nullable: true })
  @Column({ type: 'boolean', nullable: true })
  requiresCoding!: boolean | null;

  @ApiProperty({ example: true, nullable: true })
  @Column({ type: 'boolean', nullable: true, default: null })
  hasQcm!: boolean | null;

  @ApiProperty({ example: 'uuid-docx-123', nullable: true })
  @Column({ type: 'text', nullable: true })
  unifiedDocxId!: string | null;

  // ── NOUVEAU ────────────────────────────────────────────────────────────────

  @ApiProperty({
    example: JobPostActivityStatus.OPEN,
    enum: JobPostActivityStatus,
    nullable: true,
    description: 'Statut métier de la fiche : ouverte, clôturée avec embauche, clôturée sans embauche',
  })
  @Column({
    type: 'enum',
    enum: JobPostActivityStatus,
    nullable: true,
    default: null,
  })
  jobStatus!: JobPostActivityStatus | null;

  @ApiProperty({
    type: [String],
    description: 'IDs des candidats associés (clôturée avec embauche)',
    default: [],
  })
  @Column({ type: 'jsonb', default: [] })
  linkedCandidateIds!: string[];

  }