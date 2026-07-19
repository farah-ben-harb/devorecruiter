import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { CreateGlobalCriteriaPayload, GlobalCriteria } from '../models/job-post.model';

export type UpdateGlobalCriteriaPayload = Partial<CreateGlobalCriteriaPayload>;

@Injectable({ providedIn: 'root' })
export class GlobalCriteriaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/global-criteria`;

  getAll(): Observable<GlobalCriteria[]> {
    return this.http.get<GlobalCriteria[]>(this.apiUrl);
  }

  getAllSync(): Promise<GlobalCriteria[]> {
    return firstValueFrom(this.getAll());
  }

  create(payload: CreateGlobalCriteriaPayload): Observable<GlobalCriteria> {
    return this.http.post<GlobalCriteria>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateGlobalCriteriaPayload): Observable<GlobalCriteria> {
    return this.http.patch<GlobalCriteria>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
