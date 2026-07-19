import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('candidate_code_evaluations')
export class CandidateCodeEvaluation {
  @ApiProperty({ example: 1, description: 'ID unique de l\'évaluation de code' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 1, description: 'ID de l\'invitation associée' })
  @Column()
  invitationId!: number;

  @ApiProperty({ example: 'uuid-candidate-123', description: 'ID du candidat' })
  @Column()
  candidateId!: string;

  @ApiProperty({ example: 1, description: 'ID de l\'évaluation technique' })
  @Column()
  evaluationId!: number;

  @ApiProperty({ example: 'feature/test-candidat', nullable: true, description: 'Nom de la branche Git soumise par le candidat' })
  @Column({ nullable: true })
  branch!: string;

  @ApiProperty({ example: 85, nullable: true, description: 'Score global sur 100' })
  @Column('int', { nullable: true })
  globalScore!: number;

  @ApiProperty({ example: 90, nullable: true, description: 'Score technique sur 100' })
  @Column('int', { nullable: true })
  technicalScore!: number;

  @ApiProperty({ example: 80, nullable: true, description: 'Score qualité du code sur 100' })
  @Column('int', { nullable: true })
  qualityScore!: number;

  @ApiProperty({ example: 'Le candidat maîtrise bien les concepts REST mais manque de tests unitaires.', nullable: true, description: 'Feedback détaillé de l\'évaluation' })
  @Column('text', { nullable: true })
  feedback!: string;

  @ApiProperty({ type: [String], example: ['Bonne architecture', 'Code lisible'], nullable: true, description: 'Points forts du candidat' })
  @Column('simple-array', { nullable: true })
  strengths!: string[];

  @ApiProperty({ type: [String], example: ['Manque de tests', 'Gestion des erreurs insuffisante'], nullable: true, description: 'Points à améliorer' })
  @Column('simple-array', { nullable: true })
  improvements!: string[];

  @ApiProperty({ example: 'hire', enum: ['hire', 'maybe', 'reject'], nullable: true, description: 'Recommandation finale de recrutement' })
  @Column({ nullable: true })
  recommendation!: string;

  @ApiProperty({ example: '{"score": 85, "details": "..."}', nullable: true, description: 'Réponse brute de l\'IA' })
  @Column('text', { nullable: true })
  rawAiResponse!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de l\'évaluation' })
  @CreateDateColumn()
  evaluatedAt!: Date;

  @Column('simple-json', { nullable: true })
  requirementsAnalysis!: {
    completed: string[];
    partial: string[];
    missing: string[];
    bonus: string[];
  } | null;
}