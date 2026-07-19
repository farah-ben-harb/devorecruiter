import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
  Req,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateActivationDto } from '../dtos/update-activation.dto';
import { CreateUserDto } from '../dtos/create-user.dto';
import { Request } from 'express';
import { PaginateQueryDto } from '../../common/dtos/paginate-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { UpdateUserDto } from '../dtos/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_RH)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste paginée des utilisateurs' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de la page', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'éléments par page', example: 10 })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs retournée.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  findAll(@Query() query: PaginateQueryDto): Promise<PaginatedResult<User>> {
    return this.usersService.findAll(query.page, query.limit);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel utilisateur' })
  @ApiResponse({ status: 201, type: User, description: 'Utilisateur créé avec succès.' })
  @ApiResponse({ status: 400, description: 'Données invalides.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  createUser(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.createUser(dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activer ou désactiver un compte utilisateur' })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, type: User, description: 'Statut d\'activation mis à jour.' })
  @ApiResponse({ status: 400, description: 'Impossible de modifier votre propre compte.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé.' })
  updateActivation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivationDto,
    @Req() req: Request & { user: User },
  ): Promise<User> {
    if (id === req.user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas désactiver votre propre compte',
      );
    }
    return this.usersService.updateActivation(id, dto.isActivated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé avec succès.' })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer votre propre compte.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé.' })
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: User },
  ): Promise<void> {
    if (id === req.user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    }
    return this.usersService.deleteUser(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  @ApiParam({ name: 'id', description: 'ID de l\'utilisateur' })
  @ApiResponse({ status: 200, type: User, description: 'Utilisateur mis à jour avec succès.' })
  @ApiResponse({ status: 400, description: 'Impossible de modifier votre propre compte.' })
  @ApiResponse({ status: 401, description: 'Non autorisé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé - rôle insuffisant.' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé.' })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user: User },
  ): Promise<User> {
    if (id === req.user.id) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier votre propre compte',
      );
    }
    return this.usersService.update(id, dto);
  }
}