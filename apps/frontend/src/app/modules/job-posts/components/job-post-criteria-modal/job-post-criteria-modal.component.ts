import { Component, EventEmitter, Input, OnInit, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { JobPostService } from '../../services/job-posts.service';
import { GlobalCriteriaService } from '../../services/global-criterias.service';
import {
  JobPostCriteria,
  CriteriaSection,
  UploadedFile,
  GlobalCriteria,
} from '../../models/job-post.model';

// ── Sections par défaut ────────────────────────────────────────────────────
const DEFAULT_SECTIONS: CriteriaSection[] = [
  { key: 'competencesTechniquesRequises', label: 'Compétences techniques', items: [] },
  { key: 'competencesGeneralesRequises', label: 'Compétences générales', items: [] },
  { key: 'languesRequises', label: 'Langues', items: [] },
  { key: 'missionsPrincipales', label: 'Missions principales', items: [] },
  { key: 'certificationsRequises', label: 'Certifications', items: [] },
];

// ── Couleurs cycliques pour les tags (bg + text) ───────────────────────────
const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
];

// Couleurs du petit dot dans l'en-tête de section (bg seulement)
const DOT_COLORS = [
  'bg-blue-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-purple-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-teal-400',
  'bg-indigo-400',
];

// ── Libellés des catégories de critères globaux ────────────────────────────
const GLOBAL_CATEGORY_LABELS: Record<string, string> = {
  technique: '🔧 Technique',
  'soft-skills': '🤝 Soft Skills',
  langue: '🌍 Langues',
  formation: '🎓 Formation',
  experience: '📈 Expérience',
  autre: '📌 Autre',
};

function generateKey(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || `section_${Date.now()}`
  );
}

@Component({
  selector: 'app-job-post-criteria-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-post-criteria-modal.component.html',
})
export class JobPostCriteriaModalComponent implements OnInit {
  @Input() jobPostId!: number;
  @Input() jobPostFile?: UploadedFile | null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<JobPostCriteria>();
  @Output() fileUpdated = new EventEmitter<UploadedFile>();

  // ── Loading / feedback ────────────────────────────────────────────────────
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Champs de base ────────────────────────────────────────────────────────
  readonly title = signal('');
  readonly company = signal('');

  // ── Critères généraux ─────────────────────────────────────────────────────
  readonly intitulePoste = signal('');
  readonly formationRequise = signal('');
  readonly experienceMinimaleAnnees = signal<number | null>(null);

  // ── SECTIONS DYNAMIQUES (toutes, mêlées) ─────────────────────────────────
  readonly sections = signal<CriteriaSection[]>([]);

