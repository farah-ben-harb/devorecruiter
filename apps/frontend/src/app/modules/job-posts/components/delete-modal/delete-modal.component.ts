import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadedFile } from '../../models/job-post.model';
import { AppIconComponent } from '@core/icons/components/icon.component';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './delete-modal.component.html',
})
export class DeleteModalComponent {
  readonly file = input.required<UploadedFile>();

  readonly cancel = output<void>();
  readonly confirm = output<void>();

  getFileIcon(fileType?: string): string {
    if (!fileType) return '';
    if (fileType.startsWith('image/')) return '';
    if (fileType === 'application/pdf') return '';
    return '';
  }
}
