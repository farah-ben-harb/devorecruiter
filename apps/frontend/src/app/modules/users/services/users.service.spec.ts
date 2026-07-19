import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { UsersService } from './users.service';
import { environment } from '@env/environment';
import { User, PaginatedResult, AddUserDto, UpdateUserDto } from '../models/user.model';

const mockUser: User = {
  id: 1,
  email: 'test@gmail.com',
  firstName: 'John',
  lastName: 'Doe',
  picture: '',
  roles: ['CONSULTANT'],
  isActivated: true,
  createdAt: '2024-01-01',
  lastLogin: '2024-01-02',
};

const mockPaginated: PaginatedResult = {
  data: [mockUser],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

describe('UsersService', () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsersService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── getAll ───────────────────────────────────────────────────────
  describe('getAll()', () => {
    it('should GET paginated users', () => {
      service.getAll().subscribe((result) => {
        expect(result.data.length).toBe(1);
        expect(result.meta.total).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users?page=1&limit=9999`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginated);
    });
  });

  // ── add ──────────────────────────────────────────────────────────
  describe('add()', () => {
    it('should POST a new user', () => {
      const dto: AddUserDto = {
        email: 'test@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['CONSULTANT'],
        isActivated: true,
      };

      service.add(dto).subscribe((user) => {
        expect(user.id).toBe(1);
        expect(user.email).toBe('test@gmail.com');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/users`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockUser);
    });
  });

  // ── update ───────────────────────────────────────────────────────
  describe('update()', () => {
    it('should PATCH user data', () => {
      const dto: UpdateUserDto = {
        email: 'test@gmail.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: ['TALENT_ACQUISITION'],
        isActivated: true,
      };

      service.update(1, dto).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/users/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      req.flush(mockUser);
    });
  });

  // ── updateActivation ─────────────────────────────────────────────
  describe('updateActivation()', () => {
    it('should PATCH user activation status', () => {
      service.updateActivation(1, false).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/users/1/activate`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ isActivated: false });
      req.flush(null);
    });
  });

  // ── delete ───────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should DELETE a user', () => {
      service.delete(1).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/users/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
