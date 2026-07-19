import { Component, ElementRef, ViewChild, AfterViewChecked, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotFacade } from '../states/chatbot.facade';

@Component({
  selector: 'app-chatbot-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css'],
})
export class ChatbotWidgetComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  inputText = signal('');

  readonly suggestedQuestions = [
    "Combien j'ai de candidats ?",
    "Combien d'invitations ont été envoyées ?",
    'Quel est le score moyen au QCM ?',
    'Combien de tests techniques sont en cours ?',
  ];

  constructor(readonly facade: ChatbotFacade) {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  async send(): Promise<void> {
    const text = this.inputText().trim();
    if (!text) return;
    this.inputText.set('');
    await this.facade.sendMessage(text);
  }

  async sendSuggestion(question: string): Promise<void> {
    await this.facade.sendMessage(question);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (e) {
      console.error('Something failed', e);
    }
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
