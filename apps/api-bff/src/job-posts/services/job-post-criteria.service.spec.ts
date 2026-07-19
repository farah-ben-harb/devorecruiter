// src/job-posts/services/job-post-criteria.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  JobPostCriteriaService,
  buildN8nCriteriaPayload,
  RawCriteriaPayload,
} from './job-post-criteria.service';
import {
  IJobPostCriteriaRepository,
  JOB_POST_CRITERIA_REPOSITORY,
} from '../interfaces/job-post-criteria.interface';
import {
  JobPostCriteria,
  CriteriaSection,
  CriteriaSource,
} from '../entities/job-post-criteria.entity';

/**
 * Factory pour construire une entité JobPostCriteria complète en test.
 * jobPost est castée via une assertion ciblée sur le type de la propriété
 * (pas any/unknown) car la relation n'est jamais utilisée dans ce service.
 */
function makeCriteria(overrides: Partial<JobPostCriteria> = {}): JobPostCriteria {
  const base: JobPostCriteria = {
    id: 1,
    jobPostId: 10,
    jobPost: {} as JobPostCriteria['jobPost'],
    intitulePoste: 'Développeur Backend NestJS',
    competencesTechniquesRequises: [],
    competencesGeneralesRequises: [],
    experienceMinimaleAnnees: null,
    formationRequise: null,
    languesRequises: [],
    missionsPrincipales: [],
    certificationsRequises: [],
    sections: null,
    sectionLabels: null,
    source: CriteriaSource.N8N_UNIFICATION,
    rawJson: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  return { ...base, ...overrides };
}

describe('buildN8nCriteriaPayload', () => {
  it('agrège les sections locales sans sections globales (cas legacy)', () => {
    const sections: CriteriaSection[] = [
      {
        key: 'competencesTechniquesRequises',
        label: 'Compétences techniques',
        items: ['TypeScript', 'NestJS'],
      },
      {
        key: 'languesRequises',
        label: 'Langues',
        items: ['Anglais B2'],
      },
    ];

    const criteria = makeCriteria({
      intitulePoste: 'Backend Dev',
      experienceMinimaleAnnees: 3,
      formationRequise: 'Bac+5',
      sections,
    });

    const payload = buildN8nCriteriaPayload(criteria);

    expect(payload.intitulePoste).toBe('Backend Dev');
    expect(payload.experienceMinimaleAnnees).toBe(3);
    expect(payload.formationRequise).toBe('Bac+5');
    expect(payload.competencesTechniquesRequises).toEqual(['TypeScript', 'NestJS']);
    expect(payload.languesRequises).toEqual(['Anglais B2']);
    expect(payload.missionsPrincipales).toEqual([]);
    expect(payload.certificationsRequises).toEqual([]);
    expect(payload.globalCriteriaIncluded).toBe(false);
    expect(payload.sections).toEqual([
      {
        key: 'competencesTechniquesRequises',
        label: 'Compétences techniques',
        items: ['TypeScript', 'NestJS'],
        fromGlobal: false,
      },
      {
        key: 'languesRequises',
        label: 'Langues',
        items: ['Anglais B2'],
        fromGlobal: false,
      },
    ]);
  });

  it('fusionne les sections globales dans les bonnes clés plates avec déduplication', () => {
    const sections: CriteriaSection[] = [
      {
        key: 'competencesTechniquesRequises',
        label: 'Compétences techniques',
        items: ['TypeScript'],
      },
      {
        key: 'global_technique',
        label: 'Catalogue global technique',
        items: ['TypeScript', 'Docker'],
        fromGlobal: true,
      },
      {
        key: 'global_soft-skills',
        label: 'Catalogue global soft skills',
        items: ['Communication'],
        fromGlobal: true,
      },
      {
        key: 'global_formation',
        label: 'Catalogue global formation',
        items: ['Veille technique'],
        fromGlobal: true,
      },
    ];

    const criteria = makeCriteria({ sections });

    const payload = buildN8nCriteriaPayload(criteria);

    expect(payload.globalCriteriaIncluded).toBe(true);
    expect(payload.competencesTechniquesRequises).toEqual(['TypeScript', 'Docker']);
    expect(payload.competencesGeneralesRequises).toEqual(['Communication']);
    expect(payload.missionsPrincipales).toEqual(['Veille technique']);
  });

  it('ignore les sections global_* orphelines quand aucune section fromGlobal n\'est présente', () => {
    // Cas de sécurité : ne devrait pas arriver en pratique, mais on vérifie
    // que le comportement legacy ne casse pas si une section fromGlobal est
    // absente alors qu'une clé global_* traîne quand même (fromGlobal non défini).
    const sections: CriteriaSection[] = [
      {
        key: 'competencesTechniquesRequises',
        label: 'Compétences techniques',
        items: ['TypeScript'],
      },
    ];

    const criteria = makeCriteria({ sections });

    const payload = buildN8nCriteriaPayload(criteria);

    expect(payload.globalCriteriaIncluded).toBe(false);
    expect(payload.competencesTechniquesRequises).toEqual(['TypeScript']);
  });

  it('construit les sections par défaut depuis les champs plats quand sections est null', () => {
    const criteria = makeCriteria({
      sections: null,
      competencesTechniquesRequises: ['Node.js'],
      competencesGeneralesRequises: ['Autonomie'],
      languesRequises: ['Français'],
      missionsPrincipales: ['Développer des APIs'],
      certificationsRequises: ['AWS'],
    });

    const payload = buildN8nCriteriaPayload(criteria);

    expect(payload.competencesTechniquesRequises).toEqual(['Node.js']);
    expect(payload.competencesGeneralesRequises).toEqual(['Autonomie']);
    expect(payload.languesRequises).toEqual(['Français']);
    expect(payload.missionsPrincipales).toEqual(['Développer des APIs']);
    expect(payload.certificationsRequises).toEqual(['AWS']);
    expect(payload.globalCriteriaIncluded).toBe(false);
  });
});

describe('JobPostCriteriaService', () => {
  let service: JobPostCriteriaService;
  let repository: jest.Mocked<IJobPostCriteriaRepository>;

  beforeEach(async () => {
    const mockRepository: jest.Mocked<IJobPostCriteriaRepository> = {
      upsert: jest.fn(),
      findByJobPostId: jest.fn(),
      deleteByJobPostId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostCriteriaService,
        {
          provide: JOB_POST_CRITERIA_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<JobPostCriteriaService>(JobPostCriteriaService);
    repository = module.get(JOB_POST_CRITERIA_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertFromN8n', () => {
    it('construit les sections par défaut et upsert avec la source N8N_UNIFICATION', async () => {
      const raw: RawCriteriaPayload = {
        intitulePoste: 'Développeur Backend',
        competencesTechniquesRequises: ['NestJS'],
        missionsprincipales: ['Concevoir des APIs'], // casse n8n
      };

      const expected = makeCriteria({
        jobPostId: 10,
        intitulePoste: 'Développeur Backend',
        competencesTechniquesRequises: ['NestJS'],
        missionsPrincipales: ['Concevoir des APIs'],
        source: CriteriaSource.N8N_UNIFICATION,
      });

      repository.upsert.mockResolvedValue(expected);

      const result = await service.upsertFromN8n(10, raw);

      expect(repository.upsert).toHaveBeenCalledTimes(1);
      const [jobPostId, data] = repository.upsert.mock.calls[0];

      expect(jobPostId).toBe(10);
      expect(data.intitulePoste).toBe('Développeur Backend');
      expect(data.competencesTechniquesRequises).toEqual(['NestJS']);
      // gère la casse missionsprincipales envoyée par n8n
      expect(data.missionsPrincipales).toEqual(['Concevoir des APIs']);
      expect(data.source).toBe(CriteriaSource.N8N_UNIFICATION);
      expect(data.rawJson).toEqual(raw);
      expect(data.sections).toEqual([
        { key: 'competencesTechniquesRequises', label: 'Compétences techniques', items: ['NestJS'] },
        { key: 'competencesGeneralesRequises', label: 'Compétences générales', items: [] },
        { key: 'languesRequises', label: 'Langues', items: [] },
        { key: 'missionsPrincipales', label: 'Missions principales', items: ['Concevoir des APIs'] },
        { key: 'certificationsRequises', label: 'Certifications', items: [] },
      ]);
      expect(result).toBe(expected);
    });

    it('utilise les sections fournies directement si présentes dans le payload', async () => {
      const customSections: CriteriaSection[] = [
        { key: 'competencesTechniquesRequises', label: 'Stack', items: ['Go'] },
      ];

      const raw: RawCriteriaPayload = {
        sections: customSections,
      };

      const expected = makeCriteria({ sections: customSections });
      repository.upsert.mockResolvedValue(expected);

      await service.upsertFromN8n(10, raw);

      const [, data] = repository.upsert.mock.calls[0];
      expect(data.sections).toBe(customSections);
    });
  });

  describe('upsertFromFrontend', () => {
    it('reconstruit les champs plats depuis sections et force la source STANDALONE', async () => {
      const sections: CriteriaSection[] = [
        { key: 'competencesTechniquesRequises', label: 'Stack', items: ['Java'] },
        { key: 'languesRequises', label: 'Langues', items: ['Allemand'] },
      ];

      const raw: RawCriteriaPayload = {
        intitulePoste: 'Java Dev',
        formationRequise: 'Bac+3',
        experienceMinimaleAnnees: 2,
        sections,
      };

      const expected = makeCriteria({
        intitulePoste: 'Java Dev',
        source: CriteriaSource.STANDALONE,
        sections,
      });

      repository.upsert.mockResolvedValue(expected);

      const result = await service.upsertFromFrontend(10, raw);

      expect(repository.upsert).toHaveBeenCalledTimes(1);
      const [jobPostId, data] = repository.upsert.mock.calls[0];

      expect(jobPostId).toBe(10);
      expect(data.intitulePoste).toBe('Java Dev');
      expect(data.formationRequise).toBe('Bac+3');
      expect(data.experienceMinimaleAnnees).toBe(2);
      expect(data.competencesTechniquesRequises).toEqual(['Java']);
      expect(data.languesRequises).toEqual(['Allemand']);
      expect(data.missionsPrincipales).toEqual([]);
      expect(data.certificationsRequises).toEqual([]);
      expect(data.sections).toBe(sections);
      expect(data.sectionLabels).toBeNull();
      expect(data.source).toBe(CriteriaSource.STANDALONE);
      expect(data.rawJson).toBeNull();
      expect(result).toBe(expected);
    });

    it('construit les sections par défaut si aucune section n\'est fournie', async () => {
      const raw: RawCriteriaPayload = {
        competencesGeneralesRequises: ['Rigueur'],
      };

      const expected = makeCriteria();
      repository.upsert.mockResolvedValue(expected);

      await service.upsertFromFrontend(10, raw);

      const [, data] = repository.upsert.mock.calls[0];
      expect(data.competencesGeneralesRequises).toEqual(['Rigueur']);
    });
  });

  describe('findByJobPostId', () => {
    it('retourne les critères trouvés', async () => {
      const expected = makeCriteria({ jobPostId: 42 });
      repository.findByJobPostId.mockResolvedValue(expected);

      const result = await service.findByJobPostId(42);

      expect(repository.findByJobPostId).toHaveBeenCalledWith(42);
      expect(result).toBe(expected);
    });

    it('lève une NotFoundException si aucun critère n\'existe pour cette fiche', async () => {
      repository.findByJobPostId.mockResolvedValue(null);

      await expect(service.findByJobPostId(99)).rejects.toThrow(NotFoundException);
      expect(repository.findByJobPostId).toHaveBeenCalledWith(99);
    });
  });

  describe('deleteByJobPostId', () => {
    it('délègue la suppression au repository', async () => {
      repository.deleteByJobPostId.mockResolvedValue(undefined);

      await service.deleteByJobPostId(42);

      expect(repository.deleteByJobPostId).toHaveBeenCalledWith(42);
    });
  });
});