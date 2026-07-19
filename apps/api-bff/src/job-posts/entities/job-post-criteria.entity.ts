// src/job-posts/entities/job-post-criteria.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { JobPost } from './job-post.entity';

export enum CriteriaSource {
  N8N_UNIFICATION = 'n8n_unification',
  STANDALONE      = 'standalone',
}

export interface CriteriaSection {
  key: string;
  label: string;
  items: string[];
  fromGlobal?: boolean;
}

@Entity('job_post_criteria')
export class JobPostCriteria {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ description: 'FK vers job_posts' })
  @Index({ unique: true })
  @Column()
  jobPostId!: number;

  @OneToOne(() => JobPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobPostId' })
  jobPost!: JobPost;

  @ApiProperty({ example: 'Développeur Backend NestJS', nullable: true })
  @Column({ type: 'text', nullable: true })
  intitulePoste!: string | null;

  // ── Champs plats conservés pour compat backward (n8n, scoring ancien) ─────

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: [] })
  competencesTechniquesRequises!: string[];

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: [] })
  competencesGeneralesRequises!: string[];

  @ApiProperty({ example: 5, nullable: true })
  @Column({ type: 'int', nullable: true })
  experienceMinimaleAnnees!: number | null;

  @ApiProperty({ example: 'Bac+5 Informatique', nullable: true })
  @Column({ type: 'text', nullable: true })
  formationRequise!: string | null;

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: [] })
  languesRequises!: string[];

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: [] })
  missionsPrincipales!: string[];

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: [] })
  certificationsRequises!: string[];

  // ── Source de vérité pour l'édition dynamique ────────────────────────────

  @ApiProperty({
    description: 'Sections dynamiques de critères (source de vérité pour le frontend et n8n)',
    type: 'array',
    nullable: true,
    example: [
      { key: 'competencesTechniquesRequises', label: 'Stack technique', items: ['TypeScript', 'NestJS'] },
      { key: 'languesRequises', label: 'Langues', items: ['Anglais B2'] },
    ],
  })
  @Column({ type: 'jsonb', nullable: true, default: null })
  sections!: CriteriaSection[] | null;

  // ── Legacy compat ─────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'Libellés personnalisés legacy (remplacé par sections)',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true, default: null })
  sectionLabels!: Record<string, string> | null;

  // ── Meta ──────────────────────────────────────────────────────────────────

  @ApiProperty({ enum: CriteriaSource })
  @Column({ type: 'enum', enum: CriteriaSource, default: CriteriaSource.N8N_UNIFICATION })
  source!: CriteriaSource;

  @ApiProperty({ description: 'Réponse brute LLM', nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  rawJson!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}