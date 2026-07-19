import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from '../entities/message.entity';
import { IMessageRepository } from '../interfaces/assistance-repository.interface';
import { CreateMessageDto } from '../dtos/create-message.dto';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly repo: Repository<MessageEntity>,
  ) {}

  findByConversationId(conversationId: string): Promise<MessageEntity[]> {
    return this.repo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  create(dto: CreateMessageDto): Promise<MessageEntity> {
    const message = this.repo.create(dto);
    return this.repo.save(message);
  }
}
