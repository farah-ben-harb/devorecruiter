import { describe, it, expect } from 'vitest';
import type {
  UploadedFile,
  DriveFile,
  PaginatedResponse,
  ModalConfig,
  Toast,
  JobPostRow,
  ScoringResume,
} from './job-post.model';

describe('job-post.model types', () => {
  it('UploadedFile accepte les valeurs minimales requises', () => {
    const file: UploadedFile = {
      name: 'offre.pdf',
      type: 'application/pdf',
      url: 'https://example.com/offre.pdf',
      isDriveFile: false,
      status: 'raw',
      isLoading: false,
    };
    expect(file.name).toBe('offre.pdf');
    expect(file.status).toBe('raw');
    expect(file.isLoading).toBe(false);
  });

  it('UploadedFile accepte tous les statuts JobPostStatus', () => {
    const statuses: UploadedFile['status'][] = ['raw', 'processing', 'unified', 'error'];
    expect(statuses).toHaveLength(4);
  });

  it('DriveFile contient id, name et mimeType', () => {
    const file: DriveFile = { id: 'drive-1', name: 'CV.pdf', mimeType: 'application/pdf' };
    expect(file.id).toBe('drive-1');
    expect(file.mimeType).toBe('application/pdf');
  });

  it('PaginatedResponse accepte un tableau de données', () => {
    const response: PaginatedResponse<DriveFile> = {
      data: [{ id: 'f1', name: 'CV.pdf', mimeType: 'application/pdf' }],
      total: 1,
      totalPages: 1,
    };
    expect(response.data).toHaveLength(1);
  });

  it('ModalConfig accepte les quatre types', () => {
    const types: ModalConfig['type'][] = ['info', 'success', 'error', 'warning'];
    expect(types).toHaveLength(4);
  });

  it('Toast contient message, type et visible', () => {
    const toast: Toast = { message: 'Succès', type: 'success', visible: true };
    expect(toast.visible).toBe(true);
    expect(toast.type).toBe('success');
  });

  it('JobPostRow accepte un unified null', () => {
    const row: JobPostRow = {
      raw: {
        name: 'offre.pdf',
        type: 'application/pdf',
        url: '',
        isDriveFile: false,
        status: 'raw',
        isLoading: false,
      },
      unified: null,
    };
    expect(row.unified).toBeNull();
  });

  it('ScoringResume accepte email et githubUsername null', () => {
    const resume: ScoringResume = {
      id: 1,
      resumeFileId: 'file-1',
      resumeName: 'CV.pdf',
      jobPostId: 10,
      jobPostGoogleDriveFileId: 'drive-1',
      scoreGlobal: 75,
      email: null,
      githubUsername: null,
      hasMissingFields: true,
      criteria: {
        technicalSkills: { score: 80, detail: 'Bon' },
        experience: { score: 70, detail: 'Correct' },
        education: { score: 85, detail: 'Solide' },
        softSkills: { score: 90, detail: 'Excellent' },
        languages: { score: 75, detail: 'Bilingue' },
      },
      strengths: ['Communication'],
      weaknesses: ['Expérience limitée'],
      resume: 'Bon profil',
      recommendation: 'ACCEPTED',
      status: 'done',
      createdAt: '2024-01-15T10:00:00Z',
    };
    expect(resume.email).toBeNull();
    expect(resume.githubUsername).toBeNull();
    expect(resume.hasMissingFields).toBe(true);
  });
});
