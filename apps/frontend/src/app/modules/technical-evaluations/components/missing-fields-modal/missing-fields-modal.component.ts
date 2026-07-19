import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeListItem } from '../../../candidates/models/candidate.model';
import { CandidatesService } from '../../../candidates/services/candidates.service';

@Component({
  selector: 'app-missing-fields-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './missing-fields-modal.component.html',
})
export class MissingFieldsModalComponent implements OnChanges {
  @Input() target!: ResumeListItem;
  @Output() closeModal = new EventEmitter<void>();

  @Output() fieldsSaved = new EventEmitter<ResumeListItem>();

  private readonly candidatesService = inject(CandidatesService);

  readonly saving = signal(false);

  githubUsernameInput = '';
  emailInput = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['target'] && this.target) {
      this.githubUsernameInput = this.target.githubUsername ?? '';
      this.emailInput = this.target.email ?? '';
    }
  }

  save(): void {
    if (!this.target) return;
    this.saving.set(true);

    this.candidatesService
      .updateFields(this.target.id, {
        githubUsername: this.githubUsernameInput || undefined,
        email: this.emailInput || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          const updated: ResumeListItem = {
            ...this.target,
            githubUsername: this.githubUsernameInput,
            email: this.emailInput,
            hasMissingFields: false,
          };
          this.fieldsSaved.emit(updated);
          this.closeModal.emit();
        },
        error: (err) => {
          this.saving.set(false);
          console.error('Erreur saveFields', err);
        },
      });
  }

  close(): void {
    this.closeModal.emit();
  }
}
