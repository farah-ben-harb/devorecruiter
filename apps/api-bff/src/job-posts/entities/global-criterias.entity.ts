import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('global_criteria')
export class GlobalCriteria {
  @ApiProperty({ example: 1, description: 'ID unique du critère' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'Maîtrise de TypeScript', description: 'Libellé du critère' })
  @Column({ type: 'text' })
  label!: string;

  @ApiProperty({ example: 'Compétence technique indispensable pour tous nos postes', nullable: true })
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'technique', description: 'Catégorie du critère' })
  @Column({ type: 'text', nullable: true })
  category!: string | null;

  @ApiProperty({ example: 1, description: 'Ordre d\'affichage' })
  @Column({ type: 'int', default: 0 })
  order!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}