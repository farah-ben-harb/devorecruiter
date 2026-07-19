import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { CandidatesComponent } from './candidates.component';
import { CandidatesFacade } from '../state/candidates/candidates.facade';
import { ResumeListItem } from '../models/candidate.model';

const mockResume: ResumeListItem = {
  id: 'cand-1',
  name: 'CV_Test.pdf',
  driveLink: 'https://drive.google.com/file/d/drive-brut-1/view',
  driveId: 'drive-brut-1',
  type: 'brut',
  createdAt: '2024-01-15T10:00:00Z',
  status: 'pending',
  hasUnifie: false,
};

const mockUnifieResume: ResumeListItem = {
  id: 'cand-2',
  name: 'CV_Unifie.pdf',
  driveLink: 'https://drive.google.com/file/d/drive-unifie-1/view',
  driveId: 'drive-unifie-1',
  type: 'unifie',
  createdAt: '2024-01-16T10:00:00Z',
  status: 'done',
  hasUnifie: true,
  githubUsername: 'john-doe',
  email: 'john@example.com',
  hasMissingFields: false,
};

const mockIncompleteResume: ResumeListItem = {
  ...mockUnifieResume,
  id: 'cand-3',
  githubUsername: null,
  email: null,
  hasMissingFields: true,
};

function createFacadeMock() {
  const resumes = signal<ResumeListItem[]>([mockResume]);
  const filter = signal<'all' | 'brut' | 'unifie'>('all');
  const sortField = signal<'name' | 'createdAt' | 'status'>('createdAt');
  const sortAsc = signal(false);
  const searchQuery = signal('');
  const currentPage = signal(1);
  const itemsPerPage = signal(10);
  const totalPages = signal(1);
  const totalItems = signal(1);
  const scoringPanelResume = signal<ResumeListItem | null>(null);
  const showMissingFieldsModal = signal(false);
  const missingFieldsTarget = signal<ResumeListItem | null>(null);

  return {
    resumes,
    filtered: computed(() => resumes()),
    driveFiles: signal([]),
    loading: signal(false),
    uploading: signal(false),
    driveLoading: signal(false),
    driveError: signal(''),
    unifyingId: signal<string | null>(null),
    deletingId: signal<string | null>(null),
    filter,
    sortField,
    sortAsc,
    brutCount: computed(() => resumes().filter((c) => c.type === 'brut').length),
    unifieCount: computed(() => resumes().filter((c) => c.type === 'unifie').length),
    incompleteResumes: computed(() =>
      resumes().filter((c) => c.type === 'unifie' && c.hasMissingFields),
    ),
    isModalOpen: signal(false),
    dialogConfig: signal(null),
    dialogVisible: signal(false),
    toast: signal({ message: '', type: 'info' as const, visible: false }),
    searchQuery,
    scoringPanelResume,
    scoringResult: signal(null),
    scoringLoading: signal(false),
    scoringTriggering: signal(false),
    scoringError: signal(''),
    downloadingFileId: signal<string | null>(null),
    currentPage,
    totalPages,
    totalItems,
    pages: computed(() => Array.from({ length: totalPages() }, (_, i) => i + 1)),
    resumeToDelete: signal<ResumeListItem | null>(null),
    showDeleteModal: signal(false),
    showInvalidFileModal: signal(false),
    filteredTotal: computed(() => resumes().length),
    filteredTotalPages: computed(() => Math.max(1, Math.ceil(resumes().length / itemsPerPage()))),
    filteredPages: computed(() => [1]),
    showMissingFieldsModal,
    missingFieldsTarget,
    savingFields: signal(false),

    init: vi.fn(),
    goToPage: vi.fn(),
    setFilter: vi.fn((value: 'all' | 'brut' | 'unifie') => filter.set(value)),
    setSort: vi.fn((value: 'name' | 'createdAt' | 'status') => sortField.set(value)),
    setSearchQuery: vi.fn((value: string) => searchQuery.set(value)),
    openDriveModal: vi.fn(),
    closeModal: vi.fn(),
    closeInvalidFileModal: vi.fn(),
    closeDialog: vi.fn(),
    confirmDialog: vi.fn(),
    hideToast: vi.fn(),
    deleteResume: vi.fn(),
    closeDeleteModal: vi.fn(),
    confirmDelete: vi.fn(),
    unify: vi.fn(),
    onFileSelected: vi.fn(),
    downloadResume: vi.fn(),
    openScoringPanel: vi.fn((resume: ResumeListItem) => scoringPanelResume.set(resume)),
    closeScoringPanel: vi.fn(() => scoringPanelResume.set(null)),
    triggerScoring: vi.fn(),
    downloadJobPost: vi.fn(),
    openMissingFieldsModal: vi.fn((resume: ResumeListItem) => {
      missingFieldsTarget.set(resume);
      showMissingFieldsModal.set(true);
    }),
    closeMissingFieldsModal: vi.fn(() => {
      showMissingFieldsModal.set(false);
      missingFieldsTarget.set(null);
    }),
    saveFields: vi.fn(),
  };
}

