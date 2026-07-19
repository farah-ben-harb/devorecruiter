import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '@core/icons/components/icon.component';
import {
  RegeneratePayload,
  TechnicalEvaluation,
} from '../../models/technical-evaluation/technical-evaluation.model';

@Component({
  selector: 'app-regenerate-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './regenerate-modal.component.html',
})
export class RegenerateModalComponent {
  @Input() evaluation!: TechnicalEvaluation;
  @Input() regenerating = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<RegeneratePayload>();

  prompt = '';

  submit(): void {
    if (!this.prompt.trim()) return;
    this.confirm.emit({ prompt: this.prompt.trim() });
  }
}
