import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { JobOfferMapper } from '../mappers/job-offer.mapper';
import {
  JobOffer,
  GenerateJobOfferRequest,
  UpdateJobOfferRequest,
  JobOfferApiResponse,
  DeleteJobOfferResponse,
} from '../models/job-offer.model';

@Injectable({ providedIn: 'root' })
export class JobOfferService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/job-offers`;

  // ── POST /job-offers/generate ─────────────────────────────
  generate(dto: GenerateJobOfferRequest): Observable<JobOffer> {
    return this.http
      .post<JobOfferApiResponse>(`${this.base}/generate`, dto)
      .pipe(map((r) => JobOfferMapper.fromApi(r)));
  }

  // ── GET /job-offers ───────────────────────────────────────
  findAll(): Observable<JobOffer[]> {
    return this.http
      .get<JobOfferApiResponse[]>(this.base)
      .pipe(map((r) => JobOfferMapper.fromApiList(r)));
  }

  // ── GET /job-offers/:id ───────────────────────────────────
  findOne(id: string): Observable<JobOffer> {
    return this.http
      .get<JobOfferApiResponse>(`${this.base}/${id}`)
      .pipe(map((r) => JobOfferMapper.fromApi(r)));
  }

  // ── PATCH /job-offers/:id ─────────────────────────────────
  update(id: string, dto: UpdateJobOfferRequest): Observable<JobOffer> {
    return this.http
      .patch<JobOfferApiResponse>(`${this.base}/${id}`, dto)
      .pipe(map((r) => JobOfferMapper.fromApi(r)));
  }

  // ── DELETE /job-offers/:id ────────────────────────────────
  delete(id: string): Observable<DeleteJobOfferResponse> {
    return this.http.delete<DeleteJobOfferResponse>(`${this.base}/${id}`);
  }

  generateFromJobPost(jobPostIds: number[]): Observable<JobOffer[]> {
    return this.http
      .post<JobOfferApiResponse[]>(`${this.base}/generate-from-job-post`, { jobPostIds })
      .pipe(map((r) => JobOfferMapper.fromApiList(r)));
  }
}
