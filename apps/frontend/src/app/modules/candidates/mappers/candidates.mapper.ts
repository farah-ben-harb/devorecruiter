import { PostApiResponse, UploadedFile } from '@app/modules/job-posts/models/job-post.model';
import {
  CandidateRaw,
  ResumeListItem,
  ScoredJobPost,
  ScoringResult,
  TriggerScoringResponse,
} from '../models/candidate.model';

export function mapCandidateRawToResumeListItems(data: CandidateRaw): ResumeListItem[] {
  const missingFields = !data.githubUsername || !data.email;

  if (data.unifieDriveId && data.unifieDriveName) {
    return [
      {
        id: data.id,
        name: data.unifieDriveName,
        driveLink: data.unifieDriveLink ?? '',
        driveId: data.unifieDriveId,
        type: 'unifie',
        createdAt: data.createdAt,
        status: 'done',
        hasUnifie: true,
        brutDriveLink: data.brutDriveLink,
        email: data.email,
        githubUsername: data.githubUsername,
        hasMissingFields: missingFields,
      },
    ];
  }

  if (data.brutDriveId) {
    return [
      {
        id: data.id,
        name: data.brutDriveName || 'Sans nom',
        driveLink: data.brutDriveLink ?? '',
        driveId: data.brutDriveId,
        type: 'brut',
        createdAt: data.createdAt,
        status: data.status,
        hasUnifie: false,
        email: data.email,
        githubUsername: data.githubUsername,
        hasMissingFields: false,
      },
    ];
  }

  return [];
}

export function mapScoredJobPost(raw: ScoredJobPost): ScoredJobPost {
  return {
    fileId: raw.fileId ?? '',
    fileName: raw.fileName ?? 'Sans nom',
    jobTitle: raw.jobTitle ?? 'Poste inconnu',
    scoreGlobal: raw.scoreGlobal ?? 0,
    status: raw.status ?? 'NO_MATCH',
    createdAt: raw.createdAt ?? '',
    detail: {
      scoreGlobal: raw.detail?.scoreGlobal ?? 0,
      recommendation: raw.detail?.recommendation ?? 'REJECTED',
      resume: raw.detail?.resume ?? '',
      strengths: raw.detail?.strengths ?? [],
      weaknesses: raw.detail?.weaknesses ?? [],
      technicalSkills: {
        score: raw.detail?.technicalSkills?.score ?? 0,
        detail: raw.detail?.technicalSkills?.detail ?? '',
      },
      experience: {
        score: raw.detail?.experience?.score ?? 0,
        detail: raw.detail?.experience?.detail ?? '',
      },
      education: {
        score: raw.detail?.education?.score ?? 0,
        detail: raw.detail?.education?.detail ?? '',
      },
      softSkills: {
        score: raw.detail?.softSkills?.score ?? 0,
        detail: raw.detail?.softSkills?.detail ?? '',
      },
      languages: {
        score: raw.detail?.languages?.score ?? 0,
        detail: raw.detail?.languages?.detail ?? '',
      },
    },
  };
}

export function mapScoringResult(raw: ScoringResult): ScoringResult {
  return {
    ...raw,
    totalMatch: raw.totalMatch ?? 0,
    matches: raw.matches ? raw.matches.map(mapScoredJobPost) : null,
  };
}

export function mapTriggerResponseToScoringResult(
  candidateId: string,
  res: TriggerScoringResponse,
): ScoringResult {
  return {
    id: res.scoringId,
    candidateId,
    status: 'done',
    totalMatch: res.totalMatch ?? 0,
    matches: res.matches ? res.matches.map(mapScoredJobPost) : null,
    createdAt: res.completedAt ?? '',
    completedAt: res.completedAt ?? null,
  };
}

// job-posts.mapper.ts — ajouter cette fonction
export function mapPostApiResponseToUploadedFile(data: PostApiResponse): UploadedFile {
  return {
    id: data.id?.toString(),
    name: data.name ?? 'Sans nom',
    type: data.type ?? 'application/vnd.google-apps.document',
    isDriveFile: true,
    isLoading: false,
    url: data.url ?? '',
    googleDocId: data.googleDocId ?? data.generatedDocId ?? data.document_id,
    driveFileId: data.googleDriveFileId,
    status: data.status ?? 'raw',
    unifiedUrl: data.unifiedUrl,
    company: data.company,
    startDate: data.startDate,
    title: data.title,
    hasEvaluation: data.hasEvaluation ?? false,
    requiresCoding: data.requiresCoding ?? null,
    hasQcm: data.hasQcm ?? null,
    jobStatus: null,
    linkedCandidateIds: [],
  };
}
