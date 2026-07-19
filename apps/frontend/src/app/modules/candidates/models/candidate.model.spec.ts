import { describe, it, expect } from 'vitest';
import { FILTER_OPTIONS } from './candidate.model';

describe('FILTER_OPTIONS', () => {
  it('contient exactement 3 options', () => {
    expect(FILTER_OPTIONS).toHaveLength(3);
  });

  it('contient les valeurs all, brut et unifie', () => {
    const values = FILTER_OPTIONS.map((o) => o.value);
    expect(values).toContain('all');
    expect(values).toContain('brut');
    expect(values).toContain('unifie');
  });

  it('contient les labels corrects', () => {
    const labels = FILTER_OPTIONS.map((o) => o.label);
    expect(labels).toContain('Tous');
    expect(labels).toContain('CVs Bruts');
    expect(labels).toContain('CVs Unifiés');
  });

  it("respecte l'ordre all → brut → unifie", () => {
    expect(FILTER_OPTIONS[0].value).toBe('all');
    expect(FILTER_OPTIONS[1].value).toBe('brut');
    expect(FILTER_OPTIONS[2].value).toBe('unifie');
  });

  it('chaque option possède les propriétés value et label', () => {
    for (const option of FILTER_OPTIONS) {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
    }
  });
});
