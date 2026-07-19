import { ResumeEvaluation } from '../entities/resume-evaluation.entity';

export interface IResumeEvaluationRepository {
  create(data: Partial<ResumeEvaluation>): Promise<ResumeEvaluation>;
  findByJobPost(jobPostId: number): Promise<ResumeEvaluation[]>;
  findById(id: number): Promise<ResumeEvaluation>;
  findByResumeAndJobPost(
    resumeFileId: string,
    jobPostId: number,
  ): Promise<ResumeEvaluation | null>;
  deleteById(id: number): Promise<void>;
  update(
    id: number,
    data: Partial<ResumeEvaluation>,
  ): Promise<ResumeEvaluation>;
}

export interface N8nScoringResumeResult {
  scoreGlobal: number;
  technicalSkills?: { score: number; detail: string };
  experience?: { score: number; detail: string };
  education?: { score: number; detail: string };
  softSkills?: { score: number; detail: string };
  languages?: { score: number; detail: string };
  certifications?: { score: number; detail: string; matched: string[]; missing: string[] };
  strengths?: string[];
  weaknesses?: string[];
  resume?: string;
  recommendation?: string;
}

export interface N8nResumeMatch {
  fileId: string;
  fileName?: string;
  termsToHighlight?: string[];
  detail?: N8nScoringResumeResult;
}

export interface N8nWebhookResponse {
  matches?: N8nResumeMatch[];
}
