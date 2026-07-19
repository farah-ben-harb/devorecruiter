import { Component, EventEmitter, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalCriteriaService } from '../../services/global-criterias.service';
import { CriteriaCategoryService } from '../../services/criteria-category.service';
import { CriteriaCategoryManagerComponent } from '../criteria-category-manager/criteria-category-manager.component';
import {
  CriteriaCategory,
  CriteriaForm,
  GlobalCriteria,
  ViewMode,
} from '../../models/job-post.model';

const EMPTY_FORM: CriteriaForm = { label: '', description: '', category: '' };

@Component({
  selector: 'app-global-criteria-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CriteriaCategoryManagerComponent],
  templateUrl: './global-criterias.component.html',
})
export class GlobalCriteriaModalComponent implements OnInit {
  @Output() close = new EventEmitter<CriteriaCategory[]>();

  readonly criteria = signal<GlobalCriteria[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly viewMode = signal<ViewMode>('list');
  readonly editingCriteria = signal<GlobalCriteria | null>(null);
  readonly form = signal<CriteriaForm>({ ...EMPTY_FORM });
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly confirmDeleteId = signal<number | null>(null);
  readonly categories = signal<CriteriaCategory[]>([]);
  readonly showCategoryManager = signal(false);

  readonly groupedCriteria = computed(() => {
    const all = this.criteria();
    const groups = new Map<string, GlobalCriteria[]>();
    for (const c of all) {
      const key = c.category ?? 'autre';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }
    return groups;
  });

  readonly categoryEntries = computed(() => Array.from(this.groupedCriteria().entries()));

  constructor(
    private readonly globalCriteriaService: GlobalCriteriaService,
    private readonly categoryService: CriteriaCategoryService,
  ) {}

  ngOnInit(): void {
    this.loadCriteria();
    this.loadCategories();
  }

  loadCriteria(): void {
    this.loading.set(true);
    this.globalCriteriaService.getAll().subscribe({
      next: (data) => {
        this.criteria.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.showError('Impossible de charger les critères.');
        this.loading.set(false);
      },
    });
  }

  openAdd(): void {
    this.form.set({ ...EMPTY_FORM });
    this.editingCriteria.set(null);
    this.errorMsg.set(null);
    this.viewMode.set('add');
  }

  openEdit(criteria: GlobalCriteria): void {
    this.form.set({
      label: criteria.label,
      description: criteria.description ?? '',
      category: criteria.category ?? '',
    });
    this.editingCriteria.set(criteria);
    this.errorMsg.set(null);
    this.viewMode.set('edit');
  }

  backToList(): void {
    this.viewMode.set('list');
    this.editingCriteria.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.errorMsg.set(null);
  }

  updateForm(field: keyof CriteriaForm, value: string): void {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  save(): void {
    const f = this.form();
    if (!f.label.trim()) {
      this.errorMsg.set('Le libellé est obligatoire.');
      return;
    }
    this.saving.set(true);
    this.errorMsg.set(null);

    const payload = {
      label: f.label.trim(),
      description: f.description.trim() || undefined,
      category: f.category.trim() || undefined,
    };

    const editing = this.editingCriteria();
    const obs$ = editing
      ? this.globalCriteriaService.update(editing.id, payload)
      : this.globalCriteriaService.create(payload);

    obs$.subscribe({
      next: (saved) => {
        if (editing) {
          this.criteria.update((list) => list.map((c) => (c.id === saved.id ? saved : c)));
          this.showSuccess('Critère modifié avec succès.');
        } else {
          this.criteria.update((list) => [...list, saved]);
          this.showSuccess('Critère ajouté avec succès.');
        }
        this.saving.set(false);
        this.backToList();
      },
      error: () => {
        this.errorMsg.set('Une erreur est survenue. Veuillez réessayer.');
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
    this.globalCriteriaService.remove(id).subscribe({
      next: () => {
        this.criteria.update((list) => list.filter((c) => c.id !== id));
        this.deletingId.set(null);
        this.showSuccess('Critère supprimé.');
      },
      error: () => {
        this.deletingId.set(null);
        this.showError('Impossible de supprimer le critère.');
      },
    });
  }

  private showSuccess(msg: string): void {
    this.successMsg.set(msg);
    setTimeout(() => this.successMsg.set(null), 3000);
  }

  private showError(msg: string): void {
    this.errorMsg.set(msg);
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (data) => this.categories.set(data),
    });
  }

  getCategoryLabel(value: string): string {
    return this.categories().find((c) => c.value === value)?.label ?? value;
  }

  onCategoryChange(value: string): void {
    if (value === '__manage__') {
      // Remettre la valeur précédente dans le select, ouvrir le sous-modal
      this.showCategoryManager.set(true);
    } else {
      this.updateForm('category', value);
    }
  }

  onCategoriesUpdated(updated: CriteriaCategory[]): void {
    this.categories.set(updated);
    this.showCategoryManager.set(false);
  }
}