async function setup() {
  const facade = createFacadeMock();

  TestBed.configureTestingModule({
    providers: [{ provide: CandidatesFacade, useValue: facade }],
  });

  const component = TestBed.runInInjectionContext(() => new CandidatesComponent());
  return { component, facade };
}

describe('CandidatesComponent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ── Init ──────────────────────────────────────────────────────────────────

  it('appelle init au ngOnInit', async () => {
    const { component, facade } = await setup();
    component.ngOnInit();
    expect(facade.init).toHaveBeenCalledOnce();
  });

  // ── Délégation facade ─────────────────────────────────────────────────────

  it('délègue les actions utilisateur à la facade', async () => {
    const { component, facade } = await setup();

    component.goToPage(2);
    component.setFilter('brut');
    component.setSort('name');
    component.setSearchQuery('dupont');
    component.openDriveModal();
    component.closeModal();
    component.closeInvalidFileModal();
    component.closeDialog();
    component.confirmDialog();
    component.hideToast();
    component.deleteResume(mockResume);
    component.closeDeleteModal();
    component.confirmDelete();
    component.unify(mockResume);

    const event = { target: { files: [] } } as unknown as Event;
    component.onFileSelected(event);
    component.downloadResume(mockResume);
    component.openScoringPanel(mockResume);
    component.closeScoringPanel();
    component.downloadJobPost('file-1', 'job-post.pdf');

    expect(facade.goToPage).toHaveBeenCalledWith(2);
    expect(facade.setFilter).toHaveBeenCalledWith('brut');
    expect(facade.setSort).toHaveBeenCalledWith('name');
    expect(facade.setSearchQuery).toHaveBeenCalledWith('dupont');
    expect(facade.openDriveModal).toHaveBeenCalledOnce();
    expect(facade.closeModal).toHaveBeenCalledOnce();
    expect(facade.closeInvalidFileModal).toHaveBeenCalledOnce();
    expect(facade.closeDialog).toHaveBeenCalledOnce();
    expect(facade.confirmDialog).toHaveBeenCalledOnce();
    expect(facade.hideToast).toHaveBeenCalledOnce();
    expect(facade.deleteResume).toHaveBeenCalledWith(mockResume);
    expect(facade.closeDeleteModal).toHaveBeenCalledOnce();
    expect(facade.confirmDelete).toHaveBeenCalledOnce();
    expect(facade.unify).toHaveBeenCalledWith(mockResume);
    expect(facade.onFileSelected).toHaveBeenCalledWith(event);
    expect(facade.downloadResume).toHaveBeenCalledWith(mockResume, expect.any(Function));
    expect(facade.openScoringPanel).toHaveBeenCalledWith(mockResume);
    expect(facade.closeScoringPanel).toHaveBeenCalledOnce();
    expect(facade.downloadJobPost).toHaveBeenCalledWith('file-1', 'job-post.pdf');
  });

  // ── Scoring ───────────────────────────────────────────────────────────────

  it('déclenche le scoring seulement si un CV est sélectionné', async () => {
    const { component, facade } = await setup();

    component.triggerScoring();
    expect(facade.triggerScoring).not.toHaveBeenCalled();

    facade.scoringPanelResume.set(mockResume);
    component.triggerScoring();
    expect(facade.triggerScoring).toHaveBeenCalledWith('cand-1');
  });

  // ── Drive ─────────────────────────────────────────────────────────────────

  it('ouvre le lien Drive dans un nouvel onglet', async () => {
    const { component } = await setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.openDrive('https://example.com/resume.pdf');
    expect(openSpy).toHaveBeenCalledWith('https://example.com/resume.pdf', '_blank');
  });

  // ── Tri ───────────────────────────────────────────────────────────────────

  it('retourne les icones de tri selon le state', async () => {
    const { component, facade } = await setup();

    expect(component.sortIcon('name')).toBe('↕');

    facade.sortField.set('name');
    facade.sortAsc.set(true);
    expect(component.sortIcon('name')).toBe('↑');

    facade.sortAsc.set(false);
    expect(component.sortIcon('name')).toBe('↓');
  });

  // ── Status ────────────────────────────────────────────────────────────────

  it('mappe statusLabel et statusClass', async () => {
    const { component } = await setup();

    expect(component.statusLabel('pending')).toBe('En attente');
    expect(component.statusLabel('processing')).toBe('En cours');
    expect(component.statusLabel('done')).toBe('Unifié');
    expect(component.statusLabel('error')).toBe('Erreur');
    expect(component.statusLabel('other')).toBe('other');

    expect(component.statusClass('pending')).toBe('bg-gray-100 text-gray-600');
    expect(component.statusClass('processing')).toBe('bg-yellow-100 text-yellow-700');
    expect(component.statusClass('done')).toBe('bg-green-100 text-green-700');
    expect(component.statusClass('error')).toBe('bg-red-100 text-red-700');
    expect(component.statusClass('other')).toBe('');
  });

  // ── Score visuel ──────────────────────────────────────────────────────────

  it('retourne les classes visuelles des scores', async () => {
    const { component } = await setup();

    expect(component.scoreCircleClass(90)).toContain('green');
    expect(component.scoreCircleClass(75)).toContain('yellow');
    expect(component.scoreCircleClass(50)).toContain('red');

    expect(component.scoreBarColor(85)).toBe('bg-green-500');
    expect(component.scoreBarColor(70)).toBe('bg-yellow-500');
    expect(component.scoreBarColor(69)).toBe('bg-red-400');
  });

  // ── Missing fields modal ──────────────────────────────────────────────────

  it('openMissingFieldsModal pré-remplit les inputs et délègue à la facade', async () => {
    const { component, facade } = await setup();

    component.openMissingFieldsModal(mockUnifieResume);

    expect(component.githubUsernameInput).toBe('john-doe');
    expect(component.emailInput).toBe('john@example.com');
    expect(facade.openMissingFieldsModal).toHaveBeenCalledWith(mockUnifieResume);
  });

  it('openMissingFieldsModal gère les champs null avec une chaîne vide', async () => {
    const { component, facade } = await setup();

    component.openMissingFieldsModal(mockIncompleteResume);

    expect(component.githubUsernameInput).toBe('');
    expect(component.emailInput).toBe('');
    expect(facade.openMissingFieldsModal).toHaveBeenCalledWith(mockIncompleteResume);
  });

  it('closeMissingFieldsModal délègue à la facade', async () => {
    const { component, facade } = await setup();

    component.closeMissingFieldsModal();
    expect(facade.closeMissingFieldsModal).toHaveBeenCalledOnce();
  });

  it('saveFields envoie les inputs non vides à la facade', async () => {
    const { component, facade } = await setup();

    component.githubUsernameInput = 'jane-doe';
    component.emailInput = 'jane@example.com';
    component.saveFields();

    expect(facade.saveFields).toHaveBeenCalledWith({
      githubUsername: 'jane-doe',
      email: 'jane@example.com',
    });
  });

  it('saveFields envoie undefined pour les inputs vides', async () => {
    const { component, facade } = await setup();

    component.githubUsernameInput = '';
    component.emailInput = '';
    component.saveFields();

    expect(facade.saveFields).toHaveBeenCalledWith({
      githubUsername: undefined,
      email: undefined,
    });
  });
});
