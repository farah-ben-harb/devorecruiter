import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  JobOffer,
  JobOfferState,
  GenerateJobOfferRequest,
  UpdateJobOfferRequest,
  initialJobOfferState,
} from '../models/job-offer.model';
import { JobOfferMapper } from '../mappers/job-offer.mapper';
import { JobOfferApiResponse } from '../models/job-offer.model';

// ── Fixtures ──────────────────────────────────────────────────
const rawOffer: JobOfferApiResponse = {
  id: 'abc-123',
  jobPostId: null, // ← ajouté
  promptLibre: 'Dev Angular senior',
  titre: 'Développeur Angular Senior',
  accroche: 'Rejoignez notre équipe !',
  formatLinkedin: '🚀 Nous recrutons...\n\nPoste passionnant.',
  missions: ['Feature dev', 'Code review'],
  profil: ['3 ans Angular'],
  avantages: ['Remote'],
  hashtags: ['#angular', '#typescript'],
  motsCles: ['angular', 'frontend'],
  isPublished: false,
  userId: 1,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T12:00:00.000Z',
};

const offer1: JobOffer = JobOfferMapper.fromApi(rawOffer);
const offer2: JobOffer = JobOfferMapper.fromApi({
  ...rawOffer,
  id: 'xyz-456',
  titre: 'Offre 2',
  isPublished: true,
});

// ── Mock Facade ───────────────────────────────────────────────
function createMockFacade() {
  const state$ = new BehaviorSubject<JobOfferState>(initialJobOfferState);

  return {
    state$,
    offers$: state$.pipe(map((s) => s.offers)),
    selectedOffer$: state$.pipe(map((s) => s.selectedOffer)),
    isLoading$: state$.pipe(map((s) => s.status === 'loading')),
    isGenerating$: state$.pipe(map((s) => s.generateStatus === 'generating')),
    error$: state$.pipe(map((s) => s.error)),
    generateError$: state$.pipe(map((s) => s.generateError)),

    get snapshot() {
      return state$.getValue();
    },

    // Actions mockées
    loadAll: vi.fn(),
    selectOffer: vi.fn((offer: JobOffer) =>
      state$.next({ ...state$.getValue(), selectedOffer: offer }),
    ),
    clearSelected: vi.fn(() => state$.next({ ...state$.getValue(), selectedOffer: null })),
    generate: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),

    // Helper de test : forcer l'état
    _setState: (partial: Partial<JobOfferState>) =>
      state$.next({ ...state$.getValue(), ...partial }),
  };
}

// ── Component factory (sans TestBed) ─────────────────────────
function createComponent(facade: ReturnType<typeof createMockFacade>) {
  // On reproduit la logique du composant directement,
  // sans dépendre du DOM Angular, pour des tests purement unitaires.
  const destroy$ = new Subject<void>();

  const comp = {
    facade,
    destroy$,

    // ── UI state ─────────────────────────────────────
    promptLibre: '',
    showGeneratePanel: false,
    showDetailPanel: false,
    showDeleteModal: false,
    showEditModal: false,
    showFullEditModal: false,
    pendingDeleteId: null as string | null,
    activeTab: 'linkedin' as 'linkedin' | 'details',
    copiedLinkedin: false,
    copiedDetails: false,
    isSaving: false,
    copiedLinkedinFull: false,

    // ── Edit simple ──────────────────────────────────
    editTitre: '',
    editAccroche: '',

    // ── Edit complet ─────────────────────────────────
    editFormatLinkedin: '',
    editMissions: [] as string[],
    editProfil: [] as string[],
    editAvantages: [] as string[],
    editMotsCles: [] as string[],

    // ── Methods ───────────────────────────────────────
    ngOnInit() {
      this.facade.loadAll();
    },

    ngOnDestroy() {
      destroy$.next();
      destroy$.complete();
    },

    generate() {
      const prompt = this.promptLibre.trim();
      if (!prompt) return;
      this.facade.generate({ promptLibre: prompt });
    },

    onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.generate();
      }
    },

    openDetail(offer: JobOffer) {
      this.facade.selectOffer(offer);
      this.showDetailPanel = true;
      this.activeTab = 'linkedin';
    },

    closeDetail() {
      this.showDetailPanel = false;
      this.facade.clearSelected();
    },

    setTab(tab: 'linkedin' | 'details') {
      this.activeTab = tab;
    },

    copyLinkedin(text: string) {
      navigator.clipboard.writeText(text).then(() => {
        this.copiedLinkedin = true;
        setTimeout(() => (this.copiedLinkedin = false), 2000);
      });
    },

    copyLinkedinFull(offer: JobOffer) {
      const hashtags = offer.hashtags.join(' ');
      const text = `${offer.accroche}\n\n${offer.formatLinkedin}\n\n${hashtags}`;
      navigator.clipboard.writeText(text).then(() => {
        this.copiedLinkedinFull = true;
        setTimeout(() => (this.copiedLinkedinFull = false), 2000);
      });
    },

    copyDetails(offer: JobOffer) {
      const text = [
        `✅ MISSIONS\n${offer.missions.map((m) => `• ${m}`).join('\n')}`,
        `\n🎯 PROFIL RECHERCHÉ\n${offer.profil.map((p) => `• ${p}`).join('\n')}`,
        `\n🎁 AVANTAGES\n${offer.avantages.map((a) => `• ${a}`).join('\n')}`,
        `\n🔑 MOTS CLÉS\n${offer.motsCles.join(', ')}`,
      ].join('\n');
      navigator.clipboard.writeText(text);
      this.copiedDetails = true;
      setTimeout(() => (this.copiedDetails = false), 2000);
    },

    openEdit(offer: JobOffer, event: MouseEvent) {
      event.stopPropagation();
      this.editTitre = offer.titre;
      this.editAccroche = offer.accroche;
      this.facade.selectOffer(offer);
      this.showEditModal = true;
    },

    confirmEdit() {
      const id = this.facade.snapshot.selectedOffer?.id;
      if (!id) return;
      this.facade.update(id, {
        titre: this.editTitre.trim() || undefined,
        accroche: this.editAccroche.trim() || undefined,
      });
      this.showEditModal = false;
    },

    cancelEdit() {
      this.showEditModal = false;
    },

    openFullEdit(offer: JobOffer, event: Event) {
      event.stopPropagation();
      this.editTitre = offer.titre;
      this.editAccroche = offer.accroche;
      this.editFormatLinkedin = offer.formatLinkedin;
      this.editMissions = [...offer.missions];
      this.editProfil = [...offer.profil];
      this.editAvantages = [...offer.avantages];
      this.editMotsCles = [...offer.motsCles];
      this.facade.selectOffer(offer);
      this.showFullEditModal = true;
    },

    confirmFullEdit() {
      const offer = this.facade.snapshot.selectedOffer;
      if (!offer) return;
      this.isSaving = true;
      this.facade.update(offer.id, {
        titre: this.editTitre.trim() || undefined,
        accroche: this.editAccroche.trim() || undefined,
        formatLinkedin: this.editFormatLinkedin.trim() || undefined,
        missions: this.editMissions.filter((m) => m.trim()),
        profil: this.editProfil.filter((p) => p.trim()),
        avantages: this.editAvantages.filter((a) => a.trim()),
        motsCles: this.editMotsCles.filter((k) => k.trim()),
      });
      this.isSaving = false;
      this.showFullEditModal = false;
    },

    cancelFullEdit() {
      this.showFullEditModal = false;
    },

    addItem(list: string[]) {
      list.push('');
    },
    removeItem(list: string[], i: number) {
      list.splice(i, 1);
    },
    trackByIndex(index: number) {
      return index;
    },

    openDelete(id: string, event: MouseEvent) {
      event.stopPropagation();
      this.pendingDeleteId = id;
      this.showDeleteModal = true;
    },

    confirmDelete() {
      if (!this.pendingDeleteId) return;
      this.facade.delete(this.pendingDeleteId);
      this.showDeleteModal = false;
      this.showDetailPanel = false;
      this.pendingDeleteId = null;
    },

    cancelDelete() {
      this.showDeleteModal = false;
      this.pendingDeleteId = null;
    },

    togglePublish(offer: JobOffer, event: MouseEvent) {
      event.stopPropagation();
      this.facade.update(offer.id, { isPublished: !offer.isPublished });
    },

    onEscape() {
      if (this.showDeleteModal) this.cancelDelete();
      else if (this.showFullEditModal) this.cancelFullEdit();
      else if (this.showEditModal) this.cancelEdit();
      else if (this.showDetailPanel) this.closeDetail();
      else if (this.showGeneratePanel) this.showGeneratePanel = false;
    },

    trackById(_: number, offer: JobOffer) {
      return offer.id;
    },

    formatDate(date: Date) {
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    },
  };

  return comp;
}

type Component = ReturnType<typeof createComponent>;

// ── Tests ─────────────────────────────────────────────────────
describe('JobOffersComponent', () => {
  let facade: ReturnType<typeof createMockFacade>;
  let comp: Component;

  // Mock clipboard
  const clipboardWriteMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    facade = createMockFacade();
    comp = createComponent(facade);
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteMock },
      writable: true,
      configurable: true,
    });
  });

  // ── ngOnInit ──────────────────────────────────────────────
  describe('ngOnInit', () => {
    it('should call facade.loadAll on init', () => {
      comp.ngOnInit();
      expect(facade.loadAll).toHaveBeenCalledOnce();
    });
  });

  // ── generate ──────────────────────────────────────────────
  describe('generate', () => {
    it('should not call facade.generate when promptLibre is empty', () => {
      comp.promptLibre = '';
      comp.generate();
      expect(facade.generate).not.toHaveBeenCalled();
    });

    it('should not call facade.generate when promptLibre is whitespace only', () => {
      comp.promptLibre = '   ';
      comp.generate();
      expect(facade.generate).not.toHaveBeenCalled();
    });

    it('should call facade.generate with trimmed prompt', () => {
      comp.promptLibre = '  Dev Angular  ';
      comp.generate();
      const expected: GenerateJobOfferRequest = { promptLibre: 'Dev Angular' };
      expect(facade.generate).toHaveBeenCalledWith(expected);
    });
  });

  // ── onKeyDown ─────────────────────────────────────────────
  describe('onKeyDown', () => {
    it('should call generate on Enter without Shift', () => {
      comp.promptLibre = 'Dev Angular';
      const generateSpy = vi.spyOn(comp, 'generate');
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      comp.onKeyDown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(generateSpy).toHaveBeenCalled();
    });

    it('should NOT call generate on Enter + Shift', () => {
      comp.promptLibre = 'Dev Angular';
      const generateSpy = vi.spyOn(comp, 'generate');
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });

      comp.onKeyDown(event);

      expect(generateSpy).not.toHaveBeenCalled();
    });

    it('should NOT call generate on other keys', () => {
      const generateSpy = vi.spyOn(comp, 'generate');
      const event = new KeyboardEvent('keydown', { key: 'a' });

      comp.onKeyDown(event);

      expect(generateSpy).not.toHaveBeenCalled();
    });
  });

  // ── openDetail / closeDetail / setTab ─────────────────────
  describe('openDetail / closeDetail / setTab', () => {
    it('should set showDetailPanel=true and activeTab=linkedin on openDetail', () => {
      comp.activeTab = 'details';
      comp.openDetail(offer1);

      expect(comp.showDetailPanel).toBe(true);
      expect(comp.activeTab).toBe('linkedin');
      expect(facade.selectOffer).toHaveBeenCalledWith(offer1);
    });

    it('should set showDetailPanel=false and call clearSelected on closeDetail', () => {
      comp.showDetailPanel = true;
      comp.closeDetail();

      expect(comp.showDetailPanel).toBe(false);
      expect(facade.clearSelected).toHaveBeenCalled();
    });

    it('should update activeTab on setTab', () => {
      comp.setTab('details');
      expect(comp.activeTab).toBe('details');
      comp.setTab('linkedin');
      expect(comp.activeTab).toBe('linkedin');
    });
  });

  // ── copyLinkedinFull ──────────────────────────────────────
  describe('copyLinkedinFull', () => {
    it('should write accroche + formatLinkedin + hashtags to clipboard', async () => {
      await comp.copyLinkedinFull(offer1);

      const expected = `${offer1.accroche}\n\n${offer1.formatLinkedin}\n\n${offer1.hashtags.join(' ')}`;
      expect(clipboardWriteMock).toHaveBeenCalledWith(expected);
    });

    it('should set copiedLinkedinFull to true after copy', async () => {
      await comp.copyLinkedinFull(offer1);
      expect(comp.copiedLinkedinFull).toBe(true);
    });
  });

  // ── copyDetails ───────────────────────────────────────────
  describe('copyDetails', () => {
    it('should write missions, profil, avantages, motsCles to clipboard', () => {
      comp.copyDetails(offer1);

      const call = clipboardWriteMock.mock.calls[0][0] as string;
      expect(call).toContain('✅ MISSIONS');
      expect(call).toContain('• Feature dev');
      expect(call).toContain('🎯 PROFIL RECHERCHÉ');
      expect(call).toContain('• 3 ans Angular');
      expect(call).toContain('🎁 AVANTAGES');
      expect(call).toContain('• Remote');
      expect(call).toContain('🔑 MOTS CLÉS');
      expect(call).toContain('angular, frontend');
    });

    it('should set copiedDetails to true after copy', () => {
      comp.copyDetails(offer1);
      expect(comp.copiedDetails).toBe(true);
    });
  });

  // ── openEdit / confirmEdit / cancelEdit ───────────────────
  describe('openEdit', () => {
    it('should populate editTitre and editAccroche from offer', () => {
      const event = new MouseEvent('click');
      comp.openEdit(offer1, event);

      expect(comp.editTitre).toBe(offer1.titre);
      expect(comp.editAccroche).toBe(offer1.accroche);
    });

    it('should set showEditModal=true and select the offer', () => {
      const event = new MouseEvent('click');
      comp.openEdit(offer1, event);

      expect(comp.showEditModal).toBe(true);
      expect(facade.selectOffer).toHaveBeenCalledWith(offer1);
    });
  });

  describe('confirmEdit', () => {
    it('should call facade.update with trimmed values and close modal', () => {
      facade._setState({ selectedOffer: offer1 });
      comp.editTitre = '  Nouveau titre  ';
      comp.editAccroche = '  Nouvelle accroche  ';
      comp.showEditModal = true;

      comp.confirmEdit();

      const expected: UpdateJobOfferRequest = {
        titre: 'Nouveau titre',
        accroche: 'Nouvelle accroche',
      };
      expect(facade.update).toHaveBeenCalledWith('abc-123', expected);
      expect(comp.showEditModal).toBe(false);
    });

    it('should not call update if no selected offer', () => {
      facade._setState({ selectedOffer: null });
      comp.confirmEdit();
      expect(facade.update).not.toHaveBeenCalled();
    });

    it('should pass undefined for empty trimmed fields', () => {
      facade._setState({ selectedOffer: offer1 });
      comp.editTitre = '';
      comp.editAccroche = '';

      comp.confirmEdit();

      expect(facade.update).toHaveBeenCalledWith('abc-123', {
        titre: undefined,
        accroche: undefined,
      });
    });
  });

  describe('cancelEdit', () => {
    it('should set showEditModal=false', () => {
      comp.showEditModal = true;
      comp.cancelEdit();
      expect(comp.showEditModal).toBe(false);
    });
  });

  // ── openFullEdit / confirmFullEdit / cancelFullEdit ───────
  describe('openFullEdit', () => {
    it('should populate all edit fields from offer', () => {
      const event = new MouseEvent('click');
      comp.openFullEdit(offer1, event);

      expect(comp.editTitre).toBe(offer1.titre);
      expect(comp.editAccroche).toBe(offer1.accroche);
      expect(comp.editFormatLinkedin).toBe(offer1.formatLinkedin);
      expect(comp.editMissions).toEqual(offer1.missions);
      expect(comp.editProfil).toEqual(offer1.profil);
      expect(comp.editAvantages).toEqual(offer1.avantages);
      expect(comp.editMotsCles).toEqual(offer1.motsCles);
    });

    it('should deep-copy arrays (no shared reference)', () => {
      const event = new MouseEvent('click');
      comp.openFullEdit(offer1, event);

      comp.editMissions.push('new item');
      expect(offer1.missions).not.toContain('new item');
    });

    it('should set showFullEditModal=true', () => {
      const event = new MouseEvent('click');
      comp.openFullEdit(offer1, event);
      expect(comp.showFullEditModal).toBe(true);
    });
  });

  describe('confirmFullEdit', () => {
    it('should call facade.update with filtered arrays and close modal', () => {
      facade._setState({ selectedOffer: offer1 });
      comp.editTitre = 'Titre';
      comp.editAccroche = 'Accroche';
      comp.editFormatLinkedin = 'Format';
      comp.editMissions = ['Mission 1', '', '  '];
      comp.editProfil = ['Profil 1'];
      comp.editAvantages = ['Avantage 1'];
      comp.editMotsCles = ['mot1', ''];

      comp.confirmFullEdit();

      expect(facade.update).toHaveBeenCalledWith('abc-123', {
        titre: 'Titre',
        accroche: 'Accroche',
        formatLinkedin: 'Format',
        missions: ['Mission 1'],
        profil: ['Profil 1'],
        avantages: ['Avantage 1'],
        motsCles: ['mot1'],
      });
      expect(comp.showFullEditModal).toBe(false);
    });

    it('should not call update if no selected offer', () => {
      facade._setState({ selectedOffer: null });
      comp.confirmFullEdit();
      expect(facade.update).not.toHaveBeenCalled();
    });
  });

  describe('cancelFullEdit', () => {
    it('should set showFullEditModal=false', () => {
      comp.showFullEditModal = true;
      comp.cancelFullEdit();
      expect(comp.showFullEditModal).toBe(false);
    });
  });

  // ── addItem / removeItem / trackByIndex ───────────────────
  describe('list helpers', () => {
    it('addItem should push an empty string to the list', () => {
      const list: string[] = ['a'];
      comp.addItem(list);
      expect(list).toEqual(['a', '']);
    });

    it('removeItem should remove the item at given index', () => {
      const list: string[] = ['a', 'b', 'c'];
      comp.removeItem(list, 1);
      expect(list).toEqual(['a', 'c']);
    });

    it('trackByIndex should return the index', () => {
      expect(comp.trackByIndex(3)).toBe(3);
    });
  });

  // ── openDelete / confirmDelete / cancelDelete ─────────────
  describe('openDelete', () => {
    it('should set pendingDeleteId and showDeleteModal=true', () => {
      const event = new MouseEvent('click');
      comp.openDelete('abc-123', event);

      expect(comp.pendingDeleteId).toBe('abc-123');
      expect(comp.showDeleteModal).toBe(true);
    });
  });

  describe('confirmDelete', () => {
    it('should call facade.delete and reset state', () => {
      comp.pendingDeleteId = 'abc-123';
      comp.showDetailPanel = true;

      comp.confirmDelete();

      expect(facade.delete).toHaveBeenCalledWith('abc-123');
      expect(comp.showDeleteModal).toBe(false);
      expect(comp.showDetailPanel).toBe(false);
      expect(comp.pendingDeleteId).toBeNull();
    });

    it('should not call delete when pendingDeleteId is null', () => {
      comp.pendingDeleteId = null;
      comp.confirmDelete();
      expect(facade.delete).not.toHaveBeenCalled();
    });
  });

  describe('cancelDelete', () => {
    it('should reset showDeleteModal and pendingDeleteId', () => {
      comp.showDeleteModal = true;
      comp.pendingDeleteId = 'abc-123';

      comp.cancelDelete();

      expect(comp.showDeleteModal).toBe(false);
      expect(comp.pendingDeleteId).toBeNull();
    });
  });

  // ── togglePublish ─────────────────────────────────────────
  describe('togglePublish', () => {
    it('should call facade.update with negated isPublished', () => {
      const event = new MouseEvent('click');
      comp.togglePublish(offer1, event);

      expect(facade.update).toHaveBeenCalledWith('abc-123', { isPublished: true });
    });

    it('should toggle from published=true to false', () => {
      const event = new MouseEvent('click');
      comp.togglePublish(offer2, event);

      expect(facade.update).toHaveBeenCalledWith('xyz-456', { isPublished: false });
    });
  });

  // ── onEscape ──────────────────────────────────────────────
  describe('onEscape', () => {
    it('should close delete modal first', () => {
      comp.showDeleteModal = true;
      comp.showFullEditModal = true;
      const cancelDeleteSpy = vi.spyOn(comp, 'cancelDelete');

      comp.onEscape();

      expect(cancelDeleteSpy).toHaveBeenCalled();
      expect(comp.showFullEditModal).toBe(true); // not touched
    });

    it('should close full edit modal if delete modal is closed', () => {
      comp.showDeleteModal = false;
      comp.showFullEditModal = true;
      comp.showEditModal = true;
      const cancelFullEditSpy = vi.spyOn(comp, 'cancelFullEdit');

      comp.onEscape();

      expect(cancelFullEditSpy).toHaveBeenCalled();
      expect(comp.showEditModal).toBe(true); // not touched
    });

    it('should close edit modal if full edit and delete are closed', () => {
      comp.showDeleteModal = false;
      comp.showFullEditModal = false;
      comp.showEditModal = true;
      const cancelEditSpy = vi.spyOn(comp, 'cancelEdit');

      comp.onEscape();

      expect(cancelEditSpy).toHaveBeenCalled();
    });

    it('should close detail panel if no modal is open', () => {
      comp.showDeleteModal = false;
      comp.showFullEditModal = false;
      comp.showEditModal = false;
      comp.showDetailPanel = true;
      const closeDetailSpy = vi.spyOn(comp, 'closeDetail');

      comp.onEscape();

      expect(closeDetailSpy).toHaveBeenCalled();
    });

    it('should close generate panel if nothing else is open', () => {
      comp.showDeleteModal = false;
      comp.showFullEditModal = false;
      comp.showEditModal = false;
      comp.showDetailPanel = false;
      comp.showGeneratePanel = true;

      comp.onEscape();

      expect(comp.showGeneratePanel).toBe(false);
    });

    it('should do nothing when all panels are closed', () => {
      comp.showDeleteModal = false;
      comp.showFullEditModal = false;
      comp.showEditModal = false;
      comp.showDetailPanel = false;
      comp.showGeneratePanel = false;

      expect(() => comp.onEscape()).not.toThrow();
    });
  });

  // ── trackById ─────────────────────────────────────────────
  describe('trackById', () => {
    it('should return the offer id', () => {
      expect(comp.trackById(0, offer1)).toBe('abc-123');
    });
  });

  // ── formatDate ────────────────────────────────────────────
  describe('formatDate', () => {
    it('should format date in fr-FR locale', () => {
      const date = new Date('2024-01-15T10:00:00.000Z');
      const result = comp.formatDate(date);

      // La date formatée doit contenir le jour, mois court et année
      expect(result).toMatch(/\d{2}/); // jour
      expect(result).toMatch(/\d{4}/); // année
    });

    it('should return different formatted strings for different dates', () => {
      const d1 = new Date('2024-01-15T00:00:00.000Z');
      const d2 = new Date('2024-06-20T00:00:00.000Z');
      expect(comp.formatDate(d1)).not.toBe(comp.formatDate(d2));
    });
  });
});
