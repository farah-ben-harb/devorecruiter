import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RhAssistantService } from '../services/rh-assistant.service';
import { RhAssistantFacade } from '../states/rh-assistant.facade';
import { Message, SidebarConversation } from '../models/rh-assistant.model';
import { AuthService } from '../../auth/services/auth.service';
import { RhConversationSidebarComponent } from '../componenets/rh-conversation-sidebar.component';

@Component({
  selector: 'app-rh-assistant',
  templateUrl: './rh-assistant.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RhConversationSidebarComponent],
})
export class RhAssistantComponent implements OnInit, OnDestroy {
  @ViewChild('messagesBox') messagesBox!: ElementRef;

  currentUser: { name: string; picture: string | null } | null = null;
  private authService = inject(AuthService);
  private service = inject(RhAssistantService);
  public facade = inject(RhAssistantFacade);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);

  // Expose facade streams directly to the template
  messages$ = this.facade.messages$;
  stats$ = this.facade.stats$;
  isLoading$ = this.facade.isLoading$;
  hasMessages$ = this.facade.hasMessages$;
  showSidebar$ = this.facade.showSidebar$;
  conversationId$ = this.facade.conversationId$;
  error$ = this.facade.error$;

  question = '';
  sidebarHistory: SidebarConversation[] = [];
  selectedConversationId: number | null = null;

  suggestions = [
    { icon: '🕐', text: 'Quels sont les horaires de travail ?' },
    { icon: '🏖️', text: 'Combien de jours de congés ai-je ?' },
    { icon: '💰', text: 'Quel est le salaire du Directeur General ?' },
    { icon: '⚖️', text: 'Quelles sont les sanctions disciplinaires ?' },
    { icon: '💻', text: 'Quelles sont les règles du télétravail ?' },
    { icon: '📋', text: 'Quelles sont les règles de confidentialité ?' },
  ];

  ngOnInit(): void {
    this.loadHistory();
    this.loadStats();
    this.loadSidebarHistory();
    const user = this.authService.getUser();
    this.currentUser = user
      ? { name: `${user.firstName} ${user.lastName}`, picture: user.picture ?? null }
      : null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Load ──────────────────────────────────────────────────────────────────

  loadHistory(): void {
    this.facade.setHistoryLoading();
    this.service
      .getHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.facade.setHistorySuccess(
            history.messages.map((m) => ({
              ...m,
              role: m.role as 'user' | 'assistant',
              sources: m.sources ?? undefined,
              createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
            })),
            history.conversationId,
            history.createdAt,
          );
          this.scrollToBottom();
        },
        error: () => this.facade.setHistoryError("Impossible de charger l'historique."),
      });
  }

  loadStats(): void {
    this.service
      .getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => this.facade.setStats(stats),
        error: () => {},
      });
  }

  loadSidebarHistory(): void {
    this.service
      .getSidebarHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.sidebarHistory = res.conversations;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  // ─── Messaging ─────────────────────────────────────────────────────────────

  sendMessage(text?: string): void {
    const q = (text || this.question).trim();
    if (!q || this.facade.snapshot.status === 'loading') return;

    this.question = '';
    this.facade.setAsking();
    this.facade.addUserMessage(q);
    this.facade.addLoadingMessage();
    this.scrollToBottom();

    this.service
      .ask(q)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const message: Message = {
            role: 'assistant',
            content: res.response,
            sources: res.sources,
            createdAt: res.timestamp,
            isLoading: false,
          };
          this.facade.replaceLoadingWithResponse(message);
          this.facade.setConversationId(res.conversationId);

          // ✅ Ajouter immédiatement la conversation dans la sidebar sans attendre le serveur
          const existingIndex = this.sidebarHistory.findIndex((c) => c.id === res.conversationId);
          if (existingIndex === -1) {
            // Nouvelle conversation → l'ajouter en tête avec un titre provisoire
            const title = q.length > 40 ? q.substring(0, 40) + '...' : q;
            const newConv: SidebarConversation = {
              id: res.conversationId,
              title,
              createdAt: new Date().toISOString(),
              isActive: true,
              isPinned: false,
            };
            this.sidebarHistory = [newConv, ...this.sidebarHistory];
            this.selectedConversationId = res.conversationId;
            this.cdr.detectChanges();
          }

          this.loadStats();
          // Sync avec le vrai titre généré par le backend
          setTimeout(() => this.loadSidebarHistory(), 800);
          this.scrollToBottom();
        },
        error: () => {
          this.facade.replaceLoadingWithError();
          this.scrollToBottom();
        },
      });
  }

  resetChat(): void {
    this.service
      .reset()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.facade.resetConversation();
          this.selectedConversationId = null;
          this.loadSidebarHistory();
          this.loadStats();
        },
      });
  }

  useSuggestion(text: string): void {
    this.sendMessage(text);
  }

  // ─── UI ────────────────────────────────────────────────────────────────────

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleSidebar(): void {
    this.facade.toggleSidebar();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesBox) {
        this.messagesBox.nativeElement.scrollTop = this.messagesBox.nativeElement.scrollHeight;
      }
    }, 100);
  }

  trackByMessage(_: number, msg: Message): string {
    return `${msg.role}-${msg.createdAt}-${msg.id}`;
  }

  // ─── Sidebar event handlers ────────────────────────────────────────────────

  onConversationSelected(conv: SidebarConversation): void {
    this.selectedConversationId = conv.id;
    this.service
      .getConversationById(conv.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.facade.setHistorySuccess(
            res.messages.map((m) => ({
              ...m,
              role: m.role as 'user' | 'assistant',
              sources: m.sources ?? undefined,
              createdAt: new Date(m.createdAt),
            })),
            res.conversationId,
            new Date(conv.createdAt),
          );
          this.scrollToBottom();
        },
        error: () => {},
      });
  }

  onConversationPinned(event: { id: number; isPinned: boolean }): void {
    this.service
      .pinConversation(event.id, event.isPinned)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sidebarHistory = this.sidebarHistory.map((c) =>
            c.id === event.id ? { ...c, isPinned: event.isPinned } : c,
          );
          this.sidebarHistory = [
            ...this.sidebarHistory.filter((c) => c.isPinned),
            ...this.sidebarHistory.filter((c) => !c.isPinned),
          ];
          this.cdr.detectChanges();
        },
      });
  }

  onConversationRenamed(event: { id: number; title: string }): void {
    this.service
      .renameConversation(event.id, event.title)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sidebarHistory = this.sidebarHistory.map((c) =>
            c.id === event.id ? { ...c, title: event.title } : c,
          );
          this.cdr.detectChanges();
        },
      });
  }

  onConversationDeleted(id: number): void {
    this.service
      .deleteConversation(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sidebarHistory = this.sidebarHistory.filter((c) => c.id !== id);
          if (this.selectedConversationId === id) {
            this.selectedConversationId = null;
            this.facade.resetConversation();
          }
          this.cdr.detectChanges();
        },
      });
  }
}
