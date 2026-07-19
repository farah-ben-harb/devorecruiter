import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  UserStats,
  JobPostStats,
  ResumeStats,
  EvaluationStats,
  ReferentEvaluationStats,
  ReferentInvitationStats,
  ActivityPoint,
  PendingEvaluation,
  ConsultantStats,
  ConsultantActivityPoint,
  ConsultantHourlyPoint,
  RecentConversation,
  ConsultantDomainStats,
} from '../models/dashboard.model';
import { DashboardMapper } from '../mappers/dashboard.mapper';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  constructor(private readonly http: HttpClient) {}

  getUserStats(): Observable<UserStats> {
    return this.http
      .get<UserStats>(`${this.baseUrl}/users`)
      .pipe(map((raw) => DashboardMapper.toUserStats(raw)));
  }

  getJobPostStats(): Observable<JobPostStats> {
    return this.http
      .get<JobPostStats>(`${this.baseUrl}/job-posts`)
      .pipe(map((raw) => DashboardMapper.toJobPostStats(raw)));
  }

  getResumeStats(): Observable<ResumeStats> {
    return this.http
      .get<ResumeStats>(`${this.baseUrl}/candidates`)
      .pipe(map((raw) => DashboardMapper.toResumeStats(raw)));
  }

  getEvaluationStats(): Observable<EvaluationStats> {
    return this.http
      .get<EvaluationStats>(`${this.baseUrl}/evaluations`)
      .pipe(map((raw) => DashboardMapper.toEvaluationStats(raw)));
  }

  getReferentEvaluationStats(): Observable<ReferentEvaluationStats> {
    return this.http.get<ReferentEvaluationStats>(`${this.baseUrl}/referent/evaluations`);
  }

  getReferentInvitationStats(): Observable<ReferentInvitationStats> {
    return this.http.get<ReferentInvitationStats>(`${this.baseUrl}/referent/invitations`);
  }

  getReferentActivity(): Observable<ActivityPoint[]> {
    return this.http.get<ActivityPoint[]>(`${this.baseUrl}/referent/activity`);
  }

  getPendingEvaluations(): Observable<PendingEvaluation[]> {
    return this.http.get<PendingEvaluation[]>(`${this.baseUrl}/referent/pending`);
  }
  getConsultantStats(): Observable<ConsultantStats> {
    return this.http.get<ConsultantStats>(`${this.baseUrl}/consultant/stats`);
  }

  getConsultantActivity(): Observable<ConsultantActivityPoint[]> {
    return this.http.get<ConsultantActivityPoint[]>(`${this.baseUrl}/consultant/activity`);
  }

  getConsultantHourlyActivity(): Observable<ConsultantHourlyPoint[]> {
    return this.http.get<ConsultantHourlyPoint[]>(`${this.baseUrl}/consultant/hourly`);
  }

  getRecentConversations(): Observable<RecentConversation[]> {
    return this.http.get<RecentConversation[]>(`${this.baseUrl}/consultant/recent`);
  }

  getConsultantDomainStats(): Observable<ConsultantDomainStats> {
    return this.http.get<ConsultantDomainStats>(`${this.baseUrl}/consultant/domains`);
  }
}
