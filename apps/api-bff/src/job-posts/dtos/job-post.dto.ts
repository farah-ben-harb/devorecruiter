import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobPostDto {
  @ApiProperty({ example: 'uuid-google-drive-123', description: 'ID du fichier Google Drive' })
  @IsString()
  @IsNotEmpty()
  googleDriveFileId!: string;

  @ApiPropertyOptional({ example: 'Développeur Backend NestJS', description: 'Nom du poste' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'CDI', description: 'Type de contrat' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'https://drive.google.com/file/d/xxx', description: 'URL du fichier' })
  @IsString()
  @IsOptional()
  url?: string;
}