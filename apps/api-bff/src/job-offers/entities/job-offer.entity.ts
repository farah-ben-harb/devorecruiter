import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Entity('job_offers')
export class JobOffer {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID unique de l\'offre d\'emploi (UUID)',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Input utilisateur ─────────────────────────────────────
  @ApiProperty({
    example: 'Développeur Full Stack React/Node.js avec expérience en startup',
    description: 'Prompt libre saisi par l\'utilisateur pour générer l\'offre',
  })
  @Column({ type: 'text' })
  promptLibre!: string;

  // ── Champs générés par le modèle IA ──────────────────────
  @ApiProperty({
    example: 'Développeur Full Stack React/Node.js H/F',
    description: 'Titre de l\'offre d\'emploi',
    maxLength: 255,
  })
  @Column({ type: 'varchar', length: 255 })
  titre!: string;

  @ApiProperty({
    example: 'Rejoignez une startup innovante et participez à des projets à fort impact !',
    description: 'Accroche / phrase d\'introduction pour LinkedIn',
  })
  @Column({ type: 'text' })
  accroche!: string;

  @ApiProperty({
    example: 'Nous recherchons un Développeur Full Stack passionné...',
    description: 'Texte complet optimisé pour LinkedIn',
  })
  @Column({ type: 'text' })
  formatLinkedin!: string;

  @ApiProperty({
    example: ['Développer de nouvelles fonctionnalités', 'Maintenance des applications existantes', 'Participation aux choix techniques'],
    description: 'Liste des missions',
    type: [String],
  })
  @Column({ type: 'jsonb' })
  missions!: string[];

  @ApiProperty({
    example: ['Minimum 3 ans d\'expérience en React', 'Maîtrise de Node.js et Express', 'Bonne connaissance des bases de données'],
    description: 'Profil recherché (compétences et exigences)',
    type: [String],
  })
  @Column({ type: 'jsonb' })
  profil!: string[];

  @ApiProperty({
    example: ['Tickets restaurant', 'Télétravail hybride', 'Formation continue', 'Budget matériel'],
    description: 'Avantages proposés',
    type: [String],
  })
  @Column({ type: 'jsonb' })
  avantages!: string[];

  @ApiProperty({
    example: ['#ReactJS', '#NodeJS', '#FullStack', '#Startup', '#Tech'],
    description: 'Hashtags recommandés pour LinkedIn',
    type: [String],
  })
  @Column({ type: 'jsonb' })
  hashtags!: string[];

  @ApiProperty({
    example: ['react', 'node.js', 'typescript', 'fullstack', 'javascript'],
    description: 'Mots-clés pour le référencement',
    type: [String],
  })
  @Column({ type: 'jsonb' })
  motsCles!: string[];

  // ── Statut ────────────────────────────────────────────────
  @ApiProperty({
    example: false,
    description: 'Indique si l\'offre a été publiée',
    default: false,
  })
  @Column({ type: 'boolean', default: false })
  isPublished!: boolean;

  // ── Relations ─────────────────────────────────────────────
  @ApiProperty({
    example: 42,
    description: 'ID de l\'utilisateur propriétaire',
  })
  @Column({ name: 'user_id' })
  userId!: number;

  @ApiProperty({ type: () => User, description: 'Utilisateur ayant créé l\'offre' })
  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // ── Timestamps ────────────────────────────────────────────
  @ApiProperty({
    example: '2025-05-20T10:30:00.000Z',
    description: 'Date de création',
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({
    example: '2025-05-20T10:45:00.000Z',
    description: 'Date de dernière mise à jour',
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ApiProperty({ example: 1, nullable: true })
  @Column({ type: 'int', nullable: true, default: null })
  jobPostId!: number | null;
}