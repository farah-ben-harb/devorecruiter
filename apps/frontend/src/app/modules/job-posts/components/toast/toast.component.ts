import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast } from '../../models/job-post.model';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
})
export class ToastComponent {
  readonly toast = input.required<Toast>();
  readonly dismiss = output<void>();
}
