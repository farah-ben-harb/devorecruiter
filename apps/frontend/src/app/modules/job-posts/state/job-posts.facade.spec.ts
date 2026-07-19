import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { JobPostFacade } from './job-posts.facade';
import { JobPostService } from '../services/job-posts.service';
import { BrowserUiService } from '@core/services/browser-ui.service';
import type {
  DriveFile,
  PostApiResponse,
  PaginatedResponse,
  ScoringResume,
} from '../models/job-post.model';
import { mapPostApiResponseToUploadedFile } from '../mappers/job-posts.mapper';

describe('JobPostFacade', () => {
  let facade: JobPostFacade;

  const browserUiMock = {
    addBodyClass: vi.fn(),
    removeBodyClass: vi.fn(),
  };

  const jobPostServiceMock = {
    getAll: vi.fn(),
    getImportedFileIds: vi.fn(),
    process: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
    listDriveFiles: vi.fn(),
    getScoringsByJobPost: vi.fn(),
    triggerAllScoring: vi.fn(),
    deleteScoring: vi.fn(),
  };

  const driveFile: DriveFile = {
    id: 'drive-1',
    name: 'Doc From Drive',
    mimeType: 'application/pdf',
  };

  const postApi: PostApiResponse = {
    id: 10,
    name: 'Stored Doc',
    type: 'application/pdf',
    url: 'url',
    googleDriveFileId: 'drive-1',
    googleDocId: 'doc-1',
    status: 'error' as const,
    createdAt: '',
    updatedAt: '',
  };

  const paginated: PaginatedResponse<PostApiResponse> = {
    data: [postApi],
    total: 1,
    totalPages: 1,
  };

  const scoringResume: ScoringResume = {
    id: 1,
    jobPostId: 42,
    resumeFileId: 'drive-1',
    jobPostGoogleDriveFileId: 'drive-jd',
    resumeName: 'John Doe',
    scoreGlobal: 85,
    status: 'ACCEPTED',
    recommendation: 'ACCEPTED',
    strengths: ['Communication'],
    weaknesses: [],
    resume: 'Bon profil',
    criteria: {
      technicalSkills: { score: 80, detail: 'Solide' },
      experience: { score: 90, detail: 'Expérimenté' },
      education: { score: 85, detail: 'Bonne formation' },
      softSkills: { score: 80, detail: 'Bon esprit' },
      languages: { score: 75, detail: 'Anglais correct' },
    },
    createdAt: '',
  };

  beforeEach(() => {
    jobPostServiceMock.getAll.mockReturnValue(of(paginated));
    jobPostServiceMock.process.mockReturnValue(of({ data: postApi }));
    jobPostServiceMock.delete.mockReturnValue(of(undefined));
    jobPostServiceMock.download.mockReturnValue(
      of({
        data: 'base64==',
        mimeType: 'application/pdf',
        fileName: 'file.pdf',
      }),
    );
    jobPostServiceMock.listDriveFiles.mockReturnValue(of([driveFile]));
    jobPostServiceMock.getImportedFileIds.mockReturnValue(of([]));
    jobPostServiceMock.getScoringsByJobPost.mockReturnValue(of([scoringResume]));
    jobPostServiceMock.triggerAllScoring.mockReturnValue(of([scoringResume]));
    jobPostServiceMock.deleteScoring.mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        JobPostFacade,
        { provide: JobPostService, useValue: jobPostServiceMock },
        { provide: BrowserUiService, useValue: browserUiMock },
      ],
    });

    facade = TestBed.inject(JobPostFacade);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('init() charge les posts et met à jour les signals', () => {
    facade.init();
    expect(facade.uploadedFiles()).toEqual([mapPostApiResponseToUploadedFile(postApi)]);
    expect(facade.totalPages()).toBe(1);
    expect(facade.totalItems()).toBe(1);
  });

  it('selectDriveFile() ajoute un fichier en loading et remplace après process', () => {
    facade.driveFiles.set([driveFile]);

    const toastSpy = vi
      .spyOn(facade as unknown as { toastSuccess: () => void }, 'toastSuccess')
      .mockImplementation(() => {});

    facade.selectDriveFile(driveFile);

    expect(facade.driveFiles()).toEqual([]);
    expect(facade.uploadedFiles().length).toBeGreaterThan(0);
    expect(toastSpy).toHaveBeenCalled();
  });

  it('deletePost() ouvre la modale et configure fileToDelete', () => {
    facade.uploadedFiles.set([mapPostApiResponseToUploadedFile(postApi)]);
    facade.deletePost(0);

    expect(facade.showDeleteModal()).toBe(true);
    expect(facade.fileToDelete()?.file).toBeDefined();
    expect(browserUiMock.addBodyClass).toHaveBeenCalledWith('modal-open');
  });

  it('confirmDelete() supprime le post et déclenche toast', () => {
    facade.uploadedFiles.set([mapPostApiResponseToUploadedFile(postApi)]);
    facade.deletePost(0);

    const toastSpy = vi
      .spyOn(facade as unknown as { toastSuccess: () => void }, 'toastSuccess')
      .mockImplementation(() => {});

    facade.confirmDelete();

    expect(jobPostServiceMock.delete).toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalled();
    expect(facade.showDeleteModal()).toBe(false);
    expect(facade.fileToDelete()).toBeNull();
  });

  it('goToPage() change la page si valide et recharge les posts', () => {
    const loadSpy = vi.spyOn(facade as unknown as { loadSavedPosts: () => void }, 'loadSavedPosts');

    facade.totalPages.set(3);
    facade.goToPage(2);

    expect(facade.currentPage()).toBe(2);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('goToPage() ignore les pages hors limites', () => {
    const loadSpy = vi.spyOn(facade as unknown as { loadSavedPosts: () => void }, 'loadSavedPosts');

    facade.totalPages.set(3);
    facade.goToPage(0);
    facade.goToPage(4);

    expect(facade.currentPage()).toBe(1);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('closeDeleteModal() ferme la modale et remet fileToDelete à null', () => {
    facade.uploadedFiles.set([mapPostApiResponseToUploadedFile(postApi)]);
    facade.deletePost(0);
    facade.closeDeleteModal();

    expect(facade.showDeleteModal()).toBe(false);
    expect(facade.fileToDelete()).toBeNull();
    expect(browserUiMock.removeBodyClass).toHaveBeenCalledWith('modal-open');
  });

  it('loadScoringData() charge les scorings et les driveFiles', () => {
    facade.loadScoringData(42);

    expect(facade.loadingScoring()).toBe(false);
    expect(facade.scorings().length).toBe(1);
    expect(facade.scorings()[0].resumeName).toBe('John Doe');
    expect(facade.driveFiles().length).toBe(1);
  });

  it('openScoringListModal() ouvre la modale de liste', () => {
    facade.openScoringListModal();

    expect(facade.showScoringListModal()).toBe(true);
    expect(browserUiMock.addBodyClass).toHaveBeenCalledWith('modal-open');
  });

  it('closeScoringListModal() ferme la modale de liste', () => {
    facade.openScoringListModal();
    facade.closeScoringListModal();

    expect(facade.showScoringListModal()).toBe(false);
    expect(browserUiMock.removeBodyClass).toHaveBeenCalledWith('modal-open');
  });

  it('openScoringDetail() sélectionne un scoring et bascule les modales', () => {
    facade.openScoringListModal();
    facade.openScoringDetail(scoringResume);

    expect(facade.selectedScoringResume()).toEqual(scoringResume);
    expect(facade.showScoringListModal()).toBe(false);
    expect(facade.showScoringDetailModal()).toBe(true);
  });

  it('backToScoringList() revient à la liste depuis le détail', () => {
    facade.openScoringDetail(scoringResume);
    facade.backToScoringList();

    expect(facade.showScoringDetailModal()).toBe(false);
    expect(facade.showScoringListModal()).toBe(true);
  });

  it('closeScoringDetailModal() ferme le détail et remet selectedScoringResume à null', () => {
    facade.openScoringDetail(scoringResume);
    facade.closeScoringDetailModal();

    expect(facade.showScoringDetailModal()).toBe(false);
    expect(facade.selectedScoringResume()).toBeNull();
    expect(browserUiMock.removeBodyClass).toHaveBeenCalledWith('modal-open');
  });

  it('scoreAllCVs() déclenche le scoring en masse et met à jour les scorings', () => {
    const payload = { jobPostGoogleDriveFileId: 'drive-jd', jobPostId: 42 };
    facade.scoreAllCVs(42, payload);

    expect(jobPostServiceMock.triggerAllScoring).toHaveBeenCalledWith(payload);
    expect(facade.scorings().length).toBe(1);
    expect(facade.loadingAll()).toBe(false);
  });

  it('deleteScoringResume() supprime le scoring de la liste', () => {
    facade.scorings.set([scoringResume]);
    facade.deleteScoringResume(1);

    expect(jobPostServiceMock.deleteScoring).toHaveBeenCalledWith(1);
    expect(facade.scorings()).toEqual([]);
  });

  it('unscoredResumes() retourne les driveFiles non encore scorés pour un jobPost', () => {
    facade.driveFiles.set([
      driveFile,
      { id: 'drive-2', name: 'CV 2', mimeType: 'application/pdf' },
    ]);
    facade.scorings.set([scoringResume]);

    const result = facade.unscoredResumes(42);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('drive-2');
  });

  it('showScoringToast() met à jour le message et le type', () => {
    facade.showScoringToast('Test message', 'success');

    expect(facade.scoringToastMessage()).toBe('Test message');
    expect(facade.scoringToastType()).toBe('success');
  });

  it('hideScoringToast() efface le message du toast', () => {
    facade.showScoringToast('Test', 'error');
    facade.hideScoringToast();

    expect(facade.scoringToastMessage()).toBeNull();
  });
});
