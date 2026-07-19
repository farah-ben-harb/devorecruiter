import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Invitation } from '../evaluation-invitations/evaluation-invitation.entity';

export enum QuizResultStatus {
  PENDING   = 'pending',
  COMPLETED = 'completed',
}

@Entity('candidate_quiz_results')
export class CandidateQuizResult {
  @ApiProperty({ example: 1, description: 'Identifiant unique du résultat' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 10, description: 'ID de l\'invitation liée' })
  @Column()
  invitationId!: number;

  @ApiProperty({ example: 'clk7h2x0f0000qzrmf4k3j8ab', description: 'ID unique du candidat' })
  @Column({ type: 'varchar' })
  candidateId!: string;

  @ApiProperty({ example: 5, description: 'ID de l\'évaluation quiz' })
  @Column()
  evaluationId!: number;

  @ApiProperty({
    description: 'Réponses brutes soumises par le candidat (JSON stringifié)',
    example: '[{"questionId":1,"answer":"Option A"},{"questionId":2,"answer":"Option C"}]',
  })
  @Column({ type: 'text' })
  answersJson!: string;

  @ApiProperty({ example: 15, description: 'Nombre total de questions du quiz' })
  @Column({ type: 'int', default: 0 })
  totalQuestions!: number;

  @ApiProperty({ example: 11, description: 'Nombre de bonnes réponses' })
  @Column({ type: 'int', default: 0 })
  correctAnswers!: number;

  @ApiProperty({ example: 73, description: 'Score en pourcentage (0-100)' })
  @Column({ type: 'int', default: 0 })
  scorePercent!: number;

  @ApiPropertyOptional({
    description: 'Détail corrigé question par question (JSON stringifié) : [{ questionId, question, yourAnswer, correctAnswer, isCorrect, explanation, domain, difficulty }]',
  })
  @Column({ type: 'text', nullable: true })
  detailJson!: string | null;

  @ApiPropertyOptional({
    description: 'Feedback IA complet (JSON stringifié) : { globalScore, recommendation, globalFeedback, strengths, weaknesses, domainAnalysis, interviewRecommendations }',
  })
  @Column({ type: 'text', nullable: true })
  aiFeedbackJson!: string | null;

  @ApiPropertyOptional({ example: 1245, description: 'Durée de complétion du quiz en secondes' })
  @Column({ type: 'int', nullable: true })
  durationSeconds!: number | null;

  @ApiProperty({
    enum: QuizResultStatus,
    default: QuizResultStatus.COMPLETED,
    description: 'Statut du résultat',
    example: QuizResultStatus.COMPLETED,
  })
  @Column({ type: 'enum', enum: QuizResultStatus, default: QuizResultStatus.COMPLETED })
  status!: QuizResultStatus;

  @ApiProperty({ type: () => Invitation, description: 'Invitation associée à ce résultat' })
  @ManyToOne(() => Invitation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitationId' })
  invitation!: Invitation;

  @ApiProperty({ description: 'Date de soumission du quiz', example: '2025-01-15T14:30:00.000Z' })
  @CreateDateColumn()
  submittedAt!: Date;
}