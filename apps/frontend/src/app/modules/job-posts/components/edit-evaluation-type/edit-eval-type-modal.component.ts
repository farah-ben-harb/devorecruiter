import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditEvalTypeResult, UploadedFile } from '../../models/job-post.model';
import { JobPostService } from '../../services/job-posts.service';

@Component({
  selector: 'app-edit-eval-type-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './edit-eval-type-modal.component.html',
})
export class EditEvalTypeModalComponent implements OnInit {
  @Input() file!: UploadedFile;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<EditEvalTypeResult>();

  readonly hasQcm = signal(false);
  readonly requiresCoding = signal(false);
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);

  constructor(private readonly jobPostService: JobPostService) {}

  ngOnInit(): void {
    this.hasQcm.set(this.file.hasQcm ?? false);
    this.requiresCoding.set(this.file.requiresCoding ?? false);
  }

  toggleQcm(checked: boolean): void {
    this.hasQcm.set(checked);
  }

  toggleCoding(checked: boolean): void {
    this.requiresCoding.set(checked);
  }

  save(): void {
    if (!this.file.id) return;
    const id = Number(this.file.id);
    this.saving.set(true);
    this.errorMsg.set(null);

    Promise.all([
      this.jobPostService.updateRequiresCoding(id, this.requiresCoding()).toPromise(),
      this.jobPostService.updateHasQcm(id, this.hasQcm()).toPromise(),
    ])
      .then(() => {
        this.saving.set(false);
        this.saved.emit({
          hasQcm: this.hasQcm(),
          requiresCoding: this.requiresCoding(),
        });
      })
      .catch(() => {
        this.saving.set(false);
        this.errorMsg.set('Erreur lors de la sauvegarde. Veuillez réessayer.');
      });
  }

  onClose(): void {
    this.close.emit();
  }
}
