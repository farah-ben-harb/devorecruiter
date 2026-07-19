import { describe, expect, it } from 'vitest';

import { TestBed } from '@angular/core/testing';

import { PendingEvaluationsListComponent } from './pending-evaluations-list.component';

describe('PendingEvaluationsListComponent', () => {
  it('returns the expected label and class for known statuses', () => {
    const component = TestBed.runInInjectionContext(() => new PendingEvaluationsListComponent());

    expect(component.statusLabel('pending')).toBe('En attente');
    expect(component.statusLabel('completed')).toBe('Terminée');
    expect(component.statusLabel('other')).toBe('other');
    expect(component.statusClass('pending')).toBe('bg-amber-100 text-amber-700');
    expect(component.statusClass('completed')).toBe('bg-blue-100 text-blue-700');
    expect(component.statusClass('other')).toBe('');
  });
});
