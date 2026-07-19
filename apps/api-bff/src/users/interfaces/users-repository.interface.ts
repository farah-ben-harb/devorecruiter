import { FindOptionsWhere } from 'typeorm';
import { User } from '../entities/user.entity';
import { IBaseRepository } from '../../common/interfaces/base-repository.interface';
import { UpdateUserDto } from '../dtos/update-user.dto';

export interface IUsersRepository extends IBaseRepository<User> {
  findByWithRefreshToken(
    criteria: FindOptionsWhere<User>,
  ): Promise<User | null>;
  findOrCreate(data: {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    roles: string[];
    isActivated: boolean;
  }): Promise<User>;
  updateActivation(id: number, isActivated: boolean): Promise<User>;
  updateRefreshToken(id: number, hash: string | null): Promise<void>;
  updateLastLogin(id: number, picture: string): Promise<void>;
  updateGoogleAccessToken(id: number, token: string): Promise<void>;
  updateGoogleRefreshToken(id: number, token: string | null): Promise<void>;
  findByWithGoogleToken(criteria: FindOptionsWhere<User>): Promise<User | null>;
  getAllEmailsExcept(excludeUserId: number): Promise<string[]>;
  update(id: number, dto: UpdateUserDto): Promise<User>;
}

export const USERS_REPOSITORY = 'USERS_REPOSITORY';
