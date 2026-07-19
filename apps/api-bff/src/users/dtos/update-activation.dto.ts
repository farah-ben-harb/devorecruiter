import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateActivationDto {
  @ApiProperty({ example: true, description: 'Activer ou désactiver le compte utilisateur' })
  @IsBoolean({ message: 'isActivated doit être un booléen' })
  isActivated!: boolean;
}