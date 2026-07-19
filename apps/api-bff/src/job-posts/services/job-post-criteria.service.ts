// src/job-posts/services/job-post-criteria.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IJobPostCriteriaRepository } from '../interfaces/job-post-criteria.interface';
import { JOB_POST_CRITERIA_REPOSITORY } from '../interfaces/job-post-criteria.interface';
import { JobPostCriteria, CriteriaSection, CriteriaSource } from '../entities/job-post-criteria.entity';

export interface RawCriteriaPayload {
  intitulePoste?:                   string;
  competencesTechniquesRequises?:   string[];
  competencesGeneralesRequises?:    string[];
  experienceMinimaleAnnees?:        number;
  formationRequise?:                string;
  languesRequises?:                 string[];
  missionsprincipales?:             string[];   // casse n8n
  missionsPrincipales?:             string[];   // casse frontend
  certificationsRequises?:          string[];
  sections?:                        CriteriaSection[];  // ← override complet si présent
  sectionLabels?:                   Record<string, string>; // ← legacy compat
}

/** Sections par défaut construites depuis le payload brut n8n */
function buildDefaultSections(raw: RawCriteriaPayload): CriteriaSection[] {
  const defaults: Array<{ key: string; label: string; items: string[] }> = [
    {
      key: 'competencesTechniquesRequises',
      label: 'Compétences techniques',
      items: raw.competencesTechniquesRequises ?? [],
    },
    {
      key: 'competencesGeneralesRequises',
      label: 'Compétences générales',
      items: raw.competencesGeneralesRequises ?? [],
    },
    {
      key: 'languesRequises',
      label: 'Langues',
      items: raw.languesRequises ?? [],
    },
    {
      key: 'missionsPrincipales',
      label: 'Missions principales',
      // accepte les deux casings (n8n envoie missionsprincipales)
      items: raw.missionsPrincipales ?? raw.missionsprincipales ?? [],
    },
    {
      key: 'certificationsRequises',
      label: 'Certifications',
      items: raw.certificationsRequises ?? [],
    },
  ];

  // Appliquer les sectionLabels si présents (compat ancien format)
  if (raw.sectionLabels) {
    return defaults.map((s) => ({
      ...s,
      label: raw.sectionLabels![s.key] ?? s.label,
    }));
  }

  return defaults;
}

/**
 * Mapping clé de section "globale" (importée depuis le catalogue global,
 * groupée par catégorie) → clé plate "famille" attendue par n8n.
 *
 * Ces sections sont créées par le frontend lors de l'import des critères
 * globaux (clé du type `global_<category>`, ex: `global_technique`).
 * On les fusionne dans les bonnes listes plates pour que n8n les prenne
 * en compte sans duplication.
 */
const GLOBAL_SECTION_TO_FLAT_KEY: Record<string, string> = {
  'global_technique':    'competencesTechniquesRequises',
  'global_soft-skills':  'competencesGeneralesRequises',
  'global_langue':       'languesRequises',
  'global_formation':    'missionsPrincipales',
  'global_experience':   'missionsPrincipales',
  'global_autre':        'missionsPrincipales',
};

/** Clés "famille" garanties présentes (et initialisées en tableau) dans le payload n8n */
const FLAT_ARRAY_KEYS = [
  'competencesTechniquesRequises',
  'competencesGeneralesRequises',
  'languesRequises',
  'certificationsRequises',
  'missionsPrincipales',
] as const;

/**
 * Construit le payload envoyé à n8n pour le scoring.
 *
 * ── DEUX CAS ──────────────────────────────────────────────────────────────
 *
 * 1. `sections` contient au moins une section `fromGlobal: true`
 *    → la fiche a déjà importé/figé les critères globaux pour elle-même.
 *      Toutes les sections (locales + globales) sont agrégées par famille
 *      dans les champs plats, avec déduplication. Le flag
 *      `globalCriteriaIncluded: true` est ajouté pour signaler à
 *      ResumeEvaluationService de NE PAS renvoyer `globalCriteria`
 *      séparément (sinon double comptage).
 *
 * 2. Aucune section `fromGlobal`
 *    → comportement legacy : on agrège uniquement les sections locales
 *      (ou les champs plats si `sections` est null), SANS toucher au
 *      catalogue global. `globalCriteriaIncluded: false` est renvoyé,
 *      pour que ResumeEvaluationService continue d'envoyer `globalCriteria`
 *      séparément comme avant, et que n8n fasse la fusion lui-même.
 */
