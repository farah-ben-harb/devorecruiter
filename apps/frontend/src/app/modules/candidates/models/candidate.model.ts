export type {
  StatusType,
  DriveFile,
  ModalConfig,
  PaginatedResponse,
} from '@shared/models/shared.model';

export type ResumeStatus = 'pending' | 'processing' | 'done' | 'error';
export type ScoringStatus = 'pending' | 'running' | 'done' | 'error';

export const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Tous' },
  { value: 'brut' as const, label: 'CVs Bruts' },
  { value: 'unifie' as const, label: 'CVs Unifiés' },
];

export interface ResumeListItem {
  id: string;
  name: string;
  driveLink: string;
  driveId: string;
  type: 'brut' | 'unifie';
  createdAt: string;
  status: ResumeStatus;
  hasUnifie: boolean;
  brutDriveLink?: string;
  email?: string | null;
  githubUsername?: string | null;
  hasMissingFields?: boolean;
}

export interface CandidateRaw {
  id: string;
  brutDriveId: string;
  brutDriveName: string;
  brutDriveLink: string;
  unifieDriveId: string | null;
  unifieDriveName: string | null;
  unifieDriveLink: string | null;
  status: ResumeStatus;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  githubUsername: string | null;
}

export interface ScoreDimension {
  score: number;
  detail: string;
}

export interface ScoreDetail {
  scoreGlobal: number;
  technicalSkills: ScoreDimension;
  experience: ScoreDimension;
  education: ScoreDimension;
  softSkills: ScoreDimension;
  languages: ScoreDimension;
  strengths: string[];
  weaknesses: string[];
  resume: string;
  recommendation: string;
}

export interface ScoredJobPost {
  fileId: string;
  fileName: string;
  jobTitle: string;
  scoreGlobal: number;
  status: 'MATCH' | 'NO_MATCH';
  detail: ScoreDetail;
  createdAt: string;
}

export interface ScoringResult {
  id: string;
  candidateId: string;
  status: ScoringStatus;
  totalMatch: number;
  matches: ScoredJobPost[] | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TriggerScoringResponse {
  message: string;
  totalMatch: number;
  matches: ScoredJobPost[];
  scoringId: string;
  completedAt: string;
}
