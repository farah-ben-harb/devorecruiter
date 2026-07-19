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
import { Conversation, ConversationGroup } from '../../models/assistance.model';

@Component({
  selector: 'app-conversation-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-sidebar.component.html',
})
export class ConversationSidebarComponent {
  @Input() conversations: Conversation[] = [];
  @Input() activeConversationId: string | null = null;
  @Output() conversationSelected = new EventEmitter<string>();
  @Output() conversationDeleted = new EventEmitter<string>();
  @Output() conversationPinned = new EventEmitter<{ id: string; isPinned: boolean }>();
  @Output() conversationRenamed = new EventEmitter<{ id: string; title: string }>();
  @Output() newConversation = new EventEmitter<void>();

  @ViewChild('renameInput') renameInputRef!: ElementRef<HTMLInputElement>;

  readonly openMenuId = signal<string | null>(null);

  // ── Delete modal ─────────────────────────────────────────
  readonly showDeleteModal = signal(false);
  readonly pendingDeleteId = signal<string | null>(null);

  // ── Rename modal ─────────────────────────────────────────
  readonly showRenameModal = signal(false);
  readonly pendingRenameId = signal<string | null>(null);
  renameValue = '';

  constructor(private readonly elRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.openMenuId.set(null);
    }
  }

  // ── Grouped conversations ─────────────────────────────────
  get groupedConversations(): ConversationGroup[] {
    const pinned = this.conversations.filter((c) => c.isPinned);
    const unpinned = this.conversations.filter((c) => !c.isPinned);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const last7 = new Date(today);
    last7.setDate(today.getDate() - 7);
    const last30 = new Date(today);
    last30.setDate(today.getDate() - 30);

    const timeGroups: ConversationGroup[] = [
      { label: "Aujourd'hui", conversations: [] },
      { label: 'Hier', conversations: [] },
      { label: '7 derniers jours', conversations: [] },
      { label: '30 derniers jours', conversations: [] },
      { label: 'Plus ancien', conversations: [] },
    ];

    for (const conv of unpinned) {
      const d = new Date(conv.updatedAt);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (day >= today) timeGroups[0].conversations.push(conv);
      else if (day >= yesterday) timeGroups[1].conversations.push(conv);
      else if (day >= last7) timeGroups[2].conversations.push(conv);
      else if (day >= last30) timeGroups[3].conversations.push(conv);
      else timeGroups[4].conversations.push(conv);
    }

    const result: ConversationGroup[] = [];

    if (pinned.length > 0) {
      result.push({ label: 'Épinglées', conversations: pinned, isPinnedGroup: true });
    }

    return [...result, ...timeGroups.filter((g) => g.conversations.length > 0)];
  }

  // ── Menu ──────────────────────────────────────────────────
  toggleMenu(event: Event, id: string): void {
    event.stopPropagation();
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  // ── Pin ───────────────────────────────────────────────────
  onPin(event: Event, id: string, isPinned: boolean): void {
    event.stopPropagation();
    this.conversationPinned.emit({ id, isPinned: !isPinned });
    this.closeMenu();
  }

  // ── Rename modal ──────────────────────────────────────────
  onRename(event: Event, id: string): void {
    event.stopPropagation();
    const conv = this.conversations.find((c) => c.id === id);
    if (!conv) return;
    this.renameValue = conv.title;
    this.pendingRenameId.set(id);
    this.showRenameModal.set(true);
    this.closeMenu();
    setTimeout(() => this.renameInputRef?.nativeElement.focus(), 0);
  }

  confirmRename(): void {
    const id = this.pendingRenameId();
    const title = this.renameValue.trim();
    if (id && title) {
      this.conversationRenamed.emit({ id, title });
    }
    this.showRenameModal.set(false);
    this.pendingRenameId.set(null);
    this.renameValue = '';
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
  onDelete(event: Event, id: string): void {
    event.stopPropagation();
    this.pendingDeleteId.set(id);
    this.showDeleteModal.set(true);
    this.closeMenu();
  }

  confirmDelete(): void {
    const id = this.pendingDeleteId();
    if (id) {
      this.conversationDeleted.emit(id);
    }
    this.showDeleteModal.set(false);
    this.pendingDeleteId.set(null);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.pendingDeleteId.set(null);
  }

  // ── Helpers ───────────────────────────────────────────────
  getPendingDeleteTitle(): string {
    const id = this.pendingDeleteId();
    return this.conversations.find((c) => c.id === id)?.title ?? 'cette conversation';
  }
}
