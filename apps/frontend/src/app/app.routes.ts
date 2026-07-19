import { Routes } from '@angular/router';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ROLES } from '@shared/constants/roles.constants';

export const routes: Routes = [
  {
    path: 'signin',
    loadComponent: () =>
      import('./modules/auth/pages/sign-in/sign-in.component').then((m) => m.SignInComponent),
    title: 'Connexion',
  },

  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./modules/auth/pages/auth-callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'quiz/:token',
    loadComponent: () =>
      import('./modules/technical-evaluations/components/quiz/quiz-page.component').then(
        (m) => m.QuizPageComponent,
      ),
  },

  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',

        loadComponent: () =>
          import('./modules/dashboard/pages/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Tableau de bord',
      },
      {
        path: 'posts',
        loadComponent: () =>
          import('./modules/job-posts/pages/job-posts.component').then((m) => m.JobPostComponent),
        title: 'Fiches de poste',
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH, ROLES.TALENT_ACQUISITION, ROLES.TECHNICAL_REFERENT] },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./modules/users/pages/users.component').then((m) => m.UsersComponent),
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH] },
        title: 'Utilisateurs',
      },
      {
        path: 'candidates',
        loadComponent: () =>
          import('./modules/candidates/pages/candidates.component').then(
            (m) => m.CandidatesComponent,
          ),
        title: 'Candidats',
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH, ROLES.TALENT_ACQUISITION, ROLES.TECHNICAL_REFERENT] },
      },

      {
        path: 'technical-evaluations',
        loadComponent: () =>
          import('./modules/technical-evaluations/pages/technical-evaluations.component').then(
            (m) => m.TechnicalEvaluationsComponent,
          ),
        title: 'Évaluations techniques',
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH, ROLES.TALENT_ACQUISITION, ROLES.TECHNICAL_REFERENT] },
      },
      {
        path: 'assistance',
        loadComponent: () =>
          import('./modules/assistance/pages/assistance.component').then(
            (m) => m.AssistanceComponent,
          ),
        title: 'Assistance',
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH, ROLES.CONSULTANT] },
      },
      {
        path: 'assistant',
        loadComponent: () =>
          import('./modules/unified-assistant/pages/unified-assistant.component').then(
            (m) => m.UnifiedAssistantComponent,
          ),
        title: 'Assistance',
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH, ROLES.CONSULTANT] },
      },

      {
        path: 'rh-assistant',
        loadComponent: () =>
          import('./modules/rh-assistant/pages/rh-assistant.component').then(
            (m) => m.RhAssistantComponent,
          ),
        title: 'Assistant RH',
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH, ROLES.CONSULTANT, ROLES.TECHNICAL_REFERENT] },
      },

      {
        path: 'job-offers',
        loadComponent: () =>
          import('./modules/job-offers/pages/job-offers.component').then(
            (m) => m.JobOffersComponent,
          ),
        title: 'Offres LinkedIn',
        canActivate: [roleGuard],
        data: { roles: [ROLES.ADMIN_RH, ROLES.TALENT_ACQUISITION] },
      },
    ],
  },

  {
    path: '**',
    loadComponent: () =>
      import('./shared/layout/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: '404 | DevoRecruiter',
  },
];
