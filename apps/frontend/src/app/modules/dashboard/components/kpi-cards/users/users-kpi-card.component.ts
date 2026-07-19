import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserStats } from '../../../models/dashboard.model';

@Component({
  selector: 'app-users-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-kpi-card.component.html',
})
export class UsersKpiCardComponent {
  readonly stats = input.required<UserStats | null>();
  private readonly router = inject(Router);
  navigate(): void {
    this.router.navigate(['/users']);
  }
}
