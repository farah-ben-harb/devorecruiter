import { Component, inject } from '@angular/core';
import { SidebarService } from '../../../shared/services/sidebar/sidebar.service';
import { CommonModule } from '@angular/common';
import { AppSidebarComponent } from '../app-sidebar/app-sidebar.component';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { ChatbotWidgetComponent } from '@app/modules/chatbot/pages/chatbot-widget.component';

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [
    CommonModule,
    RouterModule,
    AppHeaderComponent,
    AppSidebarComponent,
    ChatbotWidgetComponent,
  ],
  templateUrl: './app-layout.component.html',
})
export class AppLayoutComponent {
  private sidebarService = inject(SidebarService);

  readonly isExpanded = this.sidebarService.isExpanded;
  readonly isHovered = this.sidebarService.isHovered;
  readonly isMobileOpen = this.sidebarService.isMobileOpen;

  closeSidebar() {
    this.sidebarService.setMobileOpen(false);
  }
}
