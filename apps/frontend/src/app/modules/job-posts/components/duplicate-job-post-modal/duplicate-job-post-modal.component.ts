import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DuplicateJobPostPayload, UploadedFile } from '../../models/job-post.model';

@Component({
  selector: 'app-duplicate-job-post-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './duplicate-job-post-modal.component.html',
})
export class DuplicateJobPostModalComponent implements OnInit {
  @Input() file!: UploadedFile;
  @Input() saving = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<DuplicateJobPostPayload>();

  title = signal('');
  company = signal('');
  hasQcm = signal(false);
  requiresCoding = signal(false);

  ngOnInit(): void {
    this.title.set(this.file.title ?? '');
    this.company.set(this.file.company ?? '');
    this.hasQcm.set(this.file.hasQcm ?? false);
    this.requiresCoding.set(this.file.requiresCoding ?? false);
  }

  onConfirm(): void {
    this.confirm.emit({
      title: this.title(),
      company: this.company(),
      hasQcm: this.hasQcm(),
      requiresCoding: this.requiresCoding(),
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
