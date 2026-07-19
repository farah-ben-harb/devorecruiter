import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { EvaluationInvitationsService } from './evaluation-invitations.service';
import {
  EvaluationInvitation,
  EvaluationInvitationSummary,
  SendEvaluationInvitationsPayload,
} from '../../models/evaluation-invitation/evaluation-invitation.model';

import { environment } from '@env/environment';

describe('EvaluationInvitationsService', () => {
  let service: EvaluationInvitationsService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/invitations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EvaluationInvitationsService],
    });

    service = TestBed.inject(EvaluationInvitationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ================= SEND =================
  it('should send invitations', () => {
    const payload: SendEvaluationInvitationsPayload = {
      scoringResumeIds: [1],
      unscoredResumeIds: ['resume1'],
      evaluationId: 1,
      dueDate: '2026-01-01',
      jobPostId: 10,
    };

    service.send(payload).subscribe((res) => {
      expect(res).toBeNull(); // ✅ correct
    });

    const req = httpMock.expectOne(`${baseUrl}/send`);
    expect(req.request.method).toBe('POST');

    req.flush(null);
  });

  // ================= GET BY CV =================
  it('should get invitations by CV', () => {
    const resumeFileId = 'resume123';

    const mockResponse: EvaluationInvitation[] = [
      {
        id: 1,
        jobPostId: 10,
        evaluationId: 1,
        candidateId: 'c1',
        sentAt: '2026-01-01',
        dueDate: '2026-01-10',
      },
    ];

    service.getByResume(resumeFileId).subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/by-resume/${resumeFileId}`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  // ================= GET BY JOB POST =================
  it('should get invitations by job post', () => {
    const jobPostId = 5;

    const mockResponse: EvaluationInvitationSummary[] = [
      {
        evaluationId: 1,
        candidateResumeFileId: 'resume1',
      },
    ];

    service.getByJobPost(jobPostId).subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/by-job-post/${jobPostId}`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  // ================= DELETE =================
  it('should delete invitation', () => {
    const invitationId = 10;

    service.delete(invitationId).subscribe((res) => {
      expect(res).toBeNull(); // ❗ FIX ICI
    });

    const req = httpMock.expectOne(`${baseUrl}/${invitationId}`);
    expect(req.request.method).toBe('DELETE');

    req.flush(null);
  });

  // ================= GET BY EVALUATION =================
  it('should get invitations by evaluation', () => {
    const evaluationId = 3;

    const mockResponse: EvaluationInvitation[] = [
      {
        id: 1,
        jobPostId: 10,
        evaluationId: 1,
        candidateId: 'c1',
        sentAt: '2026-01-01',
        dueDate: '2026-01-10',
      },
    ];

    service.getByEvaluation(evaluationId).subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne(`${baseUrl}/by-evaluation/${evaluationId}`);
    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

  // ================= ERROR HANDLING =================
  it('should handle HTTP error', () => {
    service.getByEvaluation(1).subscribe({
      next: () => {
        throw new Error('should have failed');
      },
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/by-evaluation/1`);
    req.flush('error', { status: 500, statusText: 'Server Error' });
  });
});
