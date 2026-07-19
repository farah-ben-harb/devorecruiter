// ── Modèle principal ─────────────────────────────────────────
export interface JobOffer {
  id: string;
  promptLibre: string;
  titre: string;
  accroche: string;
  formatLinkedin: string;
  missions: string[];
  profil: string[];
  avantages: string[];
  hashtags: string[];
  motsCles: string[];
  isPublished: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  jobPostId: number | null;
}

// ── DTOs ─────────────────────────────────────────────────────
export interface GenerateJobOfferRequest {
  promptLibre: string;
}

export interface UpdateJobOfferRequest {
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

// ── State ─────────────────────────────────────────────────────
export type JobOfferStatus = 'idle' | 'loading' | 'generating' | 'success' | 'error';

export interface JobOfferState {
  offers: JobOffer[];
  selectedOffer: JobOffer | null;
  status: JobOfferStatus;
  error: string | null;
  generateStatus: JobOfferStatus;
  generateError: string | null;
}

export const initialJobOfferState: JobOfferState = {
  offers: [],
  selectedOffer: null,
  status: 'idle',
  error: null,
  generateStatus: 'idle',
  generateError: null,
};

export interface JobOfferApiResponse {
  id: string;
  promptLibre: string;
  titre: string;
  accroche: string;
  formatLinkedin: string;
  missions: string[];
  profil: string[];
  avantages: string[];
  hashtags: string[];
  motsCles: string[];
  isPublished: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
  jobPostId: number | null;
}

export interface DeleteJobOfferResponse {
  message: string;
}
