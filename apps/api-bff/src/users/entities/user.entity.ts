import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('users')
export class User {
  @ApiProperty({ example: 1, description: 'ID unique de l\'utilisateur' })
  @PrimaryGeneratedColumn()
  id!: number;

  @ApiProperty({ example: 'john.doe@gmail.com', description: 'Adresse email de l\'utilisateur' })
  @Column({ unique: true })
  @Index('idx_users_email')
  email!: string;

  @ApiProperty({ example: 'John', description: 'Prénom de l\'utilisateur' })
  @Column()
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Nom de l\'utilisateur' })
  @Column()
  lastName!: string;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/photo.jpg', nullable: true, description: 'URL de la photo de profil' })
  @Column({ nullable: true })
  picture!: string;

  @ApiProperty({ enum: UserRole, isArray: true, example: ['ADMIN'], description: 'Rôles attribués à l\'utilisateur' })
  @Column({ type: 'simple-array' })
  roles!: UserRole[];

  @ApiProperty({ example: true, description: 'Indique si le compte est activé', default: true })
  @Column({ name: 'is_activated', default: true })
  isActivated!: boolean;

  @Column({ name: 'refresh_token', type: 'text', nullable: true, select: false })
  refreshToken!: string | null;

  @Column({ type: 'text', nullable: true })
  googleAccessToken!: string | null;

  @Column({ type: 'text', nullable: true })
  googleRefreshToken!: string | null;

  @ApiProperty({ example: '2024-01-15T10:00:00.000Z', description: 'Date de création du compte' })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', nullable: true, description: 'Date de dernière connexion' })
  @Column({ name: 'last_login', nullable: true })
  lastLogin!: Date;
}