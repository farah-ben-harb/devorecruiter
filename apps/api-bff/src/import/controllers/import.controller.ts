import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ImportService } from '../services/import.service';
import { UsersService } from '../../users/services/users.service';

@ApiTags('Import')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly usersService: UsersService,
  ) {}

  @Post('users')
  @Roles(UserRole.ADMIN_RH)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Importer des utilisateurs depuis un fichier Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Fichier Excel (.xlsx) contenant les utilisateurs à importer',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import effectué avec succès.',
    schema: {
      example: { added: 5, ignored: 2, errors: ['Ligne 3 : email invalide'] },
    },
  })
  @ApiResponse({ status: 400, description: 'Fichier manquant ou invalide.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  async importUsers(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ added: number; ignored: number; errors: string[] }> {
    if (!file) throw new BadRequestException('Fichier manquant');

    const { valid, errors } = await this.importService.parseUsersFromExcel(
      file.buffer,
    );

    let added = 0;
    let ignored = 0;

    for (const userData of valid) {
      try {
        await this.usersService.createUser({
          email: userData.email!,
          firstName: userData.firstName!,
          lastName: userData.lastName!,
          roles: userData.roles!,
          isActivated: userData.isActivated ?? true,
        });
        added++;
      } catch {
        ignored++;
      }
    }

    return { added, ignored, errors };
  }
}
