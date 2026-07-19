import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  inject,
  NgZone,
} from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { Message } from '../../models/assistance.model';
import { AuthService } from '@modules/auth/services/auth.service';
import hljs from 'highlight.js';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [NgClass, DatePipe, MarkdownModule],
  templateUrl: './chat-window.component.html',
})
export class ChatWindowComponent implements OnChanges, AfterViewInit {
  @Input() messages: Message[] = [];
  @Input() isLoading = false;

  @ViewChild('container') private container!: ElementRef<HTMLElement>;

  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  userPicture = this.authService.getUser()?.picture ?? null;

  private lastConversationFirstId: string | null = null;
  private lastMessageCount = 0;
  private lastAssistantContent = '';
  get messagesReversed(): Message[] {
    return [...this.messages].reverse();
  }
  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['messages']) return;

    const newMessages: Message[] = changes['messages'].currentValue ?? [];
    const firstId = newMessages[0]?.id ?? null;
    const lastMsg = newMessages[newMessages.length - 1];

    const conversationChanged = firstId !== this.lastConversationFirstId;
    const messageAdded = newMessages.length > this.lastMessageCount;
    const streamingChunk =
      lastMsg?.role === 'assistant' && lastMsg.content !== this.lastAssistantContent;

    if (conversationChanged) {
      this.lastConversationFirstId = firstId;
      this.lastAssistantContent = '';
    }

    if (lastMsg?.role === 'assistant') {
      this.lastAssistantContent = lastMsg.content;
    }

    this.lastMessageCount = newMessages.length;

    if (conversationChanged || messageAdded || streamingChunk) {
      this.scrollToBottom();
    }

    // Highlight code blocks
    setTimeout(() => {
      this.el.nativeElement.querySelectorAll('pre code').forEach((block: HTMLElement) => {
        if (!block.dataset['highlighted']) {
          hljs.highlightElement(block);
          block.dataset['highlighted'] = 'true';
        }
      });
    }, 100);
  }

  scrollToBottom(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = this.container?.nativeElement;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        });
      });
    });
  }
}
