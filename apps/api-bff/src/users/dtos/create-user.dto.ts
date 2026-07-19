import {
  IsEmail,
  IsBoolean,
  IsString,
  Matches,
  ArrayMinSize,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@gmail.com', description: 'Adresse email Gmail de l\'utilisateur' })
  @IsEmail({}, { message: 'Email invalide' })
  @Matches(/^[a-zA-Z0-9._%+-]+@gmail\.com$/, {
    message: "L'email doit être une adresse @gmail.com",
  })
  email!: string;

  @ApiProperty({ example: 'John', description: 'Prénom de l\'utilisateur' })
  @IsString({ message: 'Le prénom est requis' })
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Nom de l\'utilisateur' })
  @IsString({ message: 'Le nom est requis' })
  lastName!: string;

  @ApiProperty({ example: [UserRole.ADMIN_RH], enum: UserRole, isArray: true, description: 'Rôles attribués à l\'utilisateur (au moins un requis)' })
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Rôle invalide' })
  @ArrayMinSize(1, { message: 'Au moins un rôle est requis' })
  roles!: UserRole[];

  @ApiProperty({ example: true, description: 'Indique si le compte utilisateur est activé' })
  @IsBoolean({ message: 'isActivated doit être un booléen' })
  isActivated!: boolean;
}