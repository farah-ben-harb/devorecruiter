import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RhConversationEntity } from '../entities/rh_conversations.entity';
import { RhMessageEntity } from '../entities/rh_messages.entity';
import { IRhAssistantRepository } from '../interfaces/rh-assistant.interface';

@Injectable()
export class RhAssistantRepository implements IRhAssistantRepository {
  constructor(
    @InjectRepository(RhConversationEntity)
    private readonly convRepo: Repository<RhConversationEntity>,

    @InjectRepository(RhMessageEntity)
    private readonly msgRepo: Repository<RhMessageEntity>,
  ) {}

  // ─── Créer une nouvelle conversation ────────────
  async createConversation(userId: number): Promise<RhConversationEntity> {
    const conv = this.convRepo.create({ userId, isActive: true });
    return this.convRepo.save(conv);
  }

  // ─── Trouver la conversation active d'un user ───
  async findActiveConversation(
    userId: number,
  ): Promise<RhConversationEntity | null> {
    return this.convRepo.findOne({
      where: { userId, isActive: true },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Trouver une conversation par ID ────────────
  async findConversationById(id: number): Promise<RhConversationEntity | null> {
    return this.convRepo.findOne({
      where: { id },
      relations: ['messages', 'user'],
    });
  }

  // ─── Fermer une conversation ────────────────────
  async closeConversation(conversationId: number): Promise<void> {
    await this.convRepo.update(conversationId, { isActive: false });
  }

  // ─── Sauvegarder un message ─────────────────────
  async saveMessage(
    partial: Partial<RhMessageEntity>,
  ): Promise<RhMessageEntity> {
    const message = this.msgRepo.create(partial);
    return this.msgRepo.save(message);
  }

  // ─── Messages d'une conversation ────────────────
  async findMessagesByConversation(
    conversationId: number,
  ): Promise<RhMessageEntity[]> {
    return this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  // ─── Compter messages d'un user ─────────────────
  async countMessagesByUser(userId: number): Promise<number> {
    return this.msgRepo
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.userId = :userId', { userId })
      .getCount();
  }

  // ─── Toutes les conversations d'un user ─────────
  async findAllConversationsByUser(
    userId: number,
  ): Promise<RhConversationEntity[]> {
    return this.convRepo.find({
      where: { userId },
      relations: ['messages'],
      order: { createdAt: 'DESC' },
    });
  }

  // rh-assistant.repository.ts
  async findAllConversationsWithFirstMessage(userId: number) {
    return this.convRepo.find({
      // convRepo est le bon nom injecté
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['messages'],
    });
  }

  async deleteConversation(
    conversationId: number,
    userId: number,
  ): Promise<void> {
    await this.convRepo.delete({ id: conversationId, userId });
  }

  async pinConversation(
    id: number,
    userId: number,
    isPinned: boolean,
  ): Promise<void> {
    await this.convRepo.update({ id, userId }, { isPinned });
  }
  async renameConversation(
    id: number,
    userId: number,
    title: string,
  ): Promise<void> {
    await this.convRepo.update({ id, userId }, { title });
  }
}
