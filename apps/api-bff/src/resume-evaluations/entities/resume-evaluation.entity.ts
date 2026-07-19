import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { JobPost } from '../../job-posts/entities/job-post.entity';

@Entity('resume_evaluation')
export class ResumeEvaluation {
  @ApiProperty({ example: 1, description: 'ID unique de l\'évaluation' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'uuid-resume-123', description: 'ID du fichier CV' })
  @Column()
  resumeFileId!: string;

  @ApiProperty({ example: 'cv_john_doe.pdf', description: 'Nom du fichier CV' })
  @Column()
  resumeName!: string;

  @ApiProperty({ example: 1, description: 'ID de l\'offre d\'emploi' })
  @Column()
  jobPostId!: number;

  @ApiProperty({ example: 'uuid-google-drive-456', description: 'ID Google Drive de l\'offre d\'emploi' })
  @Column()
  jobPostGoogleDriveFileId!: string;

  @ApiProperty({ example: 85, description: 'Score global de l\'évaluation entre 0 et 100' })
  @Column()
  scoreGlobal!: number;

  @ApiProperty({
    description: 'Détail des critères d\'évaluation',
    example: {
      technicalSkills: { score: 90, detail: 'Maîtrise de NestJS et TypeScript' },
      experience: { score: 80, detail: '3 ans d\'expérience backend' },
      education: { score: 75, detail: 'Licence en informatique' },
      softSkills: { score: 85, detail: 'Bonne communication' },
      languages: { score: 70, detail: 'Anglais professionnel' },
    },
  })
  @Column('jsonb')
  criteria!: {
    technicalSkills: { score: number; detail: string };
    experience: { score: number; detail: string };
    education: { score: number; detail: string };
    softSkills: { score: number; detail: string };
    languages: { score: number; detail: string };
    certifications?: { score: number; detail: string; matched: string[]; missing: string[]; };
  };

  @ApiProperty({ type: [String], example: ['Maîtrise de Node.js', 'Expérience en microservices'], description: 'Points forts du candidat' })
  @Column('text', { array: true })
  strengths!: string[];

  @ApiProperty({ type: [String], example: ['Manque d\'expérience DevOps'], description: 'Points faibles du candidat' })
  @Column('text', { array: true })
  weaknesses!: string[];

  @ApiProperty({ example: 'Candidat solide avec bonne base technique.', description: 'Résumé de l\'évaluation' })
  @Column('text')
  resume!: string;

  @ApiProperty({ example: 'ACCEPTED', enum: ['ACCEPTED', 'REJECTED'], description: 'Recommandation finale' })
  @Column()
  recommendation!: string;

  @ApiProperty({ example: 'MATCH', enum: ['MATCH', 'NO_MATCH'], description: 'Statut du matching' })
  @Column()
  status!: string;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création de l\'évaluation' })
  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  highlightedFileId?: string;

  @Column({ default: false })
  isOutdated!: boolean;

  @ManyToOne(() => JobPost, { onDelete: 'CASCADE', nullable: true })
@JoinColumn({ name: 'jobPostId' })
jobPost!: JobPost | null;
}