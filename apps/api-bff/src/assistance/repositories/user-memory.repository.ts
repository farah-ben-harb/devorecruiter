import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserMemoryEntity } from '../entities/user-memory.entity';

@Injectable()
export class UserMemoryRepository {
  constructor(
    @InjectRepository(UserMemoryEntity)
    private readonly repo: Repository<UserMemoryEntity>,
  ) {}

  async getByUserId(userId: number): Promise<UserMemoryEntity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async upsert(userId: number, summary: string): Promise<void> {
    const existing = await this.getByUserId(userId);
    if (existing) {
      await this.repo.update({ userId }, { summary });
    } else {
      await this.repo.save(this.repo.create({ userId, summary }));
    }
  }
}
