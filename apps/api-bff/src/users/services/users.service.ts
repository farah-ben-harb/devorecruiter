import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { USERS_REPOSITORY } from '../interfaces/users-repository.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { CreateUserDto } from '../dtos/create-user.dto';
import type { IUsersRepository } from '../interfaces/users-repository.interface';
import { FindOptionsWhere } from 'typeorm';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {}

  findAll(page: number, limit: number): Promise<PaginatedResult<User>> {
    return this.usersRepository.findAll(page, limit);
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findBy({ email: dto.email });
    if (existing) {
      throw new ConflictException(
        `Un utilisateur avec l'email ${dto.email} existe déjà`,
      );
    }
    return this.usersRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      picture: '',
      roles: dto.roles,
      isActivated: dto.isActivated,
      refreshToken: null,
    });
  }

  findOrCreate(data: {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    roles: UserRole[];
    isActivated: boolean;
  }): Promise<User> {
    return this.usersRepository.findOrCreate(data);
  }

  findBy(criteria: FindOptionsWhere<User>): Promise<User | null> {
    return this.usersRepository.findBy(criteria);
  }

  findByWithRefreshToken(
    criteria: FindOptionsWhere<User>,
  ): Promise<User | null> {
    return this.usersRepository.findByWithRefreshToken(criteria);
  }

  update(id: number, dto: UpdateUserDto): Promise<User> {
    return this.usersRepository.update(id, dto);
  }

  updateActivation(id: number, isActivated: boolean): Promise<User> {
    return this.usersRepository.updateActivation(id, isActivated);
  }

  updateRefreshToken(id: number, hash: string | null): Promise<void> {
    return this.usersRepository.updateRefreshToken(id, hash);
  }

  updateLastLogin(id: number, picture: string): Promise<void> {
    return this.usersRepository.updateLastLogin(id, picture);
  }

  deleteUser(id: number): Promise<void> {
    return this.usersRepository.deleteBy({ id });
  }

  updateGoogleAccessToken(id: number, token: string): Promise<void> {
    return this.usersRepository.updateGoogleAccessToken(id, token);
  }

  async getGoogleAccessToken(id: number): Promise<string | null> {
    const user = await this.usersRepository.findByWithGoogleToken({ id });
    return user?.googleAccessToken ?? null;
  }

  async getGoogleRefreshToken(userId: number): Promise<string | null> {
    const user = await this.findBy({ id: userId });
    return user?.googleRefreshToken ?? null;
  }

  async updateGoogleRefreshToken(
    userId: number,
    token: string | null,
  ): Promise<void> {
    await this.usersRepository.updateGoogleRefreshToken(userId, token);
  }

  async getAllEmailsExcept(excludeUserId: number): Promise<string[]> {
    return this.usersRepository.getAllEmailsExcept(excludeUserId);
  }
}
