import { describe, it, expect } from 'vitest';
import {
  CandidateRaw,
  ScoredJobPost,
  ScoringResult,
  TriggerScoringResponse,
} from '../models/candidate.model';
import {
  mapCandidateRawToResumeListItems,
  mapScoredJobPost,
  mapScoringResult,
  mapTriggerResponseToScoringResult,
} from './candidates.mapper';

const base: CandidateRaw = {
  id: 'cand-1',
  brutDriveId: 'drive-brut-1',
  brutDriveName: 'CV_John_Doe.pdf',
  brutDriveLink: 'https://drive.google.com/file/d/drive-brut-1/view',
  unifieDriveId: null,
  unifieDriveName: null,
  unifieDriveLink: null,
  status: 'pending',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  githubUsername: 'john-doe',
  email: 'john@example.com',
};

const baseScoredJobPost: ScoredJobPost = {
  fileId: 'file-1',
  fileName: 'Offre Dev.pdf',
  jobTitle: 'Développeur Frontend',
  scoreGlobal: 82,
  status: 'MATCH',
  createdAt: '2024-03-01T00:00:00Z',
  detail: {
    scoreGlobal: 82,
    recommendation: 'ACCEPTED',
    resume: 'Bon profil',
    strengths: ['Communication'],
    weaknesses: ['Peu senior'],
    technicalSkills: { score: 80, detail: 'Solide' },
    experience: { score: 75, detail: 'Correct' },
    education: { score: 85, detail: 'Bonne formation' },
    softSkills: { score: 90, detail: 'Excellent' },
    languages: { score: 70, detail: 'Anglais correct' },
  },
};

const baseScoringResult: ScoringResult = {
  id: 'scoring-1',
  candidateId: 'cand-1',
  status: 'done',
  totalMatch: 2,
  matches: [baseScoredJobPost],
  createdAt: '2024-03-01T00:00:00Z',
  completedAt: '2024-03-01T01:00:00Z',
};

const baseTriggerResponse: TriggerScoringResponse = {
  message: 'Scoring terminé',
  scoringId: 'scoring-42',
  totalMatch: 1,
  matches: [baseScoredJobPost],
  completedAt: '2024-03-02T00:00:00Z',
};

