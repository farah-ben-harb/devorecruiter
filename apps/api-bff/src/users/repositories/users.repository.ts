import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Raw, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { IUsersRepository } from '../interfaces/users-repository.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UsersRepository implements IUsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(
    @InjectRepository(User)
    private readonly user: Repository<User>,
  ) {}

  async findAll(page: number, limit: number): Promise<PaginatedResult<User>> {
    const [data, total] = await this.user.findAndCount({
      where: {
        roles: Raw((alias) => `${alias} NOT LIKE :adminRole`, {
          adminRole: `%${UserRole.ADMIN_RH}%`,
        }),
      },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findBy(criteria: FindOptionsWhere<User>): Promise<User | null> {
    return this.user.findOne({ where: criteria });
  }

  findByWithRefreshToken(
    criteria: FindOptionsWhere<User>,
  ): Promise<User | null> {
    return this.user
      .createQueryBuilder('user')
      .addSelect('user.refreshToken')
      .where(criteria)
      .getOne();
  }

  async create(data: Partial<User>): Promise<User> {
    this.logger.log(`Création user : ${data.email}`);
    const user = this.user.create(data);
    return this.user.save(user);
  }

  async findOrCreate(data: {
    email: string;
    firstName: string;
    lastName: string;
    picture: string;
    roles: UserRole[];
    isActivated: boolean;
  }): Promise<User> {
    let user = await this.findBy({ email: data.email });

    if (!user) {
      this.logger.log(`Création user via OAuth : ${data.email}`);
      user = this.user.create({
        ...data,
        roles: data.roles,
        lastLogin: new Date(),
      });
    } else {
      this.logger.log(`Mise à jour user : ${data.email}`);
      user.picture = data.picture;
      user.lastLogin = new Date();
    }

    return this.user.save(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findBy({ id });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    user.email = dto.email;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.roles = dto.roles;
    user.isActivated = dto.isActivated;
    return this.user.save(user);
  }

  async updateActivation(id: number, isActivated: boolean): Promise<User> {
    const user = await this.findBy({ id });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    user.isActivated = isActivated;
    return this.user.save(user);
  }

  async updateRefreshToken(id: number, hash: string | null): Promise<void> {
    await this.user.update(id, { refreshToken: hash });
  }

  async updateLastLogin(id: number, picture: string): Promise<void> {
    await this.user.update(id, { lastLogin: new Date(), picture });
  }

  async updateGoogleAccessToken(id: number, token: string): Promise<void> {
    await this.user.update(id, { googleAccessToken: token });
  }

  async updateGoogleRefreshToken(
    id: number,
    token: string | null,
  ): Promise<void> {
    await this.user.update(id, { googleRefreshToken: token });
  }

  findByWithGoogleToken(
    criteria: FindOptionsWhere<User>,
  ): Promise<User | null> {
    return this.user
      .createQueryBuilder('user')
      .addSelect('user.googleAccessToken')
      .where(criteria)
      .getOne();
  }

  async save(user: User): Promise<User> {
    return this.user.save(user);
  }

  async deleteBy(criteria: FindOptionsWhere<User>): Promise<void> {
    const user = await this.findBy(criteria);
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    await this.user.remove(user);
  }

  async getAllEmailsExcept(excludeUserId: number): Promise<string[]> {
    const users = await this.user.find({
      where: { id: Not(excludeUserId), isActivated: true },
      select: ['email'],
    });
    return users.map((u) => u.email);
  }
}
