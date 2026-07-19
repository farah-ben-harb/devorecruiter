import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { CriteriaCategoryService } from './criteria-category.service';
import { environment } from '@env/environment';
import { CriteriaCategory } from '../models/job-post.model';

const buildCategory = (overrides: Partial<CriteriaCategory> = {}): CriteriaCategory => ({
  id: 1,
  value: 'technique',
  label: '🔧 Technique',
  order: 0,
  ...overrides,
});

describe('CriteriaCategoryService', () => {
  let service: CriteriaCategoryService;
  let httpMock: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/criteria-categories`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CriteriaCategoryService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(CriteriaCategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getAll', () => {
    it('envoie une requête GET vers apiUrl', () => {
      const categories = [buildCategory({ id: 1 }), buildCategory({ id: 2 })];
      let result: CriteriaCategory[] | undefined;

      service.getAll().subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');

      req.flush(categories);

      expect(result).toEqual(categories);
    });
  });

  describe('create', () => {
    it('envoie une requête POST avec le payload complet', () => {
      const payload = { value: 'langue', label: '🌍 Langues', order: 2 };
      const created = buildCategory({ id: 5, ...payload });
      let result: CriteriaCategory | undefined;

      service.create(payload).subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);

      req.flush(created);

      expect(result).toEqual(created);
    });

    it('accepte un payload sans order (optionnel)', () => {
      const payload = { value: 'autre', label: '📌 Autre' };
      const created = buildCategory({ id: 6, ...payload, order: 0 });

      service.create(payload).subscribe();

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.body).toEqual(payload);

      req.flush(created);
    });
  });

  describe('update', () => {
    it('envoie une requête PATCH vers apiUrl/:id avec le payload', () => {
      const payload = { label: 'Technique avancée' };
      const updated = buildCategory({ id: 3, label: 'Technique avancée' });
      let result: CriteriaCategory | undefined;

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
      const payload = { value: 'modifie', order: 5 };
      const updated = buildCategory({ id: 7, ...payload });

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

      req.flush({ message: 'Catégorie supprimée.' });

      expect(result).toEqual({ message: 'Catégorie supprimée.' });
    });
  });
});