// ─────────────────────────────────────────────────────────────────────────────
describe('mapCandidateRawToResumeListItems', () => {
  it('mappe un candidat sans unification vers un seul ResumeListItem brut', () => {
    const result = mapCandidateRawToResumeListItems(base);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'cand-1',
      name: 'CV_John_Doe.pdf',
      driveId: 'drive-brut-1',
      driveLink: 'https://drive.google.com/file/d/drive-brut-1/view',
      type: 'brut',
      status: 'pending',
      hasUnifie: false,
      hasMissingFields: false,
      githubUsername: 'john-doe',
      email: 'john@example.com',
    });
  });

  it('mappe un candidat unifié vers un seul ResumeListItem unifie', () => {
    const withUnifie: CandidateRaw = {
      ...base,
      unifieDriveId: 'drive-unifie-1',
      unifieDriveName: 'CV_John_Doe_Unifie.pdf',
      unifieDriveLink: 'https://drive.google.com/file/d/drive-unifie-1/view',
      status: 'done',
    };

    const result = mapCandidateRawToResumeListItems(withUnifie);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'cand-1',
      name: 'CV_John_Doe_Unifie.pdf',
      driveId: 'drive-unifie-1',
      driveLink: 'https://drive.google.com/file/d/drive-unifie-1/view',
      type: 'unifie',
      status: 'done',
      hasUnifie: true,
      // githubUsername et email présents → hasMissingFields = false
      hasMissingFields: false,
      githubUsername: 'john-doe',
      email: 'john@example.com',
    });
  });

  it('expose brutDriveLink sur le ResumeListItem unifié', () => {
    const withUnifie: CandidateRaw = {
      ...base,
      unifieDriveId: 'drive-unifie-1',
      unifieDriveName: 'CV_Unifie.pdf',
      unifieDriveLink: 'https://drive.google.com/file/d/drive-unifie-1/view',
    };

    const result = mapCandidateRawToResumeListItems(withUnifie);
    expect(result[0].brutDriveLink).toBe('https://drive.google.com/file/d/drive-brut-1/view');
  });

  it('retourne "Sans nom" quand brutDriveName est vide', () => {
    const result = mapCandidateRawToResumeListItems({ ...base, brutDriveName: '' });
    expect(result[0].name).toBe('Sans nom');
  });

  it('retourne un tableau vide si brutDriveId est absent', () => {
    const result = mapCandidateRawToResumeListItems({
      ...base,
      brutDriveId: null as unknown as string,
    });
    expect(result).toHaveLength(0);
  });

  it('utilise le statut "done" sur le ResumeListItem unifié indépendamment du statut brut', () => {
    const withUnifie: CandidateRaw = {
      ...base,
      unifieDriveId: 'drive-unifie-1',
      unifieDriveName: 'CV_Unifie.pdf',
      unifieDriveLink: null,
      status: 'error',
    };

    const result = mapCandidateRawToResumeListItems(withUnifie);
    expect(result[0].status).toBe('done');
  });

  it('utilise driveLink vide si unifieDriveLink est null', () => {
    const withUnifie: CandidateRaw = {
      ...base,
      unifieDriveId: 'drive-unifie-1',
      unifieDriveName: 'CV_Unifie.pdf',
      unifieDriveLink: null,
    };

    const result = mapCandidateRawToResumeListItems(withUnifie);
    expect(result[0].driveLink).toBe('');
  });

  // FIX : githubUsername absent (null) sur un unifié → hasMissingFields = true
  it('détecte hasMissingFields = true si githubUsername absent sur unifié', () => {
    const withUnifie: CandidateRaw = {
      ...base,
      githubUsername: null as unknown as string, // champ manquant
      email: 'john@example.com',
      unifieDriveId: 'drive-unifie-1',
      unifieDriveName: 'CV_Unifie.pdf',
      unifieDriveLink: null,
    };

    const result = mapCandidateRawToResumeListItems(withUnifie);
    expect(result[0].hasMissingFields).toBe(true);
  });

  // FIX : email absent (null) sur un unifié → hasMissingFields = true
  it('détecte hasMissingFields = true si email absent sur unifié', () => {
    const withUnifie: CandidateRaw = {
      ...base,
      email: null as unknown as string, // champ manquant
      githubUsername: 'john-doe',
      unifieDriveId: 'drive-unifie-1',
      unifieDriveName: 'CV_Unifie.pdf',
      unifieDriveLink: null,
    };

    const result = mapCandidateRawToResumeListItems(withUnifie);
    expect(result[0].hasMissingFields).toBe(true);
  });

  it('hasMissingFields = false sur un ResumeListItem brut même si champs absents', () => {
    // Un item brut a toujours hasMissingFields = false, peu importe les champs
    const result = mapCandidateRawToResumeListItems({
      ...base,
      githubUsername: null as unknown as string,
      email: null as unknown as string,
    });
    // Type brut → hasMissingFields toujours false
    expect(result[0].hasMissingFields).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('mapScoredJobPost', () => {
  it('conserve les valeurs existantes sans les écraser', () => {
    const result = mapScoredJobPost(baseScoredJobPost);

    expect(result.fileId).toBe('file-1');
    expect(result.fileName).toBe('Offre Dev.pdf');
    expect(result.jobTitle).toBe('Développeur Frontend');
    expect(result.scoreGlobal).toBe(82);
    expect(result.status).toBe('MATCH');
    expect(result.detail.recommendation).toBe('ACCEPTED');
    expect(result.detail.technicalSkills.score).toBe(80);
  });

  it('applique les valeurs par défaut quand les champs sont manquants', () => {
    const empty = {} as ScoredJobPost;
    const result = mapScoredJobPost(empty);

    expect(result.fileId).toBe('');
    expect(result.fileName).toBe('Sans nom');
    expect(result.jobTitle).toBe('Poste inconnu');
    expect(result.scoreGlobal).toBe(0);
    expect(result.status).toBe('NO_MATCH');
    expect(result.detail.scoreGlobal).toBe(0);
    expect(result.detail.recommendation).toBe('REJECTED');
    expect(result.detail.resume).toBe('');
    expect(result.detail.strengths).toEqual([]);
    expect(result.detail.weaknesses).toEqual([]);
    expect(result.detail.technicalSkills).toEqual({ score: 0, detail: '' });
    expect(result.detail.experience).toEqual({ score: 0, detail: '' });
    expect(result.detail.education).toEqual({ score: 0, detail: '' });
    expect(result.detail.softSkills).toEqual({ score: 0, detail: '' });
    expect(result.detail.languages).toEqual({ score: 0, detail: '' });
  });

  it('applique les valeurs par défaut sur les critères partiellement manquants', () => {
    const partial: ScoredJobPost = {
      ...baseScoredJobPost,
      detail: {
        ...baseScoredJobPost.detail,
        technicalSkills: undefined as unknown as { score: number; detail: string },
      },
    };

    const result = mapScoredJobPost(partial);
    expect(result.detail.technicalSkills).toEqual({ score: 0, detail: '' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('mapScoringResult', () => {
  it('conserve les champs existants et mappe les matches', () => {
    const result = mapScoringResult(baseScoringResult);

    expect(result.candidateId).toBe('cand-1');
    expect(result.totalMatch).toBe(2);
    expect(result.matches).toHaveLength(1);
    expect(result.matches![0].fileId).toBe('file-1');
  });

  it('retourne totalMatch à 0 si absent', () => {
    const result = mapScoringResult({
      ...baseScoringResult,
      totalMatch: undefined as unknown as number,
    });
    expect(result.totalMatch).toBe(0);
  });

  it('retourne matches à null si absent', () => {
    const result = mapScoringResult({ ...baseScoringResult, matches: null });
    expect(result.matches).toBeNull();
  });

  it('mappe chaque match via mapScoredJobPost', () => {
    const result = mapScoringResult(baseScoringResult);
    expect(result.matches![0].fileName).toBe('Offre Dev.pdf');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('mapTriggerResponseToScoringResult', () => {
  it('construit un ScoringResult depuis la réponse de déclenchement', () => {
    const result = mapTriggerResponseToScoringResult('cand-1', baseTriggerResponse);

    expect(result.id).toBe('scoring-42');
    expect(result.candidateId).toBe('cand-1');
    expect(result.status).toBe('done');
    expect(result.totalMatch).toBe(1);
    expect(result.createdAt).toBe('2024-03-02T00:00:00Z');
    expect(result.completedAt).toBe('2024-03-02T00:00:00Z');
  });

  it('mappe les matches via mapScoredJobPost', () => {
    const result = mapTriggerResponseToScoringResult('cand-1', baseTriggerResponse);
    expect(result.matches).toHaveLength(1);
    expect(result.matches![0].fileId).toBe('file-1');
  });

  it('retourne totalMatch à 0 si absent', () => {
    const result = mapTriggerResponseToScoringResult('cand-1', {
      ...baseTriggerResponse,
      totalMatch: undefined as unknown as number,
    });
    expect(result.totalMatch).toBe(0);
  });

  it('retourne matches à null si absent', () => {
    const result = mapTriggerResponseToScoringResult('cand-1', {
      ...baseTriggerResponse,
      matches: null as unknown as ScoredJobPost[],
    });
    expect(result.matches).toBeNull();
  });

  it('retourne completedAt vide si absent', () => {
    const result = mapTriggerResponseToScoringResult('cand-1', {
      ...baseTriggerResponse,
      completedAt: undefined as unknown as string,
    });
    expect(result.createdAt).toBe('');
    expect(result.completedAt).toBeNull();
  });
});
