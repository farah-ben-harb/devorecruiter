import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';

export enum InvitationStatus {
  SENT = 'sent',
  OPENED = 'opened',
  SUBMITTED = 'submitted',
}

@Entity('invitations')
export class Invitation {
  @ApiProperty({ example: 1, description: 'ID unique de l\'invitation' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'uuid-candidate-123', description: 'UUID du candidat' })
  @Column({ type: 'varchar' })
  candidateId!: string;

  @ApiProperty({ example: 'Doe', description: 'Nom du candidat' })
  @Column({ type: 'varchar' })
  candidateName!: string;

  @ApiProperty({ example: 'John', description: 'Prénom du candidat' })
  @Column({ type: 'varchar' })
  candidateFirstName!: string;

  @ApiProperty({ example: 'john.doe@gmail.com', description: 'Email du candidat' })
  @Column({ type: 'varchar' })
  candidateEmail!: string;

  @ApiProperty({ example: 1, description: 'ID de l\'offre d\'emploi' })
  @Column()
  jobPostId!: number;

  @ApiProperty({ example: 1, description: 'ID de l\'évaluation technique associée' })
  @Column()
  evaluationId!: number;

  @ApiProperty({ example: '2024-02-15', description: 'Date limite pour soumettre l\'évaluation (format YYYY-MM-DD)' })
  @Column({ type: 'date' })
  dueDate!: string;

  @ApiProperty({ example: InvitationStatus.SENT, enum: InvitationStatus, description: 'Statut de l\'invitation', default: InvitationStatus.SENT })
  @Column({ type: 'enum', enum: InvitationStatus, default: InvitationStatus.SENT })
  status!: InvitationStatus;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date d\'envoi de l\'invitation' })
  @CreateDateColumn()
  sentAt!: Date;

  @ApiProperty({ example: 'uuid-resume-456', nullable: true, description: 'ID du fichier CV du candidat' })
  @Column({ type: 'varchar', nullable: true })
  candidateResumeFileId!: string | null;

  @ApiProperty({ example: 'https://github.com/johndoe/test-repo', nullable: true, description: 'URL du dépôt Git soumis par le candidat' })
  @Column({ type: 'varchar', nullable: true })
  gitRepoUrl!: string | null;

  @ManyToOne(() => TechnicalEvaluation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluationId' })
  evaluation!: TechnicalEvaluation;

  @ApiPropertyOptional({
    example: 'quiz-token-example',
    description: 'Token unique sécurisé généré pour accéder au quiz (lien public sans auth)',
  })
  @Column({ type: 'varchar', nullable: true, unique: true })
  quizToken!: string | null;
}
