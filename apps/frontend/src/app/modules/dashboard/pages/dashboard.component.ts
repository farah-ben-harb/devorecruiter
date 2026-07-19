import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RoleService } from '@shared/services/roles/role.service';
import { DashboardFacade } from '../state/dashboard.facade';
import { UsersKpiCardComponent } from '../components/kpi-cards/users/users-kpi-card.component';
import { JobPostsKpiCardComponent } from '../components/kpi-cards/job-posts/job-posts-kpi-card.component';
import { CandidatesKpiCardComponent } from '../components/kpi-cards/candidates/candidates-kpi-card.component';
import { EvaluationsKpiCardComponent } from '../components/kpi-cards/evaluations/evaluations-kpi-card.component';
import { InvitationsKpiCardComponent } from '../components/kpi-cards/invitations/invitations-kpi-card.component';
import { RolesDonutChartComponent } from '../components/charts/roles-donut-chart/roles-donut-chart.component';
import { TopClientsChartComponent } from '../components/charts/top-clients-chart/top-clients-chart.component';
import { TopProfilsChartComponent } from '../components/charts/top-profils-chart/top-profils-chart.component';
import { PendingEvaluationsListComponent } from '../components/charts/pending-evaluations-list/pending-evaluations-list.component';
import { DomainsPolarChartComponent } from '../components/charts/domains-polar-chart/domains-polar-chart.component';
import { RecentConversationsListComponent } from '../components/charts/recent-conversations-list/recent-conversations-list.component';
import { ConversationsKpiCardComponent } from '../components/kpi-cards/conversations/conversations-kpi-card.component';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    UsersKpiCardComponent,
    JobPostsKpiCardComponent,
    CandidatesKpiCardComponent,
    EvaluationsKpiCardComponent,
    InvitationsKpiCardComponent,
    RolesDonutChartComponent,
    TopClientsChartComponent,
    TopProfilsChartComponent,
    PendingEvaluationsListComponent,
    DomainsPolarChartComponent,
    RecentConversationsListComponent,
    ConversationsKpiCardComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  readonly role = inject(RoleService);
  readonly facade = inject(DashboardFacade);
  private readonly router = inject(Router);

  readonly isAdmin = computed(() => this.role.hasRole('ADMIN_RH'));
  readonly isRecruiter = computed(() => this.role.hasRole('TALENT_ACQUISITION'));
  readonly isConsultant = computed(() => this.role.hasRole('CONSULTANT'));
  readonly isReferent = computed(() => this.role.hasRole('TECHNICAL_REFERENT'));

  ngOnInit(): void {
    this.facade.loadAll();
  }

  navigateToEvaluations(jobPostId: number): void {
    this.router.navigate(['/technical-evaluations'], {
      queryParams: { jobPostId },
    });
  }

  navigateToConversation(id: string): void {
    this.router.navigate(['/assistance'], { queryParams: { conversationId: id } });
  }
}
