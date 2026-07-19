import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationEntity } from '../entities/conversation.entity';
import { IConversationRepository } from '../interfaces/assistance-repository.interface';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { UpdateConversationDto } from '../dtos/update-conversation.dto';

@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly repo: Repository<ConversationEntity>,
  ) {}

  findAllByUserId(userId: number): Promise<ConversationEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  findOneById(id: string, userId: number): Promise<ConversationEntity | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  create(
    dto: CreateConversationDto,
    userId: number,
  ): Promise<ConversationEntity> {
    const conversation = this.repo.create({ ...dto, userId });
    return this.repo.save(conversation);
  }

  async update(
    id: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationEntity> {
    await this.repo.update(id, dto);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
