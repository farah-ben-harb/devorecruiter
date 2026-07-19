import { Component, Output, Input, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './message-input.component.html',
})
export class MessageInputComponent {
  @Output() send = new EventEmitter<string>();
  @Input() isLoading = false;

  protected readonly message = signal<string>('');

  onSend() {
    const text = this.message().trim();
    if (!text || this.isLoading) return;
    this.send.emit(text);
    this.message.set('');
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
}
