import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Candidate } from '../../candidates/entities/candidate.entity';

export interface ScoreDimension {
  score: number;
  detail: string;
}

export interface ScoreDetail {
  scoreGlobal: number;
  technicalSkills: ScoreDimension;
  experience: ScoreDimension;
  education: ScoreDimension;
  softSkills: ScoreDimension;
  languages: ScoreDimension;
  strengths: string[];
  weaknesses: string[];
  resume: string;
  recommendation: 'ACCEPTED' | 'REJECTED';
}

export interface ScoredJobPost {
  fileId: string;
  fileName: string;
  jobTitle: string;
  scoreGlobal: number;
  status: 'MATCH' | 'NO_MATCH';
  detail: ScoreDetail;
  createdAt: string;
}

export enum ScoringStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  DONE = 'done',
  ERROR = 'error',
}

@Entity('job_post_evaluation')
@Index(['candidateId', 'createdAt'])
export class JobPostEvaluation {
  @ApiProperty({ example: 'uuid-evaluation-123', description: 'ID unique de l\'évaluation' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'uuid-candidate-456', description: 'ID du candidat évalué' })
  @Column({ type: 'uuid' })
  @Index()
  candidateId!: string;

  @ApiProperty({ example: ScoringStatus.DONE, enum: ScoringStatus, description: 'Statut du scoring' })
  @Column({ type: 'enum', enum: ScoringStatus, default: ScoringStatus.DONE })
  status!: ScoringStatus;

  @ApiProperty({ type: 'array', nullable: true, description: 'Liste des résultats de matching avec les offres d\'emploi' })
  @Column({ type: 'jsonb', nullable: true, default: null })
  matches!: ScoredJobPost[] | null;

  @ApiProperty({ example: 3, description: 'Nombre total de matchs trouvés' })
  @Column({ type: 'int', default: 0 })
  totalMatch!: number;

  @ApiProperty({ example: 'Erreur lors de la connexion à n8n', nullable: true, description: 'Message d\'erreur en cas d\'échec' })
  @Column({ type: 'varchar', nullable: true, default: null })
  errorMessage!: string | null;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', nullable: true, description: 'Date de complétion du scoring' })
  @Column({ type: 'timestamptz', nullable: true, default: null })
  completedAt!: Date | null;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate!: Candidate;
}