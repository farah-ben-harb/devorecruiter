import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { TechnicalEvaluationService } from './technical-evaluation.service';
import {
  TechnicalEvaluation,
  RegenerateDto,
} from '../../models/technical-evaluation/technical-evaluation.model';
import { environment } from '../../../../../environments/environment';
import { EditContentPayload } from '../../models/candidate-quiz-result/candidate-quiz-result.model';

// ─── BUILDER ───
const defaultTechnicalEvaluation = (
  overrides: Partial<TechnicalEvaluation> = {},
): TechnicalEvaluation => ({
  id: 1,
  jobPostId: 1,
  name: null, // ← ajouté
  title: 'Test Technique',
  status: 'pending',
  version: '1.0',
  index: 0,
  quizContent: null,
  quizAnswerKey: null,
  ...overrides,
});

// ─── MOCK HTTP ───
const createHttpClientMock = () => ({
  get: vi.fn<(url: string, options?: object) => Observable<unknown>>(),
  post: vi.fn<(url: string, body: unknown) => Observable<unknown>>(),
  delete: vi.fn<(url: string) => Observable<unknown>>(),
  patch: vi.fn<(url: string, body: unknown) => Observable<unknown>>(),
});

describe('TechnicalEvaluationService', () => {
  let service: TechnicalEvaluationService;
  let httpMock: ReturnType<typeof createHttpClientMock>;
  const baseUrl = `${environment.apiUrl}/technical-evaluations`; // ← UTILISE ÇA

  beforeEach(() => {
    httpMock = createHttpClientMock();

    TestBed.configureTestingModule({
      providers: [TechnicalEvaluationService, { provide: HttpClient, useValue: httpMock }],
    });

    service = TestBed.inject(TechnicalEvaluationService);
  });

  describe('generate', () => {
    it('appelle POST /generate avec jobPostId et mode', () => {
      const response = defaultTechnicalEvaluation();
      httpMock.post.mockReturnValue(of(response));

      service.generate(42, 'coding').subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.post).toHaveBeenCalledWith(`${baseUrl}/generate`, {
        jobPostId: 42,
        mode: 'coding',
      });
    });
  });

  describe('regenerate', () => {
    it('appelle POST /regenerate avec le dto', () => {
      const dto: RegenerateDto = { jobPostId: 1, evaluationId: 2, prompt: 'Corrige le test' };
      const response = defaultTechnicalEvaluation();
      httpMock.post.mockReturnValue(of(response));

      service.regenerate(dto).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.post).toHaveBeenCalledWith(`${baseUrl}/regenerate`, dto);
    });
  });

  describe('findAll', () => {
    it('appelle GET / avec jobPostId en param', () => {
      const response = [defaultTechnicalEvaluation()];
      httpMock.get.mockReturnValue(of(response));

      service.findAll(1).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.get).toHaveBeenCalledWith(baseUrl, { params: { jobPostId: 1 } });
    });
  });

  describe('findByJobPost', () => {
    it('appelle GET /by-job-post avec jobPostId en param', () => {
      const response = [defaultTechnicalEvaluation()];
      httpMock.get.mockReturnValue(of(response));

      service.findByJobPost(1).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.get).toHaveBeenCalledWith(`${baseUrl}/by-job-post`, {
        params: { jobPostId: 1 },
      });
    });
  });

  describe('delete', () => {
    it('appelle DELETE /:id', () => {
      httpMock.delete.mockReturnValue(of(undefined));

      service.delete(1).subscribe();

      expect(httpMock.delete).toHaveBeenCalledWith(`${baseUrl}/1`);
    });
  });

  describe('approve', () => {
    it('appelle PATCH /:id/approve avec status approved', () => {
      const response = defaultTechnicalEvaluation({ status: 'approved' });
      httpMock.patch.mockReturnValue(of(response));

      service.approve(1, 'approved').subscribe((result) => {
        expect(result.status).toBe('approved');
      });

      expect(httpMock.patch).toHaveBeenCalledWith(`${baseUrl}/1/approve`, { status: 'approved' });
    });

    it('appelle PATCH /:id/approve avec status rejected', () => {
      const response = defaultTechnicalEvaluation({ status: 'rejected' });
      httpMock.patch.mockReturnValue(of(response));

      service.approve(1, 'rejected').subscribe((result) => {
        expect(result.status).toBe('rejected');
      });

      expect(httpMock.patch).toHaveBeenCalledWith(`${baseUrl}/1/approve`, { status: 'rejected' });
    });
  });

  describe('updateContent', () => {
    it('appelle PATCH /:id/content avec payload', () => {
      const payload: EditContentPayload = {
        htmlContent: '<p>Nouveau contenu</p>',
        changeType: 'major',
        isQuiz: false,
      };
      const response = defaultTechnicalEvaluation();
      httpMock.patch.mockReturnValue(of(response));

      service.updateContent(1, payload).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.patch).toHaveBeenCalledWith(`${baseUrl}/1/content`, payload);
    });
  });

  describe('createGitRepo', () => {
    it('appelle POST /:id/git-repo', () => {
      const response = defaultTechnicalEvaluation();
      httpMock.post.mockReturnValue(of(response));

      service.createGitRepo(1).subscribe((result) => {
        expect(result).toEqual(response);
      });

      expect(httpMock.post).toHaveBeenCalledWith(`${baseUrl}/1/git-repo`, {});
    });
  });
});
