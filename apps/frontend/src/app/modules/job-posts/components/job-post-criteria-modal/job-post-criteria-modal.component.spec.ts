import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { JobPostCriteriaModalComponent } from './job-post-criteria-modal.component';
import { JobPostService } from '../../services/job-posts.service';
import { GlobalCriteriaService } from '../../services/global-criterias.service';
import {
  JobPostCriteria,
  CriteriaSection,
  GlobalCriteria,
  UploadedFile,
} from '../../models/job-post.model';

type JobPostServiceMock = Pick<JobPostService, 'getCriteria' | 'updateCriteria' | 'updateTitle'>;
type GlobalCriteriaServiceMock = Pick<GlobalCriteriaService, 'getAll'>;

const buildCriteria = (overrides: Partial<JobPostCriteria> = {}): JobPostCriteria => ({
  id: 1,
  jobPostId: 10,
  intitulePoste: null,
  competencesTechniquesRequises: [],
  competencesGeneralesRequises: [],
  experienceMinimaleAnnees: null,
  formationRequise: null,
  languesRequises: [],
  missionsPrincipales: [],
  certificationsRequises: [],
  source: 'standalone',
  sectionLabels: null,
  rawJson: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  sections: null,
  ...overrides,
});

const buildSection = (overrides: Partial<CriteriaSection> = {}): CriteriaSection => ({
  key: 'competencesTechniquesRequises',
  label: 'Compétences techniques',
  items: [],
  ...overrides,
});

const buildGlobalCriteria = (overrides: Partial<GlobalCriteria> = {}): GlobalCriteria => ({
  id: 1,
  label: 'TypeScript',
  description: null,
  category: 'technique',
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  name: 'poste-1.docx',
  type: 'application/vnd.google-apps.document',
  url: '',
  isDriveFile: true,
  status: 'unified',
  isLoading: false,
  ...overrides,
});

