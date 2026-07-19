import { Component, OnInit, OnDestroy, inject, signal, ViewChild } from '@angular/core';
import { AssistanceFacade } from '../state/assistance.facade';
import { AssistanceService } from '../service/assistance.service';
import { ChatWindowComponent } from '../components/chat-window/chat-window.component';
import { ConversationSidebarComponent } from '../components/conversation-sidebar/conversation-sidebar.component';
import { MessageInputComponent } from '../components/message-input/message-input.component';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-assistance',
  standalone: true,
  imports: [ChatWindowComponent, ConversationSidebarComponent, MessageInputComponent, CommonModule],
  templateUrl: './assistance.component.html',
  styleUrl: './assistance.component.css',
  providers: [AssistanceFacade],
})
export class AssistanceComponent implements OnInit, OnDestroy {
  @ViewChild('chatWindow') private chatWindow!: ChatWindowComponent;
  private messagesLoadedSub?: Subscription;
  protected readonly facade = inject(AssistanceFacade);
  private readonly service = inject(AssistanceService);
  private readonly route = inject(ActivatedRoute);
  readonly sidebarOpen = signal(this.isLargeScreen());

  private resizeListener = () => {};

  private isLargeScreen(): boolean {
    return window.innerWidth >= 768;
  }

  ngOnInit(): void {
    const conversationId = this.route.snapshot.queryParams['conversationId'];

    this.facade.loadConversations(conversationId);

    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((state) => !state);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  onNewConversation(): void {
    this.facade.createConversation();
    if (!this.isLargeScreen()) {
      this.closeSidebar();
    }
  }

  onConversationSelected(id: string): void {
    this.facade.setActiveConversation(id);
    if (!this.isLargeScreen()) {
      this.closeSidebar();
    }
  }

  onConversationDeleted(id: string): void {
    this.facade.deleteConversation(id);
  }

  onConversationPinned(data: { id: string; isPinned: boolean }): void {
    this.facade.pinConversation(data.id, data.isPinned);
  }

  onConversationRenamed(data: { id: string; title: string }): void {
    this.facade.renameConversation(data.id, data.title);
  }

  onSendMessage(content: string): void {
    const convId = this.facade.activeConversationId();

    if (!convId) {
      // Pas de conversation active : on en crée une en BD avant d'envoyer
      this.service.createConversation('Nouvelle conversation').subscribe((conv) => {
        this.facade.addPersistedConversation(conv);
        this.sendFlow(conv.id, content);
      });
    } else {
      this.sendFlow(convId, content);
    }
  }

  private sendFlow(convId: string, content: string): void {
    const isFirst = this.facade.activeMessages().length === 0;

    // Ajouter le message user localement pour l'affichage immédiat
    this.facade.addMessage(convId, 'user', content);
    this.facade.setLoading(true);

    // Le backend gère : appel Ollama + génération du titre + mémoire + sauvegarde
    this.service.sendMessage(convId, this.facade.activeMessages()).subscribe({
      next: (response) => {
        // Ajouter la réponse de l'assistant
        this.facade.addMessage(convId, 'assistant', response.content);

        if (isFirst && response.title) {
          this.facade.updateConversationTitle(convId, response.title);
        }

        this.facade.setLoading(false);
      },
      error: (err) => {
        console.error('Chat error:', err);
        this.facade.addMessage(
          convId,
          'assistant',
          "Une erreur s'est produite. Veuillez réessayer.",
        );
        this.facade.setLoading(false);
      },
    });
  }
}
