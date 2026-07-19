import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { CandidatesService } from './candidates.service';
import { CandidateRaw, ScoringResult, TriggerScoringResponse } from '../models/candidate.model';
import { PaginatedResponse } from '@shared/models/shared.model';

const mockCandidate: CandidateRaw = {
  id: 'cand-1',
  brutDriveId: 'drive-1',
  brutDriveName: 'CV_Test.pdf',
  brutDriveLink: 'https://drive.google.com/file/d/drive-1/view',
  unifieDriveId: null,
  unifieDriveName: null,
  unifieDriveLink: null,
  status: 'pending',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  email: null,
  githubUsername: null,
};

const mockScoringResult: ScoringResult = {
  id: 'scoring-1',
  candidateId: 'cand-1',
  status: 'done',
  totalMatch: 1,
  matches: [
    {
      fileId: 'file-1',
      fileName: 'Offre Dev.pdf',
      jobTitle: 'Développeur Frontend',
      scoreGlobal: 78,
      status: 'MATCH',
      createdAt: '2024-03-01T00:00:00Z',
      detail: {
        scoreGlobal: 78,
        recommendation: 'ACCEPTED',
        resume: 'Profil intéressant',
        strengths: ['Bonne communication'],
        weaknesses: ["Peu d'expérience"],
        technicalSkills: { score: 75, detail: 'Correct' },
        experience: { score: 70, detail: 'Junior' },
        education: { score: 85, detail: 'Bonne formation' },
        softSkills: { score: 80, detail: 'Bon esprit' },
        languages: { score: 80, detail: 'Bilingue' },
      },
    },
  ],
  createdAt: '2024-03-01T00:00:00Z',
  completedAt: null,
};

