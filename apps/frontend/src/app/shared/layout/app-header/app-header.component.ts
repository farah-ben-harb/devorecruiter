import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { SidebarService } from '../../../shared/services/sidebar/sidebar.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../../shared/services/theme/theme.service';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { AppIconComponent } from '../../../core/icons/components/icon.component';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterModule, AppIconComponent],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent implements AfterViewInit, OnDestroy, OnInit {
  private readonly sidebarService = inject(SidebarService);

  isOpen = false;
  firstName = '';
  lastName = '';
  email = '';
  picture = '';

  readonly isMobileOpen = this.sidebarService.isMobileOpen;

  @Output() dropdownClose = new EventEmitter<void>();
  @Input() className = '';

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownRef') dropdownRef!: ElementRef<HTMLDivElement>;
  @ViewChild('userMenuBtn') userMenuBtn!: ElementRef<HTMLButtonElement>;

  private readonly handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    // Ferme le dropdown utilisateur si clic en dehors
    if (
      this.isOpen &&
      this.dropdownRef?.nativeElement &&
      !this.userMenuBtn?.nativeElement?.contains(target) &&
      !this.dropdownRef.nativeElement.contains(target)
    ) {
      this.isOpen = false;
      this.dropdownClose.emit();
    }
  };

  ngAfterViewInit() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  ngOnDestroy() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  };

  theme$: ThemeService['theme$'];

  constructor(
    private readonly themeService: ThemeService,
    private readonly authService: AuthService,
  ) {
    this.theme$ = this.themeService.theme$;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.firstName = user.firstName ?? '';
      this.lastName = user.lastName ?? '';
      this.email = user.email ?? '';
      this.picture = user.picture ?? '';
    }
  }

  closeDropdown() {
    this.isOpen = false;
  }

  logout() {
    this.authService.logout();
  }
}
