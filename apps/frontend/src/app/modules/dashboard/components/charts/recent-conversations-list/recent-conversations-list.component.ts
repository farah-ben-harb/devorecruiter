import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RecentConversation } from '../../../models/dashboard.model';

@Component({
  selector: 'app-recent-conversations-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './recent-conversations-list.component.html',
})
export class RecentConversationsListComponent {
  readonly conversations = input.required<RecentConversation[]>();
  readonly navigate = output<string>();
}