const mockTriggerResponse: TriggerScoringResponse = {
  message: 'Scoring terminé',
  scoringId: 'scoring-1',
  totalMatch: 1,
  matches: [],
  completedAt: '2024-03-01T00:00:00Z',
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface HttpMock {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

describe('CandidatesService', () => {
  let service: CandidatesService;
  let http: HttpMock;

  beforeEach(async () => {
    http = { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
        blob: () => Promise.resolve(new Blob(['content'], { type: 'application/pdf' })),
      }),
    );

    await TestBed.configureTestingModule({
      providers: [CandidatesService, { provide: HttpClient, useValue: http }],
    }).compileComponents();

    service = TestBed.inject(CandidatesService);
  });

  it('getAll appelle le bon endpoint avec page et limit', () => {
    const paginated: PaginatedResponse<CandidateRaw> = {
      data: [mockCandidate],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    http.get.mockReturnValue(of(paginated));

    service.getAll().subscribe((res) => {
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    expect(http.get).toHaveBeenCalledWith(expect.stringContaining('/candidates?page=1&limit=10'));
  });

  describe('uploadResume', () => {
    it('envoie un FormData au bon endpoint', () => {
      http.post.mockReturnValue(of(mockCandidate));
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      service.uploadResume(file, 'folder-123').subscribe((res) => {
        expect(res.id).toBe('cand-1');
      });

      expect(http.post).toHaveBeenCalledWith(
        expect.stringContaining('/candidates/upload?folderId=folder-123'),
        expect.any(FormData),
      );
    });
  });

  describe('deleteResume', () => {
    it('appelle le bon endpoint avec le type "brut"', () => {
      http.delete.mockReturnValue(of(void 0));
      service.deleteResume('cand-1', 'brut').subscribe();
      expect(http.delete).toHaveBeenCalledWith(expect.stringContaining('/candidates/cand-1'), {
        params: { type: 'brut' },
      });
    });

    it('fonctionne avec le type "unifie"', () => {
      http.delete.mockReturnValue(of(void 0));
      service.deleteResume('cand-1', 'unifie').subscribe();
      expect(http.delete).toHaveBeenCalledWith(expect.stringContaining('/candidates/cand-1'), {
        params: { type: 'unifie' },
      });
    });
  });

  describe('triggerUnification', () => {
    it('POST au bon endpoint', () => {
      http.post.mockReturnValue(of({ message: 'Unification lancée' }));
      service.triggerUnification('cand-1').subscribe((res) => {
        expect(res.message).toBe('Unification lancée');
      });
      expect(http.post).toHaveBeenCalledWith(
        expect.stringContaining('/candidates/cand-1/unify'),
        {},
      );
    });
  });

  describe('syncDrive', () => {
    it('POST au bon endpoint de synchronisation', () => {
      http.post.mockReturnValue(of({ added: 2, removed: 1 }));
      service.syncDrive().subscribe((res) => {
        expect(res.added).toBe(2);
        expect(res.removed).toBe(1);
      });
      expect(http.post).toHaveBeenCalledWith(expect.stringContaining('/candidates/sync-drive'), {});
    });
  });

  describe('getScoringResult', () => {
    it('GET au bon endpoint et retourne le résultat', () => {
      http.get.mockReturnValue(of(mockScoringResult));
      service.getScoringResult('cand-1').subscribe((res) => {
        expect(res).toEqual(mockScoringResult);
      });
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('/scoring-job-post/candidates/cand-1/results'),
      );
    });

    it('retourne null si aucun scoring trouvé', () => {
      http.get.mockReturnValue(of(null));
      service.getScoringResult('cand-1').subscribe((res) => {
        expect(res).toBeNull();
      });
    });
  });

  describe('triggerScoring', () => {
    it('POST au bon endpoint et retourne la réponse', () => {
      http.post.mockReturnValue(of(mockTriggerResponse));
      service.triggerScoring('cand-1').subscribe((res) => {
        expect(res).toEqual(mockTriggerResponse);
      });
      expect(http.post).toHaveBeenCalledWith(
        expect.stringContaining('/scoring-job-post/candidates/cand-1/trigger'),
        {},
      );
    });
  });

  describe('downloadJobPost', () => {
    it('GET au bon endpoint et retourne data + mimeType', () => {
      const mockResponse = { data: btoa('pdf-content'), mimeType: 'application/pdf' };
      http.get.mockReturnValue(of(mockResponse));
      service.downloadJobPost('file-123').subscribe((res) => {
        expect(res.data).toBe(mockResponse.data);
        expect(res.mimeType).toBe('application/pdf');
      });
      expect(http.get).toHaveBeenCalledWith(
        expect.stringContaining('/job-posts/download/file-123'),
      );
    });
  });

  describe('updateFields', () => {
    it('PATCH au bon endpoint avec les champs fournis', () => {
      const updatedCandidate: CandidateRaw = {
        ...mockCandidate,
        githubUsername: 'john-doe',
        email: 'john@example.com',
      };
      http.patch.mockReturnValue(of(updatedCandidate));
      service
        .updateFields('cand-1', { githubUsername: 'john-doe', email: 'john@example.com' })
        .subscribe((res) => {
          expect(res.githubUsername).toBe('john-doe');
          expect(res.email).toBe('john@example.com');
        });
      expect(http.patch).toHaveBeenCalledWith(
        expect.stringContaining('/candidates/cand-1/fields'),
        { githubUsername: 'john-doe', email: 'john@example.com' },
      );
    });
  });

  describe('listDriveFiles', () => {
    it('appelle le bon endpoint et retourne les fichiers', () => {
      const mockFiles: DriveFile[] = [{ id: 'f1', name: 'CV.pdf', mimeType: 'application/pdf' }];
      http.get.mockReturnValue(of(mockFiles));

      let result: DriveFile[] = [];
      service.listDriveFiles('folder-123').subscribe((r) => {
        result = r;
      });

      expect(result).toEqual(mockFiles);
    });

    it("lève une erreur si la réponse Drive n'est pas ok", async () => {
      http.get.mockReturnValue(throwError(() => new Error('Drive API error 403')));

      await expect(
        new Promise((_, reject) => {
          service.listDriveFiles('folder-123').subscribe({
            error: reject,
          });
        }),
      ).rejects.toThrow('Drive API error 403');
    });
  });
});
