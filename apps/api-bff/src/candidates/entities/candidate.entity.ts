import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResumeType {
  BRUT = 'brut',
  UNIFIE = 'unifie',
}
export enum ResumeStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DONE = 'done',
  ERROR = 'error',
}

@Entity('candidates')
export class Candidate {
  @ApiProperty({ example: 'uuid-candidate-123', description: 'ID unique du candidat' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ example: 'uuid-google-drive-456', nullable: true, description: 'ID Google Drive du CV brut' })
  @Index({ unique: true, sparse: true })
  @Column({ type: 'varchar', nullable: true })
  brutDriveId!: string | null;

  @ApiProperty({ example: 'cv_john_doe.pdf', nullable: true, description: 'Nom du fichier CV brut sur Google Drive' })
  @Column({ type: 'varchar', nullable: true })
  brutDriveName!: string | null;

  @ApiProperty({ example: 'https://drive.google.com/file/d/xxx', nullable: true, description: 'Lien Google Drive du CV brut' })
  @Column({ type: 'varchar', nullable: true })
  brutDriveLink!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true, description: 'Nom du candidat' })
  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'John', nullable: true, description: 'Prénom du candidat' })
  @Column({ type: 'varchar', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'uuid-unifie-789', nullable: true, description: 'ID Google Drive du CV unifié' })
  @Index({ unique: true, sparse: true })
  @Column({ type: 'varchar', nullable: true })
  unifieDriveId!: string | null;

  @ApiProperty({ example: 'cv_john_doe_unifie.pdf', nullable: true, description: 'Nom du fichier CV unifié sur Google Drive' })
  @Column({ type: 'varchar', nullable: true })
  unifieDriveName!: string | null;

  @ApiProperty({ example: 'https://drive.google.com/file/d/yyy', nullable: true, description: 'Lien Google Drive du CV unifié' })
  @Column({ type: 'varchar', nullable: true })
  unifieDriveLink!: string | null;

  @ApiProperty({ example: ResumeStatus.PENDING, enum: ResumeStatus, description: 'Statut du traitement du CV' })
  @Column({ type: 'enum', enum: ResumeStatus, default: ResumeStatus.PENDING })
  status!: ResumeStatus;

  @ApiProperty({ example: 'john.doe@gmail.com', nullable: true, description: 'Email du candidat' })
  @Column({ type: 'varchar', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'johndoe', nullable: true, description: 'Nom d\'utilisateur GitHub du candidat' })
  @Column({ type: 'varchar', nullable: true })
  githubUsername!: string | null;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'Date de dernière modification' })
  @UpdateDateColumn()
  updatedAt!: Date;
}