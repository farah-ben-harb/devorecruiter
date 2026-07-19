import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { GlobalCriteriaModalComponent } from './global-criterias.component';
import { GlobalCriteriaService } from '../../services/global-criterias.service';
import { CriteriaCategoryService } from '../../services/criteria-category.service';
import { CriteriaCategory, GlobalCriteria } from '../../models/job-post.model';

type GlobalCriteriaServiceMock = Pick<
  GlobalCriteriaService,
  'getAll' | 'create' | 'update' | 'remove'
>;
type CriteriaCategoryServiceMock = Pick<CriteriaCategoryService, 'getAll'>;

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

const buildCategory = (overrides: Partial<CriteriaCategory> = {}): CriteriaCategory => ({
  id: 1,
  value: 'technique',
  label: '🔧 Technique',
  order: 0,
  ...overrides,
});

describe('GlobalCriteriaModalComponent', () => {
  let component: GlobalCriteriaModalComponent;
  let globalCriteriaServiceMock: GlobalCriteriaServiceMock;
  let categoryServiceMock: CriteriaCategoryServiceMock;

  beforeEach(() => {
    globalCriteriaServiceMock = {
      getAll: vi.fn().mockReturnValue(of([])),
      create: vi.fn().mockReturnValue(of(buildCriteria())),
      update: vi.fn().mockReturnValue(of(buildCriteria())),
      remove: vi.fn().mockReturnValue(of({ message: 'ok' })),
    };
    categoryServiceMock = {
      getAll: vi.fn().mockReturnValue(of([])),
    };

    // Instanciation directe : le composant utilise l'injection par
    // constructeur, ce qui provoque NG0202 avec TestBed dans cet
    // environnement Vitest. `new` contourne le problème sans toucher au fichier.
    component = new GlobalCriteriaModalComponent(
      globalCriteriaServiceMock as GlobalCriteriaService,
      categoryServiceMock as CriteriaCategoryService,
    );
  });

  describe('ngOnInit', () => {
    it('charge les critères et les catégories', () => {
      component.ngOnInit();

      expect(globalCriteriaServiceMock.getAll).toHaveBeenCalled();
      expect(categoryServiceMock.getAll).toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });
  });

  describe('loadCriteria', () => {
    it('charge les critères avec succès', () => {
      globalCriteriaServiceMock.getAll = vi
        .fn()
        .mockReturnValue(of([buildCriteria({ id: 1 }), buildCriteria({ id: 2 })]));

      component.loadCriteria();

      expect(component.criteria()).toHaveLength(2);
      expect(component.loading()).toBe(false);
    });

    it('affiche une erreur en cas d’échec', () => {
      globalCriteriaServiceMock.getAll = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('network error')));

      component.loadCriteria();

      expect(component.errorMsg()).toBe('Impossible de charger les critères.');
      expect(component.loading()).toBe(false);
    });
  });

  describe('loadCategories', () => {
    it('charge les catégories', () => {
      categoryServiceMock.getAll = vi.fn().mockReturnValue(of([buildCategory()]));

      component.loadCategories();

      expect(component.categories()).toEqual([buildCategory()]);
    });
  });

  describe('groupedCriteria / categoryEntries', () => {
    it('regroupe les critères par catégorie', () => {
      component.criteria.set([
        buildCriteria({ id: 1, category: 'technique' }),
        buildCriteria({ id: 2, category: 'technique' }),
        buildCriteria({ id: 3, category: 'langue' }),
      ]);

      const grouped = component.groupedCriteria();
      expect(grouped.get('technique')).toHaveLength(2);
      expect(grouped.get('langue')).toHaveLength(1);
    });

    it('utilise "autre" comme clé par défaut si category est null', () => {
      component.criteria.set([buildCriteria({ id: 1, category: null })]);

      const grouped = component.groupedCriteria();
      expect(grouped.get('autre')).toHaveLength(1);
    });

    it('categoryEntries retourne les entrées sous forme de tableau', () => {
      component.criteria.set([buildCriteria({ id: 1, category: 'technique' })]);

      const entries = component.categoryEntries();
      expect(entries).toEqual([['technique', [buildCriteria({ id: 1, category: 'technique' })]]]);
    });
  });

  describe('navigation entre vues', () => {
    it('openAdd réinitialise le formulaire et passe en mode add', () => {
      component.form.set({ label: 'Ancien', description: '', category: '' });

      component.openAdd();

      expect(component.viewMode()).toBe('add');
      expect(component.editingCriteria()).toBeNull();
      expect(component.form()).toEqual({ label: '', description: '', category: '' });
    });

    it('openEdit pré-remplit le formulaire et passe en mode edit', () => {
      const criteria = buildCriteria({
        label: 'React',
        description: 'Framework JS',
        category: 'technique',
      });

      component.openEdit(criteria);

      expect(component.viewMode()).toBe('edit');
      expect(component.editingCriteria()).toEqual(criteria);
      expect(component.form()).toEqual({
        label: 'React',
        description: 'Framework JS',
        category: 'technique',
      });
    });

    it('openEdit gère les champs optionnels absents', () => {
      const criteria = buildCriteria({ label: 'Docker', description: null, category: null });

      component.openEdit(criteria);

      expect(component.form()).toEqual({ label: 'Docker', description: '', category: '' });
    });

    it('backToList réinitialise l’état d’édition', () => {
      component.viewMode.set('edit');
      component.editingCriteria.set(buildCriteria());
      component.errorMsg.set('Erreur précédente');

      component.backToList();

      expect(component.viewMode()).toBe('list');
      expect(component.editingCriteria()).toBeNull();
      expect(component.form()).toEqual({ label: '', description: '', category: '' });
      expect(component.errorMsg()).toBeNull();
    });
  });

  describe('updateForm', () => {
    it('met à jour un champ du formulaire', () => {
      component.updateForm('label', 'Nouveau libellé');

      expect(component.form().label).toBe('Nouveau libellé');
    });
  });

  describe('save', () => {
    it('affiche une erreur si le libellé est vide', () => {
      component.form.set({ label: '   ', description: '', category: '' });

      component.save();

      expect(component.errorMsg()).toBe('Le libellé est obligatoire.');
      expect(globalCriteriaServiceMock.create).not.toHaveBeenCalled();
    });

    it('appelle create en mode ajout avec le payload nettoyé', () => {
      component.form.set({
        label: '  React  ',
        description: '  Lib UI  ',
        category: '  technique  ',
      });

      component.save();

      expect(globalCriteriaServiceMock.create).toHaveBeenCalledWith({
        label: 'React',
        description: 'Lib UI',
        category: 'technique',
      });
    });

    it('omet description et category si vides après trim', () => {
      component.form.set({ label: 'React', description: '   ', category: '' });

      component.save();

      expect(globalCriteriaServiceMock.create).toHaveBeenCalledWith({
        label: 'React',
        description: undefined,
        category: undefined,
      });
    });

    it('ajoute le critère créé à la liste et revient à la liste', () => {
      const created = buildCriteria({ id: 5, label: 'Vue' });
      globalCriteriaServiceMock.create = vi.fn().mockReturnValue(of(created));
      component.form.set({ label: 'Vue', description: '', category: '' });

      component.save();

      expect(component.criteria()).toContainEqual(created);
      expect(component.viewMode()).toBe('list');
      expect(component.successMsg()).toBe('Critère ajouté avec succès.');
      expect(component.saving()).toBe(false);
    });

    it('appelle update en mode édition et remplace le critère existant', () => {
      const existing = buildCriteria({ id: 3, label: 'Ancien' });
      const updated = buildCriteria({ id: 3, label: 'Modifié' });
      component.criteria.set([existing]);
      component.editingCriteria.set(existing);
      globalCriteriaServiceMock.update = vi.fn().mockReturnValue(of(updated));
      component.form.set({ label: 'Modifié', description: '', category: '' });

      component.save();

      expect(globalCriteriaServiceMock.update).toHaveBeenCalledWith(3, {
        label: 'Modifié',
        description: undefined,
        category: undefined,
      });
      expect(component.criteria()).toEqual([updated]);
      expect(component.successMsg()).toBe('Critère modifié avec succès.');
    });

    it('définit errorMsg en cas d’échec', () => {
      globalCriteriaServiceMock.create = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('network error')));
      component.form.set({ label: 'React', description: '', category: '' });

      component.save();

      expect(component.errorMsg()).toBe('Une erreur est survenue. Veuillez réessayer.');
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

    it('confirmDelete supprime le critère de la liste', () => {
      component.criteria.set([buildCriteria({ id: 1 }), buildCriteria({ id: 2 })]);
      component.confirmDeleteId.set(1);

      component.confirmDelete(1);

      expect(globalCriteriaServiceMock.remove).toHaveBeenCalledWith(1);
      expect(component.criteria().map((c) => c.id)).toEqual([2]);
      expect(component.confirmDeleteId()).toBeNull();
      expect(component.deletingId()).toBeNull();
      expect(component.successMsg()).toBe('Critère supprimé.');
    });

    it('affiche une erreur si la suppression échoue', () => {
      globalCriteriaServiceMock.remove = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('network error')));
      component.criteria.set([buildCriteria({ id: 1 })]);

      component.confirmDelete(1);

      expect(component.errorMsg()).toBe('Impossible de supprimer le critère.');
      expect(component.deletingId()).toBeNull();
      // Le critère n'est pas retiré en cas d'échec
      expect(component.criteria()).toHaveLength(1);
    });
  });

  describe('getCategoryLabel', () => {
    it('retourne le label correspondant à la valeur', () => {
      component.categories.set([buildCategory({ value: 'technique', label: '🔧 Technique' })]);

      expect(component.getCategoryLabel('technique')).toBe('🔧 Technique');
    });

    it('retourne la valeur brute si aucune catégorie ne correspond', () => {
      component.categories.set([]);

      expect(component.getCategoryLabel('inconnu')).toBe('inconnu');
    });
  });

  describe('onCategoryChange', () => {
    it('ouvre le gestionnaire de catégories si la valeur est "__manage__"', () => {
      component.onCategoryChange('__manage__');

      expect(component.showCategoryManager()).toBe(true);
    });

    it('met à jour le formulaire pour une valeur normale', () => {
      component.onCategoryChange('langue');

      expect(component.form().category).toBe('langue');
      expect(component.showCategoryManager()).toBe(false);
    });
  });

  describe('onCategoriesUpdated', () => {
    it('met à jour les catégories et ferme le gestionnaire', () => {
      component.showCategoryManager.set(true);
      const updated = [buildCategory({ id: 2, value: 'nouvelle' })];

      component.onCategoriesUpdated(updated);

      expect(component.categories()).toEqual(updated);
      expect(component.showCategoryManager()).toBe(false);
    });
  });
});
