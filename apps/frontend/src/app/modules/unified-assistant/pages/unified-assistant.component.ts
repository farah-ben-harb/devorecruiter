import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MarkdownModule } from 'ngx-markdown';

import { UnifiedAssistantService } from '../services/unified-assistant.service';
import { UnifiedAssistantFacade } from '../states/unified-assistant.facade';
import { UnifiedAssistantMapper } from '../mappers/unified-assistant.mapper';
import { AuthService } from '../../auth/services/auth.service';

import {
  UnifiedConversation,
  UnifiedMessage,
  AssistantMode,
  ApiStreamEvent,
} from '../models/unified-assistant.model';

@Component({
  selector: 'app-unified-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, DatePipe],
  templateUrl: './unified-assistant.component.html',
})
export class UnifiedAssistantComponent implements OnInit, OnDestroy {
  @ViewChild('messagesBox') messagesBox!: ElementRef;

  protected readonly facade = inject(UnifiedAssistantFacade);
  private readonly service = inject(UnifiedAssistantService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly currentMessages$ = this.facade.currentMessages$;
  readonly isLoading$ = this.facade.isLoading$;
  readonly hasMessages$ = this.facade.hasMessages$;
  readonly showSidebar$ = this.facade.showSidebar$;
  readonly conversations$ = this.facade.conversations$;
  readonly activeConversation$ = this.facade.activeConversation$;
  readonly error$ = this.facade.error$;
  readonly detectedMode$ = this.facade.detectedMode$;

  userInput = '';
  currentUser: { name: string; picture: string | null } | null = null;

  // Menu contextuel sidebar
  openMenuId: string | number | null = null;
  showDeleteModal = false;
  pendingDeleteId: string | number | null = null;
  showRenameModal = false;
  pendingRenameId: string | number | null = null;
  renameValue = '';

  readonly suggestions = [
    { icon: '💻', text: 'Comment fonctionne Docker ?' },
    { icon: '☁️', text: 'Explique-moi Kubernetes' },
    { icon: '🔒', text: "Qu'est-ce que JWT ?" },
    { icon: '🏖️', text: 'Combien de jours de congés ai-je ?' },
    { icon: '💰', text: 'Quel est le salaire du Directeur Général ?' },
    { icon: '⚖️', text: 'Quelles sont les sanctions disciplinaires ?' },
  ];

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.currentUser = user
      ? { name: `${user.firstName} ${user.lastName}`, picture: user.picture ?? null }
      : null;
    this.loadAllConversations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Chargement initial — fusionne IT + RH ───────────────

  private loadAllConversations(): void {
    let itDone = false;
    let rhDone = false;
    let itConvs: UnifiedConversation[] = [];
    let rhConvs: UnifiedConversation[] = [];

    const merge = () => {
      if (!itDone || !rhDone) return;
      this.facade.setConversations([...itConvs, ...rhConvs]);
    };

    this.service
      .getItConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (convs) => {
          itConvs = convs.map((c) => ({
            id: c.id,
            title: c.title,
            mode: 'it' as AssistantMode,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
            isPinned: c.isPinned,
          }));
          itDone = true;
          merge();
        },
        error: () => {
          itDone = true;
          merge();
        },
      });

