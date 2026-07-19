import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { GlobalCriteriaService } from './global-criterias.service';
import { environment } from '@env/environment';
import { GlobalCriteria } from '../models/job-post.model';

const buildCriteria = (overrides: Partial<GlobalCriteria> = {}): GlobalCriteria => ({
  id: 1,
  label: 'TypeScript',
  description: null,
  category: 'technique',
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('GlobalCriteriaService', () => {
  let service: GlobalCriteriaService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/global-criteria`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GlobalCriteriaService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(GlobalCriteriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAll', () => {
    it('envoie une requête GET vers apiUrl', () => {
      const criteria = [buildCriteria({ id: 1 }), buildCriteria({ id: 2 })];
      let result: GlobalCriteria[] | undefined;

      service.getAll().subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');

      req.flush(criteria);

      expect(result).toEqual(criteria);
    });
  });

  describe('getAllSync', () => {
    it('résout la promesse avec les données retournées par getAll', async () => {
      const criteria = [buildCriteria()];

      const promise = service.getAllSync();

      const req = httpMock.expectOne(apiUrl);
      req.flush(criteria);

      await expect(promise).resolves.toEqual(criteria);
    });
  });

  describe('create', () => {
    it('envoie une requête POST avec le payload', () => {
      const payload = { label: 'React', description: 'Framework JS', category: 'technique' };
      const created = buildCriteria({ id: 5, ...payload });
      let result: GlobalCriteria | undefined;

      service.create(payload).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);

      req.flush(created);

      expect(result).toEqual(created);
    });

    it('accepte un payload minimal avec seulement label', () => {
      const payload = { label: 'Docker' };
      const created = buildCriteria({ id: 6, label: 'Docker', description: null, category: null });

      service.create(payload).subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(payload);

      req.flush(created);
    });
  });

  describe('update', () => {
    it('envoie une requête PATCH vers apiUrl/:id avec le payload', () => {
      const payload = { label: 'React 19' };
      const updated = buildCriteria({ id: 3, label: 'React 19' });
      let result: GlobalCriteria | undefined;

      service.update(3, payload).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${apiUrl}/3`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(payload);

      req.flush(updated);

      expect(result).toEqual(updated);
    });

    it('accepte un payload partiel avec plusieurs champs', () => {
      const payload = { label: 'Modifié', category: 'langue', order: 2 };
      const updated = buildCriteria({ id: 7, ...payload });

      service.update(7, payload).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/7`);
      expect(req.request.body).toEqual(payload);

      req.flush(updated);
    });
  });

  describe('remove', () => {
    it('envoie une requête DELETE vers apiUrl/:id', () => {
      let result: { message: string } | undefined;

      service.remove(4).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${apiUrl}/4`);
      expect(req.request.method).toBe('DELETE');

      req.flush({ message: 'Critère supprimé.' });

      expect(result).toEqual({ message: 'Critère supprimé.' });
    });
  });
});