export function buildN8nCriteriaPayload(
  criteria: JobPostCriteria,
): Record<string, unknown> {
  const sections = criteria.sections ?? buildDefaultSections({
    competencesTechniquesRequises: criteria.competencesTechniquesRequises,
    competencesGeneralesRequises: criteria.competencesGeneralesRequises,
    languesRequises: criteria.languesRequises,
    missionsPrincipales: criteria.missionsPrincipales,
    certificationsRequises: criteria.certificationsRequises,
  });

  const hasGlobalSections = sections.some((s) => s.fromGlobal);

  // Champs plats historiques (backward compat n8n)
  const flat: Record<string, unknown> = {
    intitulePoste: criteria.intitulePoste,
    experienceMinimaleAnnees: criteria.experienceMinimaleAnnees,
    formationRequise: criteria.formationRequise,
  };

  // Initialise les clés "famille" en tableaux vides
  for (const key of FLAT_ARRAY_KEYS) {
    flat[key] = [] as string[];
  }

  for (const section of sections) {
    // Cas 2 (pas de sections globales) : on ignore les éventuelles sections
    // `global_*` orphelines (ne devrait pas arriver, mais sécurité) pour ne
    // pas les envoyer à moitié — elles seront gérées via globalCriteria.
    if (!hasGlobalSections && section.fromGlobal) continue;

    const targetKey = GLOBAL_SECTION_TO_FLAT_KEY[section.key] ?? section.key;

    if (Array.isArray(flat[targetKey])) {
      flat[targetKey] = [
        ...new Set([...(flat[targetKey] as string[]), ...section.items]),
      ];
    } else {
      flat[targetKey] = section.items;
    }
  }

  return {
    ...flat,
    sections: sections.map((s) => ({
      key: s.key,
      label: s.label,
      items: s.items,
      fromGlobal: s.fromGlobal ?? false,
    })),
    // Indique à ResumeEvaluationService si le catalogue global doit être
    // fusionné séparément (legacy) ou s'il est déjà inclus dans les champs plats.
    globalCriteriaIncluded: hasGlobalSections,
  };
}

@Injectable()
export class JobPostCriteriaService {
  constructor(
    @Inject(JOB_POST_CRITERIA_REPOSITORY)
    private readonly criteriaRepo: IJobPostCriteriaRepository,
  ) {}

  /**
   * Upsert depuis n8n (à l'unification).
   * Construit les sections par défaut depuis le payload brut.
   */
  async upsertFromN8n(
    jobPostId: number,
    raw: RawCriteriaPayload,
  ): Promise<JobPostCriteria> {
    const sections = raw.sections ?? buildDefaultSections(raw);

    return this.criteriaRepo.upsert(jobPostId, {
      intitulePoste:                 raw.intitulePoste                  ?? null,
      competencesTechniquesRequises: raw.competencesTechniquesRequises  ?? [],
      competencesGeneralesRequises:  raw.competencesGeneralesRequises   ?? [],
      experienceMinimaleAnnees:      raw.experienceMinimaleAnnees       ?? null,
      formationRequise:              raw.formationRequise               ?? null,
      languesRequises:               raw.languesRequises                ?? [],
      missionsPrincipales:           raw.missionsPrincipales ?? raw.missionsprincipales ?? [],
      certificationsRequises:        raw.certificationsRequises         ?? [],
      sections,
      sectionLabels:                 raw.sectionLabels                  ?? null,
      source:                        CriteriaSource.N8N_UNIFICATION,
      rawJson:                       raw as Record<string, unknown>,
    });
  }

  /**
   * Upsert depuis le frontend (édition manuelle).
   * sections est la source de vérité ; les champs plats sont reconstruits
   * pour la compat backward.
   */
  async upsertFromFrontend(
    jobPostId: number,
    raw: RawCriteriaPayload,
  ): Promise<JobPostCriteria> {
    const sections = raw.sections ?? buildDefaultSections(raw);

    // Reconstruire les champs plats depuis sections pour la compat
    const byKey = (key: string) =>
      sections.find((s) => s.key === key)?.items ?? [];

    return this.criteriaRepo.upsert(jobPostId, {
      intitulePoste:                 raw.intitulePoste                  ?? null,
      formationRequise:              raw.formationRequise               ?? null,
      experienceMinimaleAnnees:      raw.experienceMinimaleAnnees       ?? null,
      competencesTechniquesRequises: byKey('competencesTechniquesRequises'),
      competencesGeneralesRequises:  byKey('competencesGeneralesRequises'),
      languesRequises:               byKey('languesRequises'),
      missionsPrincipales:           byKey('missionsPrincipales'),
      certificationsRequises:        byKey('certificationsRequises'),
      sections,
      sectionLabels:                 null, // remplacé par sections
      source:                        CriteriaSource.STANDALONE,
      rawJson:                       null,
    });
  }

  async findByJobPostId(jobPostId: number): Promise<JobPostCriteria> {
    const criteria = await this.criteriaRepo.findByJobPostId(jobPostId);
    if (!criteria) {
      throw new NotFoundException(
        `Critères introuvables pour la fiche ${jobPostId}`,
      );
    }
    return criteria;
  }

  async deleteByJobPostId(jobPostId: number): Promise<void> {
    return this.criteriaRepo.deleteByJobPostId(jobPostId);
  }
}