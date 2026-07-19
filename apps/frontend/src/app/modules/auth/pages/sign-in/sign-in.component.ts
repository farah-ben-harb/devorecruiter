import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ThemeService } from '@shared/services/theme/theme.service';
import { environment } from '@env/environment';
import { AppIconComponent } from '@core/icons/components/icon.component';

@Component({
  standalone: true,
  selector: 'app-sign-in',
  imports: [RouterModule, AppIconComponent],
  templateUrl: './sign-in.component.html',
  styles: ``,
})
export class SignInComponent implements OnInit {
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['error']) {
        switch (params['error']) {
          case 'not_devoteam':
            this.errorMessage = 'Accès réservé aux emails Devoteam.';
            break;
          case 'not_found':
            this.errorMessage = "Votre compte n'existe pas dans le système.";
            break;
          case 'inactive':
            this.errorMessage =
              'Accès impossible : votre compte est inactif. Veuillez contacter votre administrateur RH !';
            break;
          default:
            this.errorMessage = 'Erreur de connexion, réessayez.';
        }
      }
    });
  }

  get isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
