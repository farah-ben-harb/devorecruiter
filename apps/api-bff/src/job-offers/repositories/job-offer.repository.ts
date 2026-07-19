import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobOffer } from '../entities/job-offer.entity';
import {
  IJobOfferRepository,
  ICreateJobOfferData,
  IUpdateJobOfferData,
} from '../interfaces/job-offer.interface';

@Injectable()
export class JobOfferRepository implements IJobOfferRepository {
  constructor(
    @InjectRepository(JobOffer)
    private readonly repo: Repository<JobOffer>,
  ) {}

  // ── Créer une offre ───────────────────────────────────────
  async create(data: ICreateJobOfferData): Promise<JobOffer> {
    const offer = this.repo.create(data);
    return this.repo.save(offer);
  }

  // ── Toutes les offres d'un utilisateur ────────────────────
  async findAll(userId: number): Promise<JobOffer[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Une offre précise (vérification propriétaire) ─────────
  async findOne(id: string, userId: number): Promise<JobOffer | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  // ── Mettre à jour ─────────────────────────────────────────
  async update(
    id: string,
    userId: number,
    data: IUpdateJobOfferData,
  ): Promise<JobOffer> {
    const offer = await this.findOne(id, userId);
    if (!offer) {
      throw new NotFoundException(`Job offer #${id} not found`);
    }
    Object.assign(offer, data);
    return this.repo.save(offer);
  }

  // ── Supprimer ─────────────────────────────────────────────
  async delete(id: string, userId: number): Promise<void> {
    const offer = await this.findOne(id, userId);
    if (!offer) {
      throw new NotFoundException(`Job offer #${id} not found`);
    }
    await this.repo.remove(offer);
  }
}