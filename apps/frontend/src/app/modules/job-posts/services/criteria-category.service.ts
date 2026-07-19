import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { CriteriaCategory } from '../models/job-post.model';

@Injectable({ providedIn: 'root' })
export class CriteriaCategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/criteria-categories`;

  getAll(): Observable<CriteriaCategory[]> {
    return this.http.get<CriteriaCategory[]>(this.apiUrl);
  }

  create(payload: { value: string; label: string; order?: number }): Observable<CriteriaCategory> {
    return this.http.post<CriteriaCategory>(this.apiUrl, payload);
  }

  update(
    id: number,
    payload: Partial<{ value: string; label: string; order: number }>,
  ): Observable<CriteriaCategory> {
    return this.http.patch<CriteriaCategory>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
