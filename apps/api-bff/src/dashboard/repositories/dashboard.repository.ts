import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { JobPost } from '../../job-posts/entities/job-post.entity';
import { Candidate } from '../../candidates/entities/candidate.entity';
import { TechnicalEvaluation } from '../../technical-evaluations/entities/technical-evaluations/technical-evaluations.entity';
import { ConversationEntity } from '../../assistance/entities/conversation.entity';
import { MessageEntity } from '../../assistance/entities/message.entity';
import { UserMemoryEntity } from '../../assistance/entities/user-memory.entity';

import {
  Invitation,
  InvitationStatus,
} from '../../technical-evaluations/entities/evaluation-invitations/evaluation-invitation.entity';
import {
  ConsultantActivityPoint,
  ConsultantHourlyPoint,
  ConsultantStats,
  ConsultantDomainStats,
  DomainStat,
  ActivityPoint,
  PendingEvaluation,
  ReferentEvaluationStats,
  ReferentInvitationStats,
  RecentConversation,
} from '../interfaces/dashboard.interface';
@Injectable()
export class DashboardRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(JobPost)
    private readonly jobPostRepo: Repository<JobPost>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(TechnicalEvaluation)
    private readonly evalRepo: Repository<TechnicalEvaluation>,
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepo: Repository<MessageEntity>,
    @InjectRepository(UserMemoryEntity)
    private readonly userMemoryRepo: Repository<UserMemoryEntity>,
  ) {}

  // ── Users ─────────────────────────────────────────────────────────────

  async countUsersTotal(): Promise<number> {
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.roles NOT LIKE :role', { role: '%ADMIN_RH%' })
      .getCount();
  }

  async countUsersByStatus(): Promise<{ actifs: number; inactifs: number }> {
    const actifs = await this.userRepo
      .createQueryBuilder('u')
      .where('u.roles NOT LIKE :role', { role: '%ADMIN_RH%' })
      .andWhere('u.isActivated = :active', { active: true })
      .getCount();

    const inactifs = await this.userRepo
      .createQueryBuilder('u')
      .where('u.roles NOT LIKE :role', { role: '%ADMIN_RH%' })
      .andWhere('u.isActivated = :active', { active: false })
      .getCount();

    return { actifs, inactifs };
  }

  async countUsersByRole(): Promise<Record<string, number>> {
    const map: Record<string, number> = {
      [UserRole.TALENT_ACQUISITION]: 0,
      [UserRole.CONSULTANT]: 0,
      [UserRole.TECHNICAL_REFERENT]: 0,
    };

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.roles NOT LIKE :role', { role: '%ADMIN_RH%' })
      .select(['u.roles'])
      .getMany();

    users.forEach((u) => {
      u.roles.forEach((role: UserRole) => {
        if (map[role] !== undefined) map[role]++;
      });
    });

    return map;
  }

  // ── Job Posts ─────────────────────────────────────────────────────────

  async countJobPostsTotal(): Promise<number> {
    return this.jobPostRepo.count();
  }

  async countJobPostsBrutsAndUnifies(): Promise<{
    bruts: number;
    unifies: number;
  }> {
    const bruts = await this.jobPostRepo
      .createQueryBuilder('jp')
      .where('jp.unifiedUrl IS NULL')
      .orWhere("jp.unifiedUrl = ''")
      .getCount();

    const unifies = await this.jobPostRepo
      .createQueryBuilder('jp')
      .where('jp.unifiedUrl IS NOT NULL')
      .andWhere("jp.unifiedUrl <> ''")
      .getCount();

    return { bruts, unifies };
  }

  async countJobPostsByStatus(): Promise<Record<string, number>> {
    const results = await this.jobPostRepo
      .createQueryBuilder('jp')
      .select('jp.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('jp.status')
      .getRawMany<{ status: string; count: string }>();

    const map: Record<string, number> = {
      raw: 0,
      processing: 0,
      unified: 0,
      error: 0,
    };
    results.forEach((r) => {
      map[r.status] = parseInt(r.count, 10);
    });
    return map;
  }

  async topCompaniesByJobPosts(
    limit = 5,
  ): Promise<{ company: string; count: number }[]> {
    const results = await this.jobPostRepo
      .createQueryBuilder('jp')
      .select('jp.company', 'company')
      .addSelect('COUNT(*)', 'count')
      .where('jp.company IS NOT NULL')
      .andWhere("jp.company <> ''")
      .groupBy('jp.company')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ company: string; count: string }>();

    return results.map((r) => ({
      company: r.company,
      count: parseInt(r.count, 10),
    }));
  }

  async topTitlesByJobPosts(
    limit = 5,
  ): Promise<{ title: string; count: number }[]> {
    const results = await this.jobPostRepo
      .createQueryBuilder('jp')
      .select('jp.title', 'title')
      .addSelect('COUNT(*)', 'count')
      .where('jp.title IS NOT NULL')
      .andWhere("jp.title <> ''")
      .groupBy('jp.title')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany<{ title: string; count: string }>();

    return results.map((r) => ({
      title: r.title,
      count: parseInt(r.count, 10),
    }));
  }

  async getRecentJobPosts(limit = 10): Promise<Partial<JobPost>[]> {
    return this.jobPostRepo
      .createQueryBuilder('jp')
      .select([
        'jp.id',
        'jp.name',
        'jp.company',
        'jp.title',
        'jp.status',
        'jp.createdAt',
      ])
      .orderBy('jp.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  // ── Candidates / CVs ──────────────────────────────────────────────────

  async countCvs(): Promise<{ total: number; bruts: number; unifies: number }> {
    const total = await this.candidateRepo.count();
    const unifies = await this.candidateRepo
      .createQueryBuilder('c')
      .where('c.unifieDriveId IS NOT NULL')
      .andWhere("c.unifieDriveId <> ''")
      .getCount();
    return { total, bruts: total - unifies, unifies };
  }

  // ── Technical Evaluations ─────────────────────────────────────────────

  async countEvaluationsByStatus(): Promise<Record<string, number>> {
    const results = await this.evalRepo
      .createQueryBuilder('te')
      .select('te.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('te.status')
      .getRawMany<{ status: string; count: string }>();

    const map: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      approved: 0,
      rejected: 0,
    };
    results.forEach((r) => {
      map[r.status] = parseInt(r.count, 10);
    });
    return map;
  }

  // ── Référent — Évaluations ────────────────────────────────────────────

  async getReferentEvaluationStats(): Promise<ReferentEvaluationStats> {
    const results = await this.evalRepo
      .createQueryBuilder('te')
      .select('te.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('te.status')
      .getRawMany<{ status: string; count: string }>();

    const map: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      approved: 0,
      rejected: 0,
    };
    results.forEach((r) => {
      map[r.status] = parseInt(r.count, 10);
    });

    const total = Object.values(map).reduce((a, b) => a + b, 0);

    return {
      pending: map['pending'],
      inProgress: map['in_progress'],
      completed: map['completed'],
      approved: map['approved'],
      rejected: map['rejected'],
      total,
    };
  }

  // ── Référent — Invitations ────────────────────────────────────────────

  async getReferentInvitationStats(): Promise<ReferentInvitationStats> {
    const total = await this.invitationRepo.count();
    const sent = await this.invitationRepo.count({
      where: { status: InvitationStatus.SENT },
    });
    const submitted = await this.invitationRepo.count({
      where: { status: InvitationStatus.SUBMITTED },
    });

    const now = new Date();
    const expired = await this.invitationRepo
      .createQueryBuilder('inv')
      .where('inv.dueDate < :now', { now: now.toISOString().split('T')[0] })
      .andWhere('inv.status != :submitted', {
        submitted: InvitationStatus.SUBMITTED,
      })
      .getCount();

    return { total, sent, submitted, expired };
  }

  // ── Référent — Activité 30 jours ──────────────────────────────────────

  async getReferentActivity(): Promise<ActivityPoint[]> {
    const days = 30;
    const points: ActivityPoint[] = [];

    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];

      const [generated, approved, invitations] = await Promise.all([
        this.evalRepo
          .createQueryBuilder('te')
          .where('te.createdAt >= :start', { start: dateStr })
          .andWhere('te.createdAt < :end', { end: nextDateStr })
          .getCount(),

        this.evalRepo
          .createQueryBuilder('te')
          .where('te.updatedAt >= :start', { start: dateStr })
          .andWhere('te.updatedAt < :end', { end: nextDateStr })
          .andWhere('te.status = :status', { status: 'approved' })
          .getCount(),

        this.invitationRepo
          .createQueryBuilder('inv')
          .where('inv.sentAt >= :start', { start: dateStr })
          .andWhere('inv.sentAt < :end', { end: nextDateStr })
          .getCount(),
      ]);

      points.push({ date: dateStr, generated, approved, invitations });
    }

    return points;
  }

  async getPendingEvaluations(limit = 5): Promise<PendingEvaluation[]> {
    const results = await this.evalRepo
      .createQueryBuilder('te')
      .leftJoin('te.jobPost', 'jp')
      .select([
        'te.id',
        'te.title',
        'te.jobPostId',
        'te.status',
        'te.createdAt',
        'jp.title',
        'jp.company',
      ])
      .where('te.status IN (:...statuses)', {
        statuses: ['pending', 'completed'],
      })
      .orderBy('te.createdAt', 'ASC')
      .limit(limit)
      .getMany();

    return results.map((te) => ({
      id: te.id,
      title: te.title,
      jobPostId: te.jobPostId,
      jobPostTitle: te.jobPost?.title ?? null,
      company: te.jobPost?.company ?? null,
      status: te.status,
      createdAt: te.createdAt.toISOString(),
    }));
  }
  async getConsultantDomainStats(
    userId: number,
  ): Promise<ConsultantDomainStats> {
    const messages = await this.messageRepo
      .createQueryBuilder('m')
      .innerJoin('m.conversation', 'c')
      .select('m.content', 'content')
      .where('c.user_id = :userId', { userId })
      .andWhere('m.role = :role', { role: 'user' })
      .getRawMany<{ content: string }>();

    if (messages.length === 0) return { domains: [], total: 0 };

    const text = messages
      .map((m) => m.content)
      .join('\n')
      .substring(0, 3000);

    const prompt = `Analyse ces messages d'un consultant IT et extrait UNIQUEMENT les technologies, langages de programmation, frameworks, outils DevOps, bases de données, et plateformes cloud mentionnés.

RÈGLES STRICTES :
- Inclure : langages (Python, Java...), frameworks (React, NestJS...), outils (Docker, Git...), BDD (PostgreSQL...), cloud (AWS, Azure...), concepts techniques (DevOps, CI/CD...)
- Exclure ABSOLUMENT : sites web, noms de personnes, noms de cours, plateformes e-learning (Udemy, Coursera...), mots génériques (informatique, logiciel, système...)
- Le nom doit être le nom officiel exact de la technologie
- Score = nombre de fois mentionné × 10, plafonné à 100

Messages :
"${text}"

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans texte :
[{"domain":"Docker","score":80},{"domain":"Kubernetes","score":60}]`;

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0, // ← déterministe, pas de créativité
            messages: [
              {
                role: 'system',
                content:
                  "Tu es un extracteur de technologies IT. Tu réponds UNIQUEMENT avec du JSON valide, rien d'autre.",
              },
              { role: 'user', content: prompt },
            ],
          }),
        },
      );

      type GroqResponse = { choices: [{ message: { content: string } }] };
      const data = (await response.json()) as GroqResponse;
      const content = data.choices[0].message.content.trim();

      type RawDomain = { domain: string; score: number };
      const parsed = JSON.parse(content) as RawDomain[];

      // Validation côté code : score entre 1 et 100, domain non vide et pas trop long
      const domains: DomainStat[] = parsed
        .filter(
          (d): d is RawDomain =>
            typeof d.domain === 'string' &&
            d.domain.trim().length > 0 &&
            d.domain.trim().length <= 30 && // ← exclut les phrases
            typeof d.score === 'number' &&
            d.score > 0 &&
            d.score <= 100 &&
            !d.domain.includes('.com') && // ← exclut les URLs
            !d.domain.includes('www') &&
            !/^\d+$/.test(d.domain), // ← exclut les nombres seuls
        )
        .map((d) => ({
          domain: d.domain.trim(),
          count: Math.min(Math.round(d.score), 100),
          countLastWeek: 0,
          countPreviousWeek: 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const total = domains.reduce((acc, d) => acc + d.count, 0);
      return { domains, total };
    } catch {
      return { domains: [], total: 0 };
    }
  }
  async getConsultantStats(userId: number): Promise<ConsultantStats> {
    const totalConversations = await this.conversationRepo
      .createQueryBuilder('c')
      .where('c.user_id = :userId', { userId })
      .getCount();

    const totalMessages = await this.messageRepo
      .createQueryBuilder('m')
      .innerJoin('m.conversation', 'c')
      .where('c.user_id = :userId', { userId })
      .andWhere('m.role = :role', { role: 'user' })
      .getCount();

    const memoryCount = await this.userMemoryRepo
      .createQueryBuilder('um')
      .where('um.user_id = :userId', { userId })
      .andWhere('um.summary IS NOT NULL')
      .getCount();

    return {
      totalConversations,
      totalMessages,
      hasMemory: memoryCount > 0,
    };
  }

  async getConsultantActivity(
    userId: number,
  ): Promise<ConsultantActivityPoint[]> {
    const days = 30;
    const now = new Date();

    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      return { dateStr, nextDateStr };
    });

    const results = await Promise.all(
      dates.map(async ({ dateStr, nextDateStr }) => {
        const [sessions, messages] = await Promise.all([
          this.conversationRepo
            .createQueryBuilder('c')
            .where('c.user_id = :userId', { userId })
            .andWhere('c.created_at >= :start', { start: dateStr })
            .andWhere('c.created_at < :end', { end: nextDateStr })
            .getCount(),
          this.messageRepo
            .createQueryBuilder('m')
            .innerJoin('m.conversation', 'c')
            .where('c.user_id = :userId', { userId })
            .andWhere('m.role = :role', { role: 'user' })
            .andWhere('m.created_at >= :start', { start: dateStr })
            .andWhere('m.created_at < :end', { end: nextDateStr })
            .getCount(),
        ]);
        return { date: dateStr, sessions, messages };
      }),
    );

    return results;
  }

  async getConsultantHourlyActivity(
    userId: number,
  ): Promise<ConsultantHourlyPoint[]> {
    const results = await this.messageRepo
      .createQueryBuilder('m')
      .innerJoin('m.conversation', 'c')
      .select('EXTRACT(HOUR FROM m.created_at)::int', 'hour')
      .addSelect('COUNT(*)::int', 'count')
      .where('c.user_id = :userId', { userId })
      .andWhere('m.role = :role', { role: 'user' })
      .groupBy('EXTRACT(HOUR FROM m.created_at)::int')
      .orderBy('hour', 'ASC')
      .getRawMany<{ hour: number; count: number }>();

    const map: Record<number, number> = {};
    results.forEach((r) => {
      map[r.hour] = r.count;
    });

    return Array.from(
      { length: 24 },
      (_, i): ConsultantHourlyPoint => ({
        hour: i,
        count: map[i] ?? 0,
      }),
    );
  }

  async getRecentConversations(
    userId: number,
    limit = 5,
  ): Promise<RecentConversation[]> {
    const results = await this.conversationRepo
      .createQueryBuilder('c')
      .leftJoin('c.messages', 'm')
      .select('c.id', 'c_id')
      .addSelect('c.title', 'c_title')
      .addSelect('c.updated_at', 'c_updated_at')
      .addSelect('COUNT(m.id)', 'messageCount')
      .where('c.user_id = :userId', { userId })
      .groupBy('c.id')
      .addGroupBy('c.title')
      .addGroupBy('c.updated_at')
      .orderBy('c.updated_at', 'DESC')
      .limit(limit)
      .getRawMany<{
        c_id: string;
        c_title: string;
        c_updated_at: string;
        messageCount: string;
      }>();

    return results.map(
      (r): RecentConversation => ({
        id: r.c_id,
        title: r.c_title,
        updatedAt: new Date(r.c_updated_at).toISOString(),
        messageCount: parseInt(r.messageCount, 10),
      }),
    );
  }


  async countJobPostsByJobStatus(): Promise<Record<string, number>> {
  const results = await this.jobPostRepo
    .createQueryBuilder('jp')
    .select('jp.jobStatus', 'jobStatus')
    .addSelect('COUNT(*)', 'count')
    .groupBy('jp.jobStatus')
    .getRawMany<{ jobStatus: string | null; count: string }>();

  const map: Record<string, number> = {
    open: 0,
    closed_with_hire: 0,
    closed_without_hire: 0,
    none: 0,
  };
  results.forEach((r) => {
    const key = r.jobStatus ?? 'none';
    map[key] = parseInt(r.count, 10);
  });
  return map;
}
}
