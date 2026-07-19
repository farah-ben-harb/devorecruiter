import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EditJobStatusModalComponent } from './edit-job-status-modal.component';
import { JobPostService } from '../../services/job-posts.service';
import { CandidateSearchResult, UploadedFile } from '../../models/job-post.model';

type JobPostServiceMock = Pick<JobPostService, 'searchCandidates' | 'updateJobStatus'>;

const buildCandidate = (overrides: Partial<CandidateSearchResult> = {}): CandidateSearchResult => ({
  id: 'cand-1',
  name: 'Dupont',
  firstName: 'Jean',
  email: 'jean.dupont@example.com',
  unifieDriveName: null,
  unifieDriveLink: null,
  ...overrides,
});

const buildUploadedFile = (overrides: Partial<UploadedFile> = {}): UploadedFile => ({
  name: 'poste-1.docx',
  type: 'application/vnd.google-apps.document',
  url: '',
  isDriveFile: true,
  status: 'unified',
  isLoading: false,
  ...overrides,
});

describe('EditJobStatusModalComponent', () => {
  let component: EditJobStatusModalComponent;
  let jobPostServiceMock: JobPostServiceMock;

  beforeEach(() => {
    vi.useFakeTimers();

    jobPostServiceMock = {
      searchCandidates: vi.fn().mockReturnValue(of([])),
      updateJobStatus: vi.fn().mockReturnValue(of({})),
    };

    // Instanciation directe : le composant utilise l'injection par
    // constructeur, ce qui provoque NG0202 avec TestBed dans cet
    // environnement Vitest. `new` contourne le problème sans toucher au fichier.
    // Le pipeline RxJS interne (searchSubject) est mis en place dans le
    // constructeur et fonctionne normalement hors DI Angular.
    component = new EditJobStatusModalComponent(jobPostServiceMock as JobPostService);
    component.jobPostId = 10;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ngOnInit', () => {
    it('initialise jobStatus depuis file.jobStatus', () => {
      component.file = buildUploadedFile({ jobStatus: 'open' });

      component.ngOnInit();

      expect(component.jobStatus()).toBe('open');
    });

    it('jobStatus reste null si file est absent', () => {
      component.file = null;

      component.ngOnInit();

      expect(component.jobStatus()).toBeNull();
    });

    it('charge les candidats liés si jobStatus est closed_with_hire et des ids sont présents', () => {
      const candidates = [buildCandidate({ id: 'c1' }), buildCandidate({ id: 'c2' })];
      jobPostServiceMock.searchCandidates = vi.fn().mockReturnValue(of(candidates));
      component.file = buildUploadedFile({
        jobStatus: 'closed_with_hire',
        linkedCandidateIds: ['c1', 'c2'],
      });

      component.ngOnInit();

      expect(jobPostServiceMock.searchCandidates).toHaveBeenCalledWith(undefined, ['c1', 'c2']);
      expect(component.linkedCandidates()).toEqual(candidates);
    });

    it('ne charge pas les candidats si jobStatus n’est pas closed_with_hire', () => {
      component.file = buildUploadedFile({ jobStatus: 'open', linkedCandidateIds: ['c1'] });

      component.ngOnInit();

      expect(jobPostServiceMock.searchCandidates).not.toHaveBeenCalled();
    });

    it('ne charge pas les candidats si linkedCandidateIds est vide', () => {
      component.file = buildUploadedFile({ jobStatus: 'closed_with_hire', linkedCandidateIds: [] });

      component.ngOnInit();

      expect(jobPostServiceMock.searchCandidates).not.toHaveBeenCalled();
    });
  });

  describe('setJobStatus', () => {
    it('met à jour jobStatus', () => {
      component.setJobStatus('open');

      expect(component.jobStatus()).toBe('open');
    });

    it('réinitialise les candidats liés et la recherche si le statut n’est plus closed_with_hire', () => {
      component.linkedCandidates.set([buildCandidate()]);
      component.candidateSearchResults.set([buildCandidate({ id: 'c2' })]);
      component.candidateSearchQuery.set('Jean');

      component.setJobStatus('closed_without_hire');

      expect(component.linkedCandidates()).toEqual([]);
      expect(component.candidateSearchResults()).toEqual([]);
      expect(component.candidateSearchQuery()).toBe('');
    });

    it('conserve les candidats liés si le statut reste closed_with_hire', () => {
      const candidate = buildCandidate();
      component.linkedCandidates.set([candidate]);

      component.setJobStatus('closed_with_hire');

      expect(component.linkedCandidates()).toEqual([candidate]);
    });
  });

  describe('showCandidateSearch', () => {
    it('est vrai uniquement quand jobStatus est closed_with_hire', () => {
      component.setJobStatus('closed_with_hire');
      expect(component.showCandidateSearch()).toBe(true);

      component.setJobStatus('open');
      expect(component.showCandidateSearch()).toBe(false);
    });
  });

  describe('onCandidateSearch (debounce)', () => {
    it('met à jour candidateSearchQuery immédiatement', () => {
      component.onCandidateSearch('Jean');

      expect(component.candidateSearchQuery()).toBe('Jean');
    });

    it('déclenche la recherche après le debounce de 300ms', () => {
      const results = [buildCandidate({ id: 'c1' })];
      jobPostServiceMock.searchCandidates = vi.fn().mockReturnValue(of(results));

      component.onCandidateSearch('Jean');
      vi.advanceTimersByTime(300);

      expect(jobPostServiceMock.searchCandidates).toHaveBeenCalledWith('Jean');
      expect(component.candidateSearchResults()).toEqual(results);
      expect(component.candidateSearchLoading()).toBe(false);
    });

    it('ne déclenche rien avant la fin du debounce', () => {
      component.onCandidateSearch('Jean');
      vi.advanceTimersByTime(200);

      expect(jobPostServiceMock.searchCandidates).not.toHaveBeenCalled();
    });

    it('ne relance pas la recherche pour une valeur identique (distinctUntilChanged)', () => {
      component.onCandidateSearch('Jean');
      vi.advanceTimersByTime(300);
      component.onCandidateSearch('Jean');
      vi.advanceTimersByTime(300);

      expect(jobPostServiceMock.searchCandidates).toHaveBeenCalledTimes(1);
    });

    it('vide les résultats sans appeler le service pour une requête vide', () => {
      component.candidateSearchResults.set([buildCandidate()]);

      component.onCandidateSearch('   ');
      vi.advanceTimersByTime(300);

      expect(jobPostServiceMock.searchCandidates).not.toHaveBeenCalled();
      expect(component.candidateSearchResults()).toEqual([]);
      expect(component.candidateSearchLoading()).toBe(false);
    });

    it('exclut de la recherche les candidats déjà liés', () => {
      component.linkedCandidates.set([buildCandidate({ id: 'c1' })]);
      jobPostServiceMock.searchCandidates = vi
        .fn()
        .mockReturnValue(of([buildCandidate({ id: 'c1' }), buildCandidate({ id: 'c2' })]));

      component.onCandidateSearch('Jean');
      vi.advanceTimersByTime(300);

      expect(component.candidateSearchResults()).toEqual([buildCandidate({ id: 'c2' })]);
    });

    it('arrête le chargement en cas d’erreur de recherche', () => {
      jobPostServiceMock.searchCandidates = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('network error')));

      component.onCandidateSearch('Jean');
      vi.advanceTimersByTime(300);

      expect(component.candidateSearchLoading()).toBe(false);
    });
  });

  describe('linkCandidate / unlinkCandidate', () => {
    it('linkCandidate ajoute un candidat et vide la recherche', () => {
      const candidate = buildCandidate();
      component.candidateSearchResults.set([candidate]);
      component.candidateSearchQuery.set('Jean');

      component.linkCandidate(candidate);

      expect(component.linkedCandidates()).toEqual([candidate]);
      expect(component.candidateSearchResults()).toEqual([]);
      expect(component.candidateSearchQuery()).toBe('');
    });

    it('linkCandidate ignore un candidat déjà lié', () => {
      const candidate = buildCandidate();
      component.linkedCandidates.set([candidate]);

      component.linkCandidate(candidate);

      expect(component.linkedCandidates()).toEqual([candidate]);
    });

    it('unlinkCandidate retire un candidat par id', () => {
      component.linkedCandidates.set([buildCandidate({ id: 'c1' }), buildCandidate({ id: 'c2' })]);

      component.unlinkCandidate('c1');

      expect(component.linkedCandidates().map((c) => c.id)).toEqual(['c2']);
    });
  });

  describe('candidateDisplayName', () => {
    it('combine firstName et name', () => {
      const candidate = buildCandidate({ firstName: 'Jean', name: 'Dupont' });

      expect(component.candidateDisplayName(candidate)).toBe('Jean Dupont');
    });

    it('retombe sur email si firstName et name sont absents', () => {
      const candidate = buildCandidate({ firstName: null, name: null, email: 'jean@example.com' });

      expect(component.candidateDisplayName(candidate)).toBe('jean@example.com');
    });

    it('retombe sur id si tout est absent', () => {
      const candidate = buildCandidate({ firstName: null, name: null, email: null, id: 'c99' });

      expect(component.candidateDisplayName(candidate)).toBe('c99');
    });
  });

  describe('save', () => {
    it('envoie updateJobStatus avec les ids des candidats liés si closed_with_hire', () => {
      component.setJobStatus('closed_with_hire');
      component.linkedCandidates.set([buildCandidate({ id: 'c1' }), buildCandidate({ id: 'c2' })]);

      component.save();

      expect(jobPostServiceMock.updateJobStatus).toHaveBeenCalledWith(10, 'closed_with_hire', [
        'c1',
        'c2',
      ]);
    });

    it('envoie un tableau vide de linkedCandidateIds si le statut n’est pas closed_with_hire', () => {
      component.setJobStatus('open');
      component.linkedCandidates.set([buildCandidate({ id: 'c1' })]);

      component.save();

      expect(jobPostServiceMock.updateJobStatus).toHaveBeenCalledWith(10, 'open', []);
    });

    it('émet saved avec le résultat complet en cas de succès', () => {
      const savedSpy = vi.fn();
      component.saved.subscribe(savedSpy);
      component.setJobStatus('closed_with_hire');
      const candidate = buildCandidate({ id: 'c1' });
      component.linkedCandidates.set([candidate]);

      component.save();

      expect(savedSpy).toHaveBeenCalledWith({
        jobStatus: 'closed_with_hire',
        linkedCandidateIds: ['c1'],
        linkedCandidates: [candidate],
      });
      expect(component.saving()).toBe(false);
    });

    it('émet linkedCandidates vide dans le résultat si le statut n’est pas closed_with_hire', () => {
      const savedSpy = vi.fn();
      component.saved.subscribe(savedSpy);
      component.setJobStatus('open');

      component.save();

      expect(savedSpy).toHaveBeenCalledWith({
        jobStatus: 'open',
        linkedCandidateIds: [],
        linkedCandidates: [],
      });
    });

    it('définit errorMsg en cas d’échec', () => {
      jobPostServiceMock.updateJobStatus = vi
        .fn()
        .mockReturnValue(throwError(() => new Error('network error')));

      component.save();

      expect(component.errorMsg()).toBe('Erreur lors de la sauvegarde. Veuillez réessayer.');
      expect(component.saving()).toBe(false);
    });
  });

  describe('onClose', () => {
    it('émet close', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);

      component.onClose();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
