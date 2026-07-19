import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConsultantStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-conversations-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conversations-kpi-card.component.html',
})
export class ConversationsKpiCardComponent {
  @Input() stats: ConsultantStats | null = null;
  private readonly router = inject(Router);

  navigateTo(): void {
    this.router.navigate(['/assistance']);
  }
}
