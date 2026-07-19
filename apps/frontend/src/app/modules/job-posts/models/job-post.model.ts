export type JobPostStatus = 'raw' | 'processing' | 'unified' | 'error';

export interface UploadedFile {
  jobStatus?: JobPostActivityStatus;
  linkedCandidateIds?: string[];
  id?: string;
  name: string;
  displayName?: string;
  type: string;
  url: string;
  isDriveFile: boolean;
  googleDocId?: string;
  driveFileId?: string;
  status: JobPostStatus;
  unifiedUrl?: string;
  company?: string;
  startDate?: string;
  isLoading: boolean;
  title?: string;
  hasEvaluation?: boolean;
  requiresCoding?: boolean | null;
  hasQcm?: boolean | null;
  unifiedDocxId?: string | null;
}

export interface DuplicateJobPostPayload {
  title: string;
  company: string;
  hasQcm: boolean;
  requiresCoding: boolean;
}

// Même structure que DuplicateJobPostPayload — alias pour la clarté sémantique
export type EditJobPostPayload = DuplicateJobPostPayload;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export interface PostApiResponse {
  id?: number;
  name?: string;
  type?: string;
  unifiedDocxId?: string | null;
  url?: string;
  googleDocId?: string;
  generatedDocId?: string;
  document_id?: string;
  googleDriveFileId?: string;
  status?: JobPostStatus;
  unifiedUrl?: string;
  company?: string;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  evaluationsFolderId?: string | null;
  hasEvaluation?: boolean;
  requiresCoding?: boolean | null;
  hasQcm?: boolean | null;
  jobStatus?: 'open' | 'closed_with_hire' | 'closed_without_hire' | null;
  linkedCandidateIds?: string[];
}

export interface DownloadResponse {
  data: string;
  mimeType: string;
  fileName?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  totalPages?: number;
  meta?: {
    total: number;
    totalPages: number;
    totalAll?: number;
    totalUnified?: number;
    totalRaw?: number;
    totalWithEvaluation?: number;
  };
}

export interface ModalConfig {
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
  visible: boolean;
}

export interface JobPostRow {
  raw: UploadedFile;
  unified: UploadedFile | null;
}

export interface ResumeEvaluationCriteria {
  score: number;
  detail: string;
}

export interface ScoringResume {
  id: number;
  resumeFileId: string;
  resumeName: string;
  jobPostId: number;
  jobPostGoogleDriveFileId: string;
  scoreGlobal: number;
  highlightedFileId?: string | null;
  email?: string | null;
  githubUsername?: string | null;
  hasMissingFields?: boolean;
  isOutdated?: boolean;
  criteria: {
    technicalSkills: ResumeEvaluationCriteria;
    experience: ResumeEvaluationCriteria;
    education: ResumeEvaluationCriteria;
    softSkills: ResumeEvaluationCriteria;
    languages: ResumeEvaluationCriteria;
    certifications?: ResumeEvaluationCriteria & {
      matched: string[];
      missing: string[];
    };
  };
  strengths: string[];
  weaknesses: string[];
  resume: string;
  recommendation: string;
  status: string;
  createdAt: string;
}

export interface JobPostCriteria {
  id: number;
  jobPostId: number;
  intitulePoste: string | null;
  competencesTechniquesRequises: string[];
  competencesGeneralesRequises: string[];
  experienceMinimaleAnnees: number | null;
  formationRequise: string | null;
  languesRequises: string[];
  missionsPrincipales: string[];
  certificationsRequises: string[];
  source: 'n8n_unification' | 'standalone';
  sectionLabels: Record<string, string> | null;
  rawJson: Record<string, unknown> | null;
  createdAt: string;
  sections: CriteriaSection[] | null;
  updatedAt: string;
}

export interface CriteriaSection {
  key: string;
  label: string;
  items: string[];
}

export type JobPostActivityStatus = 'open' | 'closed_with_hire' | 'closed_without_hire' | null;

export interface CandidateSearchResult {
  id: string;
  name: string | null;
  firstName: string | null;
  email: string | null;
  unifieDriveName: string | null;
  unifieDriveLink: string | null;
}

export interface CriteriaSection {
  key: string;
  label: string;
  items: string[];
  fromGlobal?: boolean;
}

export interface EditEvalTypeResult {
  hasQcm: boolean;
  requiresCoding: boolean;
}

export interface EditJobStatusResult {
  jobStatus: JobPostActivityStatus;
  linkedCandidateIds: string[];
  linkedCandidates: CandidateSearchResult[];
}

export type ViewMode = 'list' | 'add' | 'edit';

export interface CriteriaForm {
  label: string;
  description: string;
  category: string;
}

export interface CriteriaCategory {
  id: number;
  value: string;
  label: string;
  order: number;
}

export interface GlobalCriteria {
  id: number;
  label: string;
  description: string | null;
  category: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalCriteriaPayload {
  label: string;
  description?: string;
  category?: string;
  order?: number;
}
