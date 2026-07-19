import { IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TriggerScoringResumeDto {
  @ApiProperty({ example: 'uuid-resume-123', description: 'ID du fichier CV' })
  @IsString()
  resumeFileId!: string;

  @ApiProperty({ example: 'cv_john_doe.pdf', description: 'Nom du fichier CV' })
  @IsString()
  resumeName!: string;

  @ApiProperty({ example: 'uuid-google-drive-456', description: 'ID Google Drive de l\'offre d\'emploi' })
  @IsString()
  jobPostGoogleDriveFileId!: string;

  @ApiProperty({ example: 1, description: 'ID de l\'offre d\'emploi' })
  @IsNumber()
  jobPostId!: number;
}