  // ── Vues séparées : critères globaux vs critères propres à la fiche ──────
  /** index réels (dans `sections()`) des sections globales */
  readonly globalSectionIndexes = computed(() =>
    this.sections()
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !!s.fromGlobal)
      .map(({ i }) => i),
  );

  /** index réels (dans `sections()`) des sections propres à la fiche */
  readonly localSectionIndexes = computed(() =>
    this.sections()
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !s.fromGlobal)
      .map(({ i }) => i),
  );

  // Compteur total d'items (affiché dans le footer)
  readonly totalItems = computed(() => this.sections().reduce((acc, s) => acc + s.items.length, 0));

  // Renommage inline
  readonly editingLabelIndex = signal(-1);
  readonly editingLabelValue = signal('');

  // Buffer d'ajout d'item par section (index → valeur saisie)
  readonly newItemValues = signal<Record<number, string>>({});

  // Ajout d'une nouvelle section — séparé global / local
  readonly newSectionLabelGlobal = signal('');
  readonly showAddSectionGlobal = signal(false);

  readonly newSectionLabelLocal = signal('');
  readonly showAddSectionLocal = signal(false);

  // ── Helpers couleurs (appelés depuis le template) ─────────────────────────
  sectionColor(index: number): string {
    return TAG_COLORS[index % TAG_COLORS.length];
  }
  sectionDot(index: number): string {
    return DOT_COLORS[index % DOT_COLORS.length];
  }

  constructor(
    private readonly jobPostService: JobPostService,
    private readonly globalCriteriaService: GlobalCriteriaService,
  ) {}

  ngOnInit(): void {
    if (this.jobPostFile) {
      this.title.set(this.jobPostFile.title ?? '');
      this.company.set(this.jobPostFile.company ?? '');
    }
    this.loadCriteria();
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  private loadCriteria(): void {
    this.loading.set(true);

    // Charge en parallèle les critères de la fiche ET le catalogue global
    forkJoin({
      criteria: this.jobPostService.getCriteria(this.jobPostId),
      globalCriteria: this.globalCriteriaService.getAll(),
    }).subscribe({
      next: ({ criteria, globalCriteria }) => {
        this.intitulePoste.set(criteria.intitulePoste ?? '');
        this.formationRequise.set(criteria.formationRequise ?? '');
        this.experienceMinimaleAnnees.set(criteria.experienceMinimaleAnnees ?? null);

        let sections: CriteriaSection[] = criteria.sections?.length
          ? criteria.sections.map((s) => ({ ...s, items: [...s.items] }))
          : this.buildSectionsFromFlat(criteria);

        // ── Import auto des critères globaux (une seule fois par fiche) ───
        const hasGlobalImport = sections.some((s) => s.fromGlobal);
        if (!hasGlobalImport && globalCriteria.length > 0) {
          sections = this.mergeGlobalCriteriaIntoSections(sections, globalCriteria);
        }

        this.sections.set(sections);
        this.newItemValues.set({});
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Reconstruit les sections depuis les champs plats legacy */
  private buildSectionsFromFlat(data: JobPostCriteria): CriteriaSection[] {
    const labelOverrides = data.sectionLabels ?? {};
    return DEFAULT_SECTIONS.map((s) => ({
      key: s.key,
      label: labelOverrides[s.key] ?? s.label,
      items: [...((data[s.key as keyof JobPostCriteria] as string[] | undefined) ?? [])],
    }));
  }

  private mergeGlobalCriteriaIntoSections(
    sections: CriteriaSection[],
    globalCriteria: GlobalCriteria[],
  ): CriteriaSection[] {
    const byCategory = new Map<string, GlobalCriteria[]>();
    for (const gc of globalCriteria) {
      const cat = gc.category ?? 'autre';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(gc);
    }

    const result = [...sections];

    for (const [category, items] of byCategory.entries()) {
      const key = `global_${category}`;
      const existingIndex = result.findIndex((s) => s.key === key);
      const newLabels = items.map((i) => i.label);

      if (existingIndex === -1) {
        result.push({
          key,
          label: this.categoryLabel(category),
          items: newLabels,
          fromGlobal: true,
        });
      } else {
        const merged = [...new Set([...result[existingIndex].items, ...newLabels])];
        result[existingIndex] = { ...result[existingIndex], items: merged, fromGlobal: true };
      }
    }

    return result;
  }

  private categoryLabel(category: string): string {
    return GLOBAL_CATEGORY_LABELS[category] ?? category;
  }

  // ── CRUD SECTIONS ─────────────────────────────────────────────────────────

  /** Ouvre le champ de renommage pour la section à l'index i (index réel dans sections()) */
  startRenameSection(index: number): void {
    this.editingLabelIndex.set(index);
    this.editingLabelValue.set(this.sections()[index].label);
  }

  /** Valide le renommage */
  confirmRenameSection(index: number): void {
    const label = this.editingLabelValue().trim();
    if (!label) {
      this.cancelRenameSection();
      return;
    }
    this.sections.update((list) => list.map((s, i) => (i === index ? { ...s, label } : s)));
    this.editingLabelIndex.set(-1);
    this.editingLabelValue.set('');
  }

  cancelRenameSection(): void {
    this.editingLabelIndex.set(-1);
    this.editingLabelValue.set('');
  }

  onRenameLabelKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmRenameSection(index);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelRenameSection();
    }
  }

  /** Supprime une section entière (index réel dans sections()) */
  deleteSection(index: number): void {
    this.sections.update((list) => list.filter((_, i) => i !== index));

    // Renuméroter les buffers d'ajout après l'index supprimé
    this.newItemValues.update((m) => {
      const reindexed: Record<number, string> = {};
      Object.entries(m).forEach(([k, v]) => {
        const n = Number(k);
        if (n !== index) reindexed[n > index ? n - 1 : n] = v;
      });
      return reindexed;
    });

    if (this.editingLabelIndex() === index) this.cancelRenameSection();
  }

  /** Ajoute une nouvelle section, marquée fromGlobal ou non selon le bloc d'origine */
  private addSectionInternal(label: string, fromGlobal: boolean): void {
    const trimmed = label.trim();
    if (!trimmed) return;

    const baseKey = generateKey(trimmed);
    const existingKeys = new Set(this.sections().map((s) => s.key));
    const key = existingKeys.has(baseKey) ? `${baseKey}_${Date.now()}` : baseKey;

    this.sections.update((list) => [...list, { key, label: trimmed, items: [], fromGlobal }]);
  }

  /** Ajoute une nouvelle section dans le bloc "Critères globaux" */
  addSectionGlobal(): void {
    this.addSectionInternal(this.newSectionLabelGlobal(), true);
    this.newSectionLabelGlobal.set('');
    this.showAddSectionGlobal.set(false);
  }

  /** Ajoute une nouvelle section dans le bloc "Critères de cette fiche" */
  addSectionLocal(): void {
    this.addSectionInternal(this.newSectionLabelLocal(), false);
    this.newSectionLabelLocal.set('');
    this.showAddSectionLocal.set(false);
  }

  onNewSectionKeydownGlobal(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSectionGlobal();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.showAddSectionGlobal.set(false);
      this.newSectionLabelGlobal.set('');
    }
  }

  onNewSectionKeydownLocal(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addSectionLocal();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.showAddSectionLocal.set(false);
      this.newSectionLabelLocal.set('');
    }
  }

  // ── CRUD ITEMS dans une section (index réel dans sections()) ─────────────

  getNewItemValue(sectionIndex: number): string {
    return this.newItemValues()[sectionIndex] ?? '';
  }

  setNewItemValue(sectionIndex: number, value: string): void {
    this.newItemValues.update((m) => ({ ...m, [sectionIndex]: value }));
  }

  addItem(sectionIndex: number): void {
    const value = this.getNewItemValue(sectionIndex).trim();
    if (!value) return;
    const current = this.sections()[sectionIndex]?.items ?? [];
    if (current.includes(value)) return;

    this.sections.update((list) =>
      list.map((s, i) => (i === sectionIndex ? { ...s, items: [...s.items, value] } : s)),
    );
    this.setNewItemValue(sectionIndex, '');
  }

  removeItem(sectionIndex: number, itemIndex: number): void {
    this.sections.update((list) =>
      list.map((s, i) =>
        i === sectionIndex ? { ...s, items: s.items.filter((_, j) => j !== itemIndex) } : s,
      ),
    );
  }

  onItemKeydown(event: KeyboardEvent, sectionIndex: number): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addItem(sectionIndex);
    }
  }

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  save(): void {
    this.saving.set(true);
    this.errorMsg.set(null);

    const criteriaPayload = {
      intitulePoste: this.intitulePoste() || null,
      formationRequise: this.formationRequise() || null,
      experienceMinimaleAnnees: this.experienceMinimaleAnnees(),
      sections: this.sections(), // ← source de vérité envoyée au backend
    };

    Promise.all([
      this.jobPostService.updateCriteria(this.jobPostId, criteriaPayload).toPromise(),
      this.jobPostService.updateTitle(this.jobPostId, this.title(), this.company()).toPromise(),
    ])
      .then(([criteria]) => {
        const updatedFile: UploadedFile = {
          ...(this.jobPostFile ?? {
            name: 'Sans nom',
            type: '',
            url: '',
            isDriveFile: true,
            status: 'unified',
            isLoading: false,
          }),
          title: this.title(),
          company: this.company(),
        };
        this.fileUpdated.emit(updatedFile);
        this.saving.set(false);
        this.showSuccess('Fiche mise à jour avec succès.');
        this.saved.emit(criteria as JobPostCriteria);
      })
      .catch(() => {
        this.saving.set(false);
        this.errorMsg.set('Erreur lors de la sauvegarde. Veuillez réessayer.');
      });
  }

  private showSuccess(msg: string): void {
    if (this.successTimer) clearTimeout(this.successTimer);
    this.successMsg.set(msg);
    this.successTimer = setTimeout(() => this.successMsg.set(null), 3000);
  }

  onClose(): void {
    this.close.emit();
  }
}
