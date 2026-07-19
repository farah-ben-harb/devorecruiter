import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReferentInvitationStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-invitations-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invitations-kpi-card.component.html',
})
export class InvitationsKpiCardComponent {
  @Input() stats: ReferentInvitationStats | null = null;
}
