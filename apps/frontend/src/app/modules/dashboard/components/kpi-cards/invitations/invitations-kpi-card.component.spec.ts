import { describe, expect, it } from 'vitest';

import { InvitationsKpiCardComponent } from './invitations-kpi-card.component';

describe('InvitationsKpiCardComponent', () => {
  it('accepts an invitation stats input', () => {
    const component = new InvitationsKpiCardComponent();
    const stats = { total: 3, accepted: 2, pending: 1 } as never;

    component.stats = stats;

    expect(component.stats).toBe(stats);
  });
});
