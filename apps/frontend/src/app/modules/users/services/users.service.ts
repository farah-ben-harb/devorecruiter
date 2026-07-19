import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AddUserDto, PaginatedResult, UpdateUserDto, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<PaginatedResult> {
    return this.http.get<PaginatedResult>(`${environment.apiUrl}/users?page=1&limit=9999`);
  }

  add(dto: AddUserDto): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users`, dto);
  }

  update(userId: number, dto: UpdateUserDto): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/users/${userId}`, dto);
  }

  updateActivation(userId: number, isActivated: boolean): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/users/${userId}/activate`, { isActivated });
  }

  delete(userId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/${userId}`);
  }
}
