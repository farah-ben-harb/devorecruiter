import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CriteriaCategoryManagerComponent } from './criteria-category-manager.component';
import { CriteriaCategoryService } from '../../services/criteria-category.service';
import { CriteriaCategory } from '../../models/job-post.model';

type CriteriaCategoryServiceMock = Pick<
  CriteriaCategoryService,
  'getAll' | 'create' | 'update' | 'remove'
>;

const buildCategory = (overrides: Partial<CriteriaCategory> = {}): CriteriaCategory => ({
  id: 1,
  value: 'technique',
  label: '🔧 Technique',
  order: 0,
  ...overrides,
});

describe('CriteriaCategoryManagerComponent', () => {
  let component: CriteriaCategoryManagerComponent;
  let serviceMock: CriteriaCategoryServiceMock;

  beforeEach(() => {
    serviceMock = {
      getAll: vi.fn().mockReturnValue(of([])),
      create: vi.fn().mockReturnValue(of(buildCategory())),
      update: vi.fn().mockReturnValue(of(buildCategory())),
      remove: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };

    TestBed.configureTestingModule({
      imports: [CriteriaCategoryManagerComponent],
      providers: [{ provide: CriteriaCategoryService, useValue: serviceMock }],
    });

    const fixture = TestBed.createComponent(CriteriaCategoryManagerComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit / load', () => {
    it('charge les catégories avec succès', () => {
      serviceMock.getAll = vi
        .fn()
        .mockReturnValue(of([buildCategory({ id: 1 }), buildCategory({ id: 2 })]));

      component.ngOnInit();

      expect(component.categories()).toHaveLength(2);
      expect(component.loading()).toBe(false);
    });

    it('arrête le chargement en cas d’échec', () => {
      serviceMock.getAll = vi.fn().mockReturnValue(throwError(() => new Error('network error')));

      component.ngOnInit();

      expect(component.loading()).toBe(false);
      expect(component.categories()).toEqual([]);
    });
  });

  describe('navigation entre vues', () => {
    it('openAdd réinitialise le formulaire et passe en mode add', () => {
      component.formValue.set('ancien');
      component.formLabel.set('Ancien');

      component.openAdd();

      expect(component.viewMode()).toBe('add');
      expect(component.editingItem()).toBeNull();
      expect(component.formValue()).toBe('');
      expect(component.formLabel()).toBe('');
    });

    it('openEdit pré-remplit le formulaire et passe en mode edit', () => {
      const cat = buildCategory({ value: 'langue', label: '🌍 Langues' });

      component.openEdit(cat);

      expect(component.viewMode()).toBe('edit');
      expect(component.editingItem()).toEqual(cat);
      expect(component.formValue()).toBe('langue');
      expect(component.formLabel()).toBe('🌍 Langues');
    });

    it('backToList réinitialise l’état d’édition', () => {
      component.viewMode.set('edit');
      component.editingItem.set(buildCategory());
      component.errorMsg.set('Erreur');

      component.backToList();

      expect(component.viewMode()).toBe('list');
      expect(component.editingItem()).toBeNull();
      expect(component.errorMsg()).toBeNull();
    });
  });

  describe('save', () => {
    it('affiche une erreur si value ou label est vide', () => {
      component.formValue.set('   ');
      component.formLabel.set('Technique');

      component.save();

      expect(component.errorMsg()).toBe('Le slug et le libellé sont obligatoires.');
      expect(serviceMock.create).not.toHaveBeenCalled();
    });

    it('appelle create en mode ajout avec value et label trimés', () => {
      component.formValue.set('  technique  ');
      component.formLabel.set('  Technique  ');

      component.save();

      expect(serviceMock.create).toHaveBeenCalledWith({ value: 'technique', label: 'Technique' });
    });

    it('ajoute la catégorie créée à la liste et revient à la liste', () => {
      const created = buildCategory({ id: 5, value: 'nouvelle' });
      serviceMock.create = vi.fn().mockReturnValue(of(created));
      component.formValue.set('nouvelle');
      component.formLabel.set('Nouvelle');

      component.save();

      expect(component.categories()).toContainEqual(created);
      expect(component.viewMode()).toBe('list');
      expect(component.successMsg()).toBe('Catégorie ajoutée.');
      expect(component.saving()).toBe(false);
    });

    it('appelle update en mode édition et remplace la catégorie existante', () => {
      const existing = buildCategory({ id: 3, value: 'ancien' });
      const updated = buildCategory({ id: 3, value: 'modifie' });
      component.categories.set([existing]);
      component.editingItem.set(existing);
      serviceMock.update = vi.fn().mockReturnValue(of(updated));
      component.formValue.set('modifie');
      component.formLabel.set('Modifié');

      component.save();

      expect(serviceMock.update).toHaveBeenCalledWith(3, { value: 'modifie', label: 'Modifié' });
      expect(component.categories()).toEqual([updated]);
      expect(component.successMsg()).toBe('Catégorie modifiée.');
    });

    it('définit errorMsg en cas d’échec', () => {
      serviceMock.create = vi.fn().mockReturnValue(throwError(() => new Error('network error')));
      component.formValue.set('technique');
      component.formLabel.set('Technique');

      component.save();

      expect(component.errorMsg()).toBe('Une erreur est survenue.');
      expect(component.saving()).toBe(false);
    });
  });

  describe('suppression', () => {
    it('askDelete définit confirmDeleteId', () => {
      component.askDelete(7);

      expect(component.confirmDeleteId()).toBe(7);
    });

    it('cancelDelete réinitialise confirmDeleteId', () => {
      component.confirmDeleteId.set(7);

      component.cancelDelete();

      expect(component.confirmDeleteId()).toBeNull();
    });

    it('confirmDelete supprime la catégorie de la liste', () => {
      component.categories.set([buildCategory({ id: 1 }), buildCategory({ id: 2 })]);
      component.confirmDeleteId.set(1);

      component.confirmDelete(1);

      expect(serviceMock.remove).toHaveBeenCalledWith(1);
      expect(component.categories().map((c) => c.id)).toEqual([2]);
      expect(component.confirmDeleteId()).toBeNull();
      expect(component.deletingId()).toBeNull();
      expect(component.successMsg()).toBe('Catégorie supprimée.');
    });

    it('arrête le chargement en cas d’échec de suppression sans retirer la catégorie', () => {
      serviceMock.remove = vi.fn().mockReturnValue(throwError(() => new Error('network error')));
      component.categories.set([buildCategory({ id: 1 })]);

      component.confirmDelete(1);

      expect(component.deletingId()).toBeNull();
      expect(component.categories()).toHaveLength(1);
    });
  });

  describe('closeModal', () => {
    it('émet close avec la liste actuelle des catégories', () => {
      const categories = [buildCategory({ id: 1 }), buildCategory({ id: 2 })];
      component.categories.set(categories);
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.closeModal();

      expect(closeSpy).toHaveBeenCalledWith(categories);
    });
  });
});