    this.service
      .getRhSidebarHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          rhConvs = res.conversations.map((c) => ({
            id: c.id,
            title: c.title,
            mode: 'rh' as AssistantMode,
            createdAt: new Date(c.createdAt),
            isPinned: c.isPinned,
            isActive: c.isActive,
          }));
          rhDone = true;
          merge();
        },
        error: () => {
          rhDone = true;
          merge();
        },
      });
  }

  // ─── Envoi message ───────────────────────────────────────

  sendMessage(text?: string): void {
    const content = (text ?? this.userInput).trim();
    if (!content || this.facade.snapshot.status === 'loading') return;

    this.userInput = '';
    this.facade.setLoading();
    this.facade.addUserMessage(content);
    this.facade.addLoadingMessage();
    this.scrollToBottom();

    const activeConv = this.facade.snapshot.conversations.find(
      (c) => c.id === this.facade.snapshot.activeConversationId,
    );

    if (!activeConv) {
      // Pas de conversation active : on crée une IT par défaut
      // (le classifier va de toute façon décider du vrai mode)
      this.service
        .createItConversation('Nouvelle conversation')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (conv) => {
            const unified: UnifiedConversation = {
              id: conv.id,
              title: conv.title,
              mode: 'it',
              createdAt: new Date(conv.createdAt),
              updatedAt: new Date(conv.updatedAt),
              isPinned: false,
            };
            this.facade.addConversation(unified);
            this.facade.setActiveConversation(conv.id);
            this.doStream(conv.id, content);
          },
          error: () => this.facade.replaceLoadingWithError(),
        });
    } else {
      this.doStream(activeConv.id, content);
    }
  }

  private doStream(conversationId: string | number, content: string): void {
    const messages = this.facade.snapshot.currentMessages
      .filter((m) => !m.isLoading)
      .map((m) => ({ role: m.role, content: m.content }));

    this.service.chatStream(
      String(conversationId),
      messages,
      // onMode — classifier a tranché
      (mode) => {
        this.facade.setDetectedMode(mode);
        // Mettre le mode sur le dernier message user
        const msgs = [...this.facade.snapshot.currentMessages];
        const userIdx = msgs.map((m) => m.role).lastIndexOf('user');
        if (userIdx !== -1) msgs[userIdx] = { ...msgs[userIdx], mode };
        this.facade.setCurrentMessages(msgs);
      },
      // onChunk
      (chunk) => {
        this.facade.appendChunkToLastMessage(chunk);
        this.scrollToBottom();
      },
      // onDone
      (event: ApiStreamEvent) => {
        this.facade.finalizeLastMessage({
          mode: event.mode ?? this.facade.snapshot.detectedMode ?? 'it',
          sources: event.sources ?? [],
        });

        // Mise à jour titre IT
        if (event.title && event.mode === 'it') {
          this.facade.updateConversationTitle(conversationId, event.title);
        }

        // Si RH → la conv RH créée par le backend est différente
        // On met à jour la sidebar avec le vrai ID RH
        if (event.mode === 'rh' && event.conversationId) {
          const rhConv: UnifiedConversation = {
            id: event.conversationId as number,
            title: content.length > 50 ? content.substring(0, 50) + '...' : content,
            mode: 'rh',
            createdAt: new Date(),
            isPinned: false,
          };
          this.facade.updateConversationTitle(conversationId, rhConv.title);
          // Recharger pour avoir le vrai titre RH
          setTimeout(() => this.reloadRhConversations(), 800);
        }

        this.scrollToBottom();
        this.cdr.detectChanges();
      },
      // onError
      () => this.facade.replaceLoadingWithError(),
    );
  }

  private reloadRhConversations(): void {
    this.service
      .getRhSidebarHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const current = this.facade.snapshot.conversations.filter((c) => c.mode === 'it');
          const rh: UnifiedConversation[] = res.conversations.map((c) => ({
            id: c.id,
            title: c.title,
            mode: 'rh' as AssistantMode,
            createdAt: new Date(c.createdAt),
            isPinned: c.isPinned,
            isActive: c.isActive,
          }));
          this.facade.setConversations([...current, ...rh]);
          this.cdr.detectChanges();
        },
      });
  }

  // ─── Sélection conversation ──────────────────────────────

  selectConversation(conv: UnifiedConversation): void {
    this.facade.setActiveConversation(conv.id);
    this.facade.setDetectedMode(conv.mode);

    if (conv.mode === 'it') {
      this.service
        .getItMessages(String(conv.id))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (msgs) => {
            this.facade.setCurrentMessages(
              msgs.map((m) => UnifiedAssistantMapper.fromItMessage(m)),
            );
            this.scrollToBottom();
          },
        });
    } else {
      this.service
        .getRhConversationById(conv.id as number)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.facade.setCurrentMessages(
              res.messages.map((m) => UnifiedAssistantMapper.fromRhMessage(m)),
            );
            this.scrollToBottom();
          },
        });
    }
  }

  // ─── Actions sidebar ─────────────────────────────────────

  newConversation(): void {
    this.facade.clearCurrentMessages();
    this.openMenuId = null;
  }

  toggleMenu(event: Event, id: string | number): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  onPin(event: Event, conv: UnifiedConversation): void {
    event.stopPropagation();
    const newPinned = !conv.isPinned;
    this.facade.updateConversationPin(conv.id, newPinned);
    this.openMenuId = null;

    if (conv.mode === 'it') {
      this.service
        .updateItConversation(String(conv.id), { isPinned: newPinned })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: () => this.facade.updateConversationPin(conv.id, !newPinned),
        });
    } else {
      this.service
        .pinRhConversation(conv.id as number, newPinned)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: () => this.facade.updateConversationPin(conv.id, !newPinned),
        });
    }
  }

  onRenameOpen(event: Event, conv: UnifiedConversation): void {
    event.stopPropagation();
    this.renameValue = conv.title;
    this.pendingRenameId = conv.id;
    this.showRenameModal = true;
    this.openMenuId = null;
  }

  confirmRename(): void {
    const id = this.pendingRenameId;
    const title = this.renameValue.trim();
    if (!id || !title) return;

    const conv = this.facade.snapshot.conversations.find((c: UnifiedConversation) => c.id === id);
    if (!conv) return;

    this.facade.updateConversationTitle(id, title);

    if (conv.mode === 'it') {
      this.service
        .updateItConversation(String(id), { title })
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    } else {
      this.service
        .renameRhConversation(id as number, title)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
    this.cancelRename();
  }

  cancelRename(): void {
    this.showRenameModal = false;
    this.pendingRenameId = null;
    this.renameValue = '';
  }

  onDeleteOpen(event: Event, id: string | number): void {
    event.stopPropagation();
    this.pendingDeleteId = id;
    this.showDeleteModal = true;
    this.openMenuId = null;
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId;
    if (id === null) return;

    const conv = this.facade.snapshot.conversations.find((c: UnifiedConversation) => c.id === id);
    if (!conv) return;

    if (conv.mode === 'it') {
      this.service
        .deleteItConversation(String(id))
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: () => this.facade.removeConversation(id) });
    } else {
      this.service
        .deleteRhConversation(id as number)
        .pipe(takeUntil(this.destroy$))
        .subscribe({ next: () => this.facade.removeConversation(id) });
    }
    this.cancelDelete();
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.pendingDeleteId = null;
  }

  getPendingDeleteTitle(): string {
    return (
      this.facade.snapshot.conversations.find(
        (c: UnifiedConversation) => c.id === this.pendingDeleteId,
      )?.title ?? 'cette conversation'
    );
  }

  // ─── UI helpers ──────────────────────────────────────────

  toggleSidebar(): void {
    this.facade.toggleSidebar();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesBox) {
        this.messagesBox.nativeElement.scrollTop = this.messagesBox.nativeElement.scrollHeight;
      }
    }, 80);
  }

  trackByConv(_: number, c: UnifiedConversation): string | number {
    return c.id;
  }

  trackByMsg(_: number, m: UnifiedMessage): string {
    return `${m.role}-${m.timestamp?.getTime()}-${m.id}`;
  }

  getModeColor(mode: AssistantMode | null | undefined): string {
    if (mode === 'rh') return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
    if (mode === 'it')
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300';
    return '';
  }

  getModeIcon(mode: AssistantMode | null | undefined): string {
    if (mode === 'rh') return '🏢';
    if (mode === 'it') return '💻';
    return '🤖';
  }
}