describe('JobPostCriteriaModalComponent', () => {
  let component: JobPostCriteriaModalComponent;
  let jobPostServiceMock: JobPostServiceMock;
  let globalCriteriaServiceMock: GlobalCriteriaServiceMock;

  beforeEach(() => {
    jobPostServiceMock = {
      getCriteria: vi.fn().mockReturnValue(of(buildCriteria())),
      updateCriteria: vi.fn().mockReturnValue(of(buildCriteria())),
      updateTitle: vi.fn().mockReturnValue(of({})),
    };
    globalCriteriaServiceMock = {
      getAll: vi.fn().mockReturnValue(of([])),
    };

    // Instanciation directe : le composant utilise l'injection par
    // constructeur, ce qui provoque NG0202 avec TestBed dans cet
    // environnement Vitest. `new` contourne le problème sans toucher au fichier.
    component = new JobPostCriteriaModalComponent(
      jobPostServiceMock as JobPostService,
      globalCriteriaServiceMock as GlobalCriteriaService,
    );
    component.jobPostId = 10;
  });

  describe('ngOnInit', () => {
    it('initialise title et company depuis jobPostFile si fourni', () => {
      component.jobPostFile = buildUploadedFile({ title: 'DevOps Engineer', company: 'Devoteam' });

      component.ngOnInit();

      expect(component.title()).toBe('DevOps Engineer');
      expect(component.company()).toBe('Devoteam');
    });

    it("n'initialise rien si jobPostFile est absent", () => {
      component.jobPostFile = null;

      component.ngOnInit();

      expect(component.title()).toBe('');
      expect(component.company()).toBe('');
    });

    it('appelle getCriteria et getAll (chargement parallèle)', () => {
      component.ngOnInit();

      expect(jobPostServiceMock.getCriteria).toHaveBeenCalledWith(10);
      expect(globalCriteriaServiceMock.getAll).toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });
  });

  describe('loadCriteria — construction des sections', () => {
    it('utilise criteria.sections si présentes', () => {
      const sections = [buildSection({ key: 'custom', label: 'Custom', items: ['A'] })];
      jobPostServiceMock.getCriteria = vi.fn().mockReturnValue(of(buildCriteria({ sections })));

      component.ngOnInit();

      expect(component.sections()).toEqual([{ key: 'custom', label: 'Custom', items: ['A'] }]);
    });

    it('reconstruit les sections depuis les champs plats si sections est absent', () => {
      jobPostServiceMock.getCriteria = vi.fn().mockReturnValue(
        of(
          buildCriteria({
            sections: null,
            competencesTechniquesRequises: ['Angular', 'NestJS'],
            languesRequises: ['Français'],
          }),
        ),
      );

      component.ngOnInit();

      const techSection = component
        .sections()
        .find((s) => s.key === 'competencesTechniquesRequises');
      expect(techSection?.items).toEqual(['Angular', 'NestJS']);
      const langSection = component.sections().find((s) => s.key === 'languesRequises');
      expect(langSection?.items).toEqual(['Français']);
    });

    it('applique les labels personnalisés via sectionLabels', () => {
      jobPostServiceMock.getCriteria = vi.fn().mockReturnValue(
        of(
          buildCriteria({
            sections: null,
            sectionLabels: { competencesTechniquesRequises: 'Stack technique' },
          }),
        ),
      );

      component.ngOnInit();

      const techSection = component
        .sections()
        .find((s) => s.key === 'competencesTechniquesRequises');
      expect(techSection?.label).toBe('Stack technique');
    });

    it('fusionne les critères globaux dans une nouvelle section par catégorie', () => {
      jobPostServiceMock.getCriteria = vi.fn().mockReturnValue(of(buildCriteria({ sections: [] })));
      globalCriteriaServiceMock.getAll = vi
        .fn()
        .mockReturnValue(
          of([
            buildGlobalCriteria({ id: 1, label: 'TypeScript', category: 'technique' }),
            buildGlobalCriteria({ id: 2, label: 'React', category: 'technique' }),
            buildGlobalCriteria({ id: 3, label: 'Anglais', category: 'langue' }),
          ]),
        );

      component.ngOnInit();

      const techGlobal = component.sections().find((s) => s.key === 'global_technique');
      const langueGlobal = component.sections().find((s) => s.key === 'global_langue');

      expect(techGlobal?.items).toEqual(['TypeScript', 'React']);
      expect(techGlobal?.fromGlobal).toBe(true);
      expect(techGlobal?.label).toBe('🔧 Technique');
      expect(langueGlobal?.items).toEqual(['Anglais']);
    });

    it("n'importe pas les critères globaux si déjà importés (hasGlobalImport)", () => {
      const sections = [
        buildSection({
          key: 'global_technique',
          label: '🔧 Technique',
          items: ['Existant'],
          fromGlobal: true,
        }),
      ];
      jobPostServiceMock.getCriteria = vi.fn().mockReturnValue(of(buildCriteria({ sections })));
      globalCriteriaServiceMock.getAll = vi
        .fn()
        .mockReturnValue(of([buildGlobalCriteria({ label: 'Nouveau', category: 'technique' })]));

      component.ngOnInit();

      const techGlobal = component.sections().find((s) => s.key === 'global_technique');
      expect(techGlobal?.items).toEqual(['Existant']);
    });

    it('utilise "autre" comme catégorie par défaut si category est null', () => {
      jobPostServiceMock.getCriteria = vi.fn().mockReturnValue(of(buildCriteria({ sections: [] })));
      globalCriteriaServiceMock.getAll = vi
        .fn()
        .mockReturnValue(of([buildGlobalCriteria({ label: 'Divers', category: null })]));

      component.ngOnInit();

      const autreGlobal = component.sections().find((s) => s.key === 'global_autre');
      expect(autreGlobal?.items).toEqual(['Divers']);
      expect(autreGlobal?.label).toBe('📌 Autre');
    });
  });

  describe('renommage de section', () => {
    beforeEach(() => {
      component.sections.set([buildSection({ key: 's1', label: 'Section 1' })]);
    });

    it('startRenameSection prépare le champ édité', () => {
      component.startRenameSection(0);

      expect(component.editingLabelIndex()).toBe(0);
      expect(component.editingLabelValue()).toBe('Section 1');
    });

    it('confirmRenameSection applique le nouveau label', () => {
      component.startRenameSection(0);
      component.editingLabelValue.set('Nouveau nom');

      component.confirmRenameSection(0);

      expect(component.sections()[0].label).toBe('Nouveau nom');
      expect(component.editingLabelIndex()).toBe(-1);
    });

    it('confirmRenameSection annule si le label est vide', () => {
      component.startRenameSection(0);
      component.editingLabelValue.set('   ');

      component.confirmRenameSection(0);

      expect(component.sections()[0].label).toBe('Section 1');
      expect(component.editingLabelIndex()).toBe(-1);
    });

    it('cancelRenameSection réinitialise sans modifier', () => {
      component.startRenameSection(0);
      component.editingLabelValue.set('Ignoré');

      component.cancelRenameSection();

      expect(component.editingLabelIndex()).toBe(-1);
      expect(component.sections()[0].label).toBe('Section 1');
    });

    it('onRenameLabelKeydown confirme sur Enter et annule sur Escape', () => {
      component.startRenameSection(0);
      component.editingLabelValue.set('Via Enter');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      component.onRenameLabelKeydown(enterEvent, 0);

      expect(component.sections()[0].label).toBe('Via Enter');

      component.startRenameSection(0);
      component.editingLabelValue.set('Ignoré');
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      component.onRenameLabelKeydown(escapeEvent, 0);

      expect(component.editingLabelIndex()).toBe(-1);
      expect(component.sections()[0].label).toBe('Via Enter');
    });
  });

  describe('suppression de section', () => {
    it('supprime la section à l’index donné et réindexe newItemValues', () => {
      component.sections.set([
        buildSection({ key: 's1' }),
        buildSection({ key: 's2' }),
        buildSection({ key: 's3' }),
      ]);
      component.setNewItemValue(0, 'a');
      component.setNewItemValue(1, 'b');
      component.setNewItemValue(2, 'c');

      component.deleteSection(1);

      expect(component.sections().map((s) => s.key)).toEqual(['s1', 's3']);
      expect(component.getNewItemValue(0)).toBe('a');
      expect(component.getNewItemValue(1)).toBe('c');
    });

    it('annule le renommage en cours si la section supprimée est celle éditée', () => {
      component.sections.set([buildSection({ key: 's1' })]);
      component.startRenameSection(0);

      component.deleteSection(0);

      expect(component.editingLabelIndex()).toBe(-1);
    });
  });

  describe('ajout de section', () => {
    it('addSectionGlobal ajoute une section marquée fromGlobal et vide le champ', () => {
      component.newSectionLabelGlobal.set('Nouvelle section');

      component.addSectionGlobal();

      const added = component.sections()[0];
      expect(added.label).toBe('Nouvelle section');
      expect(added.fromGlobal).toBe(true);
      expect(component.newSectionLabelGlobal()).toBe('');
      expect(component.showAddSectionGlobal()).toBe(false);
    });

    it('addSectionLocal ajoute une section non fromGlobal', () => {
      component.newSectionLabelLocal.set('Section locale');

      component.addSectionLocal();

      const added = component.sections()[0];
      expect(added.fromGlobal).toBe(false);
    });

    it("n'ajoute rien si le label est vide", () => {
      component.newSectionLabelGlobal.set('   ');

      component.addSectionGlobal();

      expect(component.sections()).toEqual([]);
    });

    it('génère une clé unique si la clé de base existe déjà', () => {
      component.sections.set([buildSection({ key: 'section_a', label: 'Section A' })]);
      component.newSectionLabelLocal.set('Section A');

      component.addSectionLocal();

      const keys = component.sections().map((s) => s.key);
      expect(keys[0]).toBe('section_a');
      expect(keys[1]).not.toBe('section_a');
      expect(keys[1]).toMatch(/^section_a_\d+$/);
    });

    it('onNewSectionKeydownGlobal ajoute sur Enter et réinitialise sur Escape', () => {
      component.newSectionLabelGlobal.set('Via Enter');
      component.onNewSectionKeydownGlobal(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.sections()).toHaveLength(1);

      component.showAddSectionGlobal.set(true);
      component.newSectionLabelGlobal.set('Ignoré');
      component.onNewSectionKeydownGlobal(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(component.showAddSectionGlobal()).toBe(false);
      expect(component.newSectionLabelGlobal()).toBe('');
      expect(component.sections()).toHaveLength(1);
    });
  });

  describe('CRUD items', () => {
    beforeEach(() => {
      component.sections.set([buildSection({ key: 's1', items: ['Existant'] })]);
    });

    it('addItem ajoute un item non dupliqué et vide le buffer', () => {
      component.setNewItemValue(0, 'Nouveau');

      component.addItem(0);

      expect(component.sections()[0].items).toEqual(['Existant', 'Nouveau']);
      expect(component.getNewItemValue(0)).toBe('');
    });

    it("n'ajoute pas un item vide", () => {
      component.setNewItemValue(0, '   ');

      component.addItem(0);

      expect(component.sections()[0].items).toEqual(['Existant']);
    });

    it("n'ajoute pas un doublon", () => {
      component.setNewItemValue(0, 'Existant');

      component.addItem(0);

      expect(component.sections()[0].items).toEqual(['Existant']);
    });

    it('removeItem retire l’item à l’index donné', () => {
      component.sections.set([buildSection({ key: 's1', items: ['A', 'B', 'C'] })]);

      component.removeItem(0, 1);

      expect(component.sections()[0].items).toEqual(['A', 'C']);
    });

    it('onItemKeydown ajoute sur Enter', () => {
      component.setNewItemValue(0, 'Via Enter');

      component.onItemKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 0);

      expect(component.sections()[0].items).toContain('Via Enter');
    });
  });

  describe('totalItems / globalSectionIndexes / localSectionIndexes', () => {
    it('calcule le total des items toutes sections confondues', () => {
      component.sections.set([buildSection({ items: ['A', 'B'] }), buildSection({ items: ['C'] })]);

      expect(component.totalItems()).toBe(3);
    });

    it('sépare correctement les index des sections globales et locales', () => {
      component.sections.set([
        buildSection({ key: 's1', fromGlobal: true }),
        buildSection({ key: 's2', fromGlobal: false }),
        buildSection({ key: 's3', fromGlobal: true }),
      ]);

      expect(component.globalSectionIndexes()).toEqual([0, 2]);
      expect(component.localSectionIndexes()).toEqual([1]);
    });
  });

  describe('save', () => {
    beforeEach(() => {
      component.intitulePoste.set('DevOps Engineer');
      component.formationRequise.set('Bac+5');
      component.experienceMinimaleAnnees.set(3);
      component.sections.set([buildSection({ key: 's1', items: ['A'] })]);
      component.title.set('DevOps Engineer');
      component.company.set('Devoteam');
    });

    it('envoie le payload attendu à updateCriteria et updateTitle', async () => {
      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(jobPostServiceMock.updateCriteria).toHaveBeenCalledWith(10, {
        intitulePoste: 'DevOps Engineer',
        formationRequise: 'Bac+5',
        experienceMinimaleAnnees: 3,
        sections: [buildSection({ key: 's1', items: ['A'] })],
      });
      expect(jobPostServiceMock.updateTitle).toHaveBeenCalledWith(
        10,
        'DevOps Engineer',
        'Devoteam',
      );
    });

    it('émet fileUpdated et saved, puis affiche un message de succès', async () => {
      const fileUpdatedSpy = vi.fn();
      const savedSpy = vi.fn();
      component.fileUpdated.subscribe(fileUpdatedSpy);
      component.saved.subscribe(savedSpy);

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(fileUpdatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'DevOps Engineer', company: 'Devoteam' }),
      );
      expect(savedSpy).toHaveBeenCalled();
      expect(component.successMsg()).toBe('Fiche mise à jour avec succès.');
    });

    it('convertit intitulePoste et formationRequise vides en null', async () => {
      component.intitulePoste.set('');
      component.formationRequise.set('');

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(jobPostServiceMock.updateCriteria).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ intitulePoste: null, formationRequise: null }),
      );
    });

    it("définit errorMsg si l'appel échoue", async () => {
      jobPostServiceMock.updateCriteria = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('Erreur serveur')));

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(component.errorMsg()).toBe('Erreur lors de la sauvegarde. Veuillez réessayer.');
    });

    it('construit un fichier par défaut si jobPostFile est absent', async () => {
      component.jobPostFile = null;
      const fileUpdatedSpy = vi.fn();
      component.fileUpdated.subscribe(fileUpdatedSpy);

      component.save();
      await vi.waitFor(() => expect(component.saving()).toBe(false));

      expect(fileUpdatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sans nom',
          isDriveFile: true,
          status: 'unified',
          title: 'DevOps Engineer',
          company: 'Devoteam',
        }),
      );
    });
  });

  describe('onClose', () => {
    it('émet close', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.onClose();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
