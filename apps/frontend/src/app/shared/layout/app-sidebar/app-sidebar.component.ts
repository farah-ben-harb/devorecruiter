import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { SidebarService } from '../../../shared/services/sidebar/sidebar.service';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SafeHtmlPipe } from '../../pipe/safe-html.pipe';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../modules/auth/services/auth.service';
import { AppIconComponent } from '../../../core/icons/components/icon.component';
import { ALL_NAV_ITEMS, NavItem } from './app-sidebar.model';

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [NgClass, NgStyle, RouterModule, SafeHtmlPipe, AppIconComponent],
  templateUrl: './app-sidebar.component.html',
})
export class AppSidebarComponent implements OnInit, OnDestroy {
  readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  navItems: NavItem[] = [];
  openSubmenu: string | null | number = null;
  subMenuHeights: { [key: string]: number } = {};
  @ViewChildren('subMenu') subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded = this.sidebarService.isExpanded;
  readonly isMobileOpen = this.sidebarService.isMobileOpen;
  readonly isHovered = this.sidebarService.isHovered;

  private subscription = new Subscription();

  ngOnInit() {
    const roles = this.authService.getRoles();
    this.navItems = ALL_NAV_ITEMS.filter(
      (item) => !item.roles || item.roles.some((r) => roles.includes(r)),
    );
    this.subscription.add(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      }),
    );

    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  isActive(path: string): boolean {
    if (path === '/') return this.router.url === '/';
    return this.router.url.startsWith(path);
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;
    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;
      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
        }
      });
    }
  }

  onSidebarMouseEnter() {
    if (!this.sidebarService.isExpanded()) {
      this.sidebarService.setHovered(true);
    }
  }

  onSubmenuClick() {
    if (window.innerWidth < 1280) {
      this.sidebarService.setMobileOpen(false);
    }
  }

  private setActiveMenuFromRoute(currentUrl: string) {
    this.navItems.forEach((nav, i) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (currentUrl === subItem.path) {
            const key = `main-${i}`;
            this.openSubmenu = key;
            setTimeout(() => {
              const el = document.getElementById(key);
              if (el) {
                this.subMenuHeights[key] = el.scrollHeight;
              }
            });
          }
        });
      }
    });
  }
}
