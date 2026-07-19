import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CandidateCodeEvaluation } from '../../models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateCodeEvaluationService } from './candidate-code-evaluation.service';

describe('CandidateCodeEvaluationService', () => {
  let service: CandidateCodeEvaluationService;
  let httpMock: HttpTestingController;

  const baseUrl = '/api/technical-evaluations/candidate-code';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CandidateCodeEvaluationService],
    });

    service = TestBed.inject(CandidateCodeEvaluationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // vérifie qu'il ne reste aucune requête en attente
  });

  // ================= evaluate =================
  describe('evaluate()', () => {
    it('should call POST and return evaluation', () => {
      const mockResponse = { id: 1, invitationId: 10 } as CandidateCodeEvaluation;

      service.evaluate(10).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/10/evaluate`);

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush(mockResponse);
    });
  });

  // ================= getByInvitation =================
  describe('getByInvitation()', () => {
    it('should return evaluation when API succeeds', () => {
      const mockResponse = { id: 1, invitationId: 10 } as CandidateCodeEvaluation;

      service.getByInvitation(10).subscribe((res) => {
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/invitation/10`);

      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });

    it('should return null when API fails', () => {
      service.getByInvitation(10).subscribe((res) => {
        expect(res).toBeNull();
      });

      const req = httpMock.expectOne(`${baseUrl}/invitation/10`);

      req.error(new ErrorEvent('Network error'));
    });
  });

  // ================= getByEvaluation =================
  describe('getByEvaluation()', () => {
    it('should return list of evaluations', () => {
      const mockResponse: CandidateCodeEvaluation[] = [
        { invitationId: 1 } as CandidateCodeEvaluation,
        { invitationId: 2 } as CandidateCodeEvaluation,
      ];

      service.getByEvaluation(5).subscribe((res) => {
        expect(res.length).toBe(2);
        expect(res).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/by-evaluation/5`);

      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);
    });
  });
});
