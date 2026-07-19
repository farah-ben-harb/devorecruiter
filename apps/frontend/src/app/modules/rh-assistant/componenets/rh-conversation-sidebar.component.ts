import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarConversation } from '../models/rh-assistant.model';

@Component({
  selector: 'app-rh-conversation-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rh-conversation-sidebar.component.html',
})
export class RhConversationSidebarComponent {
  @Input() conversations: SidebarConversation[] = [];
  @Input() selectedConversationId: number | null = null;

  @Output() conversationSelected = new EventEmitter<SidebarConversation>();
  @Output() conversationDeleted = new EventEmitter<number>();
  @Output() conversationPinned = new EventEmitter<{ id: number; isPinned: boolean }>();
  @Output() conversationRenamed = new EventEmitter<{ id: number; title: string }>();
  @Output() newConversation = new EventEmitter<void>();

  @ViewChild('renameInput') renameInputRef!: ElementRef<HTMLInputElement>;

  readonly openMenuId = signal<number | null>(null);

  // ── Delete modal ──────────────────────────────────────────
  readonly showDeleteModal = signal(false);
  readonly pendingDeleteId = signal<number | null>(null);

  // ── Rename modal ──────────────────────────────────────────
  readonly showRenameModal = signal(false);
  readonly pendingRenameId = signal<number | null>(null);
  renameValue = '';

  // Flag pour ignorer le prochain click document après ouverture d'une action
  private _skipNextDocumentClick = false;

  constructor(private readonly elRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Si une action vient d'être déclenchée, on ignore ce click
    if (this._skipNextDocumentClick) {
      this._skipNextDocumentClick = false;
      return;
    }
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.openMenuId.set(null);
    }
  }

  get pinnedConversations(): SidebarConversation[] {
    return this.conversations.filter((c) => c.isPinned);
  }

  get unpinnedConversations(): SidebarConversation[] {
    return this.conversations.filter((c) => !c.isPinned);
  }

  // ── Menu ──────────────────────────────────────────────────
  toggleMenu(event: Event, id: number): void {
    event.stopPropagation();
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── Pin ───────────────────────────────────────────────────
  onPin(event: Event, id: number, isPinned: boolean): void {
    event.stopPropagation();
    this._skipNextDocumentClick = true;
    // Émettre immédiatement sans attendre un second clic
    this.conversationPinned.emit({ id, isPinned: !isPinned });
    this.closeMenu();
  }

  // ── Rename modal ──────────────────────────────────────────
  onRename(event: Event, id: number): void {
    event.stopPropagation();
    const conv = this.conversations.find((c) => c.id === id);
    if (!conv) return;
    this.renameValue = conv.title;
    this.pendingRenameId.set(id);
    this.closeMenu();
    // Ouvrir le modal après que le menu soit fermé
    this.showRenameModal.set(true);
    setTimeout(() => this.renameInputRef?.nativeElement.focus(), 50);
  }

  confirmRename(): void {
    const id = this.pendingRenameId();
    const title = this.renameValue.trim();
    if (id && title) {
      this.conversationRenamed.emit({ id, title });
    }
    this.cancelRename();
  }

  cancelRename(): void {
    this.showRenameModal.set(false);
    this.pendingRenameId.set(null);
    this.renameValue = '';
  }

  onRenameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.confirmRename();
    if (event.key === 'Escape') this.cancelRename();
  }

  // ── Delete modal ──────────────────────────────────────────
  onDelete(event: Event, id: number): void {
    event.stopPropagation();
    this.pendingDeleteId.set(id);
    this.closeMenu();
    // Ouvrir le modal après que le menu soit fermé
    this.showDeleteModal.set(true);
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id !== null) {
      // Marquer pour ignorer le prochain document:click qui va remonter
      this._skipNextDocumentClick = true;
      this.conversationDeleted.emit(id);
    }
    this.cancelDelete();
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.pendingDeleteId.set(null);
  }

  getPendingDeleteTitle(): string {
    const id = this.pendingDeleteId();
    return this.conversations.find((c) => c.id === id)?.title ?? 'cette conversation';
  }
}
