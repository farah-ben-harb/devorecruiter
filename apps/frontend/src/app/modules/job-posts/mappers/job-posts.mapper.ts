import { PostApiResponse, ScoringResume, UploadedFile } from '../models/job-post.model';
import { environment } from '@env/environment';

export function mapPostApiResponseToUploadedFile(data: PostApiResponse): UploadedFile {
  return {
    id: data.id?.toString(),
    name: data.name ?? 'Sans nom',
    type: data.type ?? `${environment.googleMimePrefix}.document`,
    isDriveFile: true,
    url: data.url ?? '',
    googleDocId: data.googleDocId ?? data.generatedDocId ?? data.document_id,
    driveFileId: data.googleDriveFileId,
    status: data.status ?? 'raw',
    unifiedUrl: data.unifiedUrl,
    company: data.company,
    startDate: data.startDate,
    isLoading: false,
    title: data.title,
    requiresCoding: data.requiresCoding ?? null,
    hasQcm: data.hasQcm ?? null,
    unifiedDocxId: data.unifiedDocxId ?? null,
    jobStatus: data.jobStatus ?? null,
    linkedCandidateIds: data.linkedCandidateIds ?? [],
  };
}

export function mapResumeEvaluationToDisplay(raw: ScoringResume): ScoringResume {
  return {
    ...raw,
    highlightedFileId: raw.highlightedFileId ?? null,
    resumeName: raw.resumeName ?? 'Sans nom',
    scoreGlobal: raw.scoreGlobal ?? 0,
    status: raw.status ?? 'REJECTED',
    recommendation: raw.recommendation ?? 'REJECTED',
    strengths: raw.strengths ?? [],
    weaknesses: raw.weaknesses ?? [],
    resume: raw.resume ?? '',
    criteria: {
      technicalSkills: {
        score: raw.criteria?.technicalSkills?.score ?? 0,
        detail: raw.criteria?.technicalSkills?.detail ?? '',
      },
      experience: {
        score: raw.criteria?.experience?.score ?? 0,
        detail: raw.criteria?.experience?.detail ?? '',
      },
      education: {
        score: raw.criteria?.education?.score ?? 0,
        detail: raw.criteria?.education?.detail ?? '',
      },
      softSkills: {
        score: raw.criteria?.softSkills?.score ?? 0,
        detail: raw.criteria?.softSkills?.detail ?? '',
      },
      languages: {
        score: raw.criteria?.languages?.score ?? 0,
        detail: raw.criteria?.languages?.detail ?? '',
      },
      ...(raw.criteria?.certifications
        ? {
            certifications: {
              score: raw.criteria.certifications.score ?? 0,
              detail: raw.criteria.certifications.detail ?? '',
              matched: raw.criteria.certifications.matched ?? [],
              missing: raw.criteria.certifications.missing ?? [],
            },
          }
        : {}),
    },
  };
}

export function sortScoringsByScore(scorings: ScoringResume[]): ScoringResume[] {
  return [...scorings].sort((a, b) => b.scoreGlobal - a.scoreGlobal);
}
