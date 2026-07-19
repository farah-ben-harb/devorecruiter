// criteria-category-manager.component.ts
import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CriteriaCategoryService } from '../../services/criteria-category.service';
import { CriteriaCategory } from '../../models/job-post.model';

type ViewMode = 'list' | 'add' | 'edit';

@Component({
  selector: 'app-criteria-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './criteria-category-manager.component.html',
})
export class CriteriaCategoryManagerComponent implements OnInit {
  @Output() close = new EventEmitter<CriteriaCategory[]>();

  private readonly service = inject(CriteriaCategoryService);

  readonly categories = signal<CriteriaCategory[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);
  readonly viewMode = signal<ViewMode>('list');
  readonly editingItem = signal<CriteriaCategory | null>(null);
  readonly formValue = signal('');
  readonly formLabel = signal('');
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openAdd(): void {
    this.formValue.set('');
    this.formLabel.set('');
    this.editingItem.set(null);
    this.errorMsg.set(null);
    this.viewMode.set('add');
  }

  openEdit(cat: CriteriaCategory): void {
    this.formValue.set(cat.value);
    this.formLabel.set(cat.label);
    this.editingItem.set(cat);
    this.errorMsg.set(null);
    this.viewMode.set('edit');
  }

  backToList(): void {
    this.viewMode.set('list');
    this.editingItem.set(null);
    this.errorMsg.set(null);
  }

  save(): void {
    const value = this.formValue().trim();
    const label = this.formLabel().trim();
    if (!value || !label) {
      this.errorMsg.set('Le slug et le libellé sont obligatoires.');
      return;
    }
    this.saving.set(true);
    const editing = this.editingItem();
    const obs$ = editing
      ? this.service.update(editing.id, { value, label })
      : this.service.create({ value, label });

    obs$.subscribe({
      next: (saved) => {
        if (editing) {
          this.categories.update((list) => list.map((c) => (c.id === saved.id ? saved : c)));
          this.showSuccess('Catégorie modifiée.');
        } else {
          this.categories.update((list) => [...list, saved]);
          this.showSuccess('Catégorie ajoutée.');
        }
        this.saving.set(false);
        this.backToList();
      },
      error: () => {
        this.errorMsg.set('Une erreur est survenue.');
        this.saving.set(false);
      },
    });
  }

  askDelete(id: number): void {
    this.confirmDeleteId.set(id);
  }
  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  confirmDelete(id: number): void {
    this.deletingId.set(id);
    this.confirmDeleteId.set(null);
    this.service.remove(id).subscribe({
      next: () => {
        this.categories.update((list) => list.filter((c) => c.id !== id));
        this.deletingId.set(null);
        this.showSuccess('Catégorie supprimée.');
      },
      error: () => this.deletingId.set(null),
    });
  }

  closeModal(): void {
    this.close.emit(this.categories()); // retourne la liste à jour au parent
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }
}
