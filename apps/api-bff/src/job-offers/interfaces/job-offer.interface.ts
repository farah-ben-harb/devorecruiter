import { JobOffer } from "../entities/job-offer.entity";

export interface IAiJobOfferResponse {
  titre: string;
  accroche: string;
  format_linkedin: string;
  missions: string[];
  profil: string[];
  avantages: string[];
  hashtags: string[];
  mots_cles: string[];
}

// ── Contrat du repository ─────────────────────────────────────
export interface IJobOfferRepository {
  create(data: ICreateJobOfferData): Promise<JobOffer>;
  findAll(userId: number): Promise<JobOffer[]>;
  findOne(id: string, userId: number): Promise<JobOffer | null>;
  update(id: string, userId: number, data: IUpdateJobOfferData): Promise<JobOffer>;
  delete(id: string, userId: number): Promise<void>;
}

// ── Données internes de création ─────────────────────────────
export interface ICreateJobOfferData {
  promptLibre: string;
  titre: string;
  accroche: string;
  formatLinkedin: string;
  missions: string[];
  profil: string[];
  avantages: string[];
  hashtags: string[];
  motsCles: string[];
  userId: number;
  jobPostId?: number | null;
}

// ── Données internes de mise à jour ──────────────────────────
export interface IUpdateJobOfferData {
  titre?: string;
  accroche?: string;
  formatLinkedin?: string;
  missions?: string[];
  profil?: string[];
  avantages?: string[];
  hashtags?: string[];
  motsCles?: string[];
  isPublished?: boolean;
}