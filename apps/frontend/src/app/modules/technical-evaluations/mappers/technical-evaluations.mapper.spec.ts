import { describe, it, expect } from 'vitest';
import { TechnicalEvaluation } from '../models/technical-evaluation/technical-evaluation.model';
import { mapTechnicalEvaluation, mapTechnicalEvaluations } from './technical-evaluations.mapper';

function createRawEvaluation(overrides: Partial<TechnicalEvaluation> = {}): TechnicalEvaluation {
  return {
    id: 1,
    jobPostId: 10,
    title: 'Développeur Angular',
    status: 'pending',
    version: '1.0',
    name: null,
    index: null,
    ...overrides,
  } as TechnicalEvaluation;
}

describe('mapTechnicalEvaluation', () => {
  it('conserve les champs déjà présents', () => {
    const raw = createRawEvaluation({
      id: 42,
      jobPostId: 7,
      title: 'Lead Dev',
      status: 'approved',
      version: '2.3',
      name: 'Évaluation finale',
      driveFileId: 'abc123',
      driveFileUrl: 'https://drive.google.com/abc123',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      index: 3,
    });

    const result = mapTechnicalEvaluation(raw);

    expect(result.id).toBe(42);
    expect(result.jobPostId).toBe(7);
    expect(result.title).toBe('Lead Dev');
    expect(result.status).toBe('approved');
    expect(result.version).toBe('2.3');
    expect(result.name).toBe('Évaluation finale');
    expect(result.driveFileId).toBe('abc123');
    expect(result.driveFileUrl).toBe('https://drive.google.com/abc123');
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2024-01-02T00:00:00.000Z');
  });

  it('applique les valeurs par défaut quand les champs sont absents', () => {
    const raw = createRawEvaluation({
      status: undefined,
      version: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      driveFileId: undefined,
      driveFileUrl: undefined,
    });

    const result = mapTechnicalEvaluation(raw);

    expect(result.status).toBe('pending');
    expect(result.version).toBe('1.0');
    expect(result.createdAt).toBe('');
    expect(result.updatedAt).toBe('');
    expect(result.name).toBeNull();
    expect(result.driveFileId).toBeUndefined();
    expect(result.driveFileUrl).toBeUndefined();
  });

  it('remplace un name vide (undefined) par null', () => {
    const raw = createRawEvaluation({ name: undefined });

    const result = mapTechnicalEvaluation(raw);

    expect(result.name).toBeNull();
  });

  it('ne touche pas aux autres champs optionnels non gérés explicitement (spread)', () => {
    const raw = createRawEvaluation({
      htmlContent: '<p>contenu</p>',
      gitRepoUrl: 'https://github.com/org/repo',
      quizContent: '{"q":1}',
      quizAnswerKey: '{"a":1}',
    });

    const result = mapTechnicalEvaluation(raw);

    expect(result.htmlContent).toBe('<p>contenu</p>');
    expect(result.gitRepoUrl).toBe('https://github.com/org/repo');
    expect(result.quizContent).toBe('{"q":1}');
    expect(result.quizAnswerKey).toBe('{"a":1}');
  });
});

describe('mapTechnicalEvaluations', () => {
  it('mappe une liste vide', () => {
    const result = mapTechnicalEvaluations([]);
    expect(result).toEqual([]);
  });

  it('mappe une liste de plusieurs évaluations', () => {
    const raw1 = createRawEvaluation({ id: 1, name: 'Éval 1' });
    const raw2 = createRawEvaluation({ id: 2, name: null, status: 'completed' });

    const result = mapTechnicalEvaluations([raw1, raw2]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[0].name).toBe('Éval 1');
    expect(result[1].id).toBe(2);
    expect(result[1].status).toBe('completed');
  });
});
