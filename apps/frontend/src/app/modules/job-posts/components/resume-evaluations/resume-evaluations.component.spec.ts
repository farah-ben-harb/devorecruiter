import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ResumeEvaluationComponent } from './resume-evaluations.component';
import { JobPostFacade } from '../../state/job-posts.facade';
import { ScoringResume, DriveFile } from '../../models/job-post.model';

describe('ResumeEvaluationComponent', () => {
  let component: ResumeEvaluationComponent;

  let facadeMock: {
    scorings: ReturnType<typeof signal<ScoringResume[]>>;
    loadingScoring: ReturnType<typeof signal<boolean>>;
    loadingAll: ReturnType<typeof signal<boolean>>;
    loadingResumeId: ReturnType<typeof signal<string | null>>;
    scoringError: ReturnType<typeof signal<string | null>>;
    selectedScoringResume: ReturnType<typeof signal<ScoringResume | null>>;
    showScoringListModal: ReturnType<typeof signal<boolean>>;
    showScoringDetailModal: ReturnType<typeof signal<boolean>>;
    scoringToastMessage: ReturnType<typeof signal<string | null>>;
    scoringToastType: ReturnType<typeof signal<'success' | 'error'>>;
    loadScoringData: ReturnType<typeof vi.fn>;
    openScoringListModal: ReturnType<typeof vi.fn>;
    closeScoringListModal: ReturnType<typeof vi.fn>;
    openScoringDetail: ReturnType<typeof vi.fn>;
    backToScoringList: ReturnType<typeof vi.fn>;
    closeScoringDetailModal: ReturnType<typeof vi.fn>;
    scoreAllCVs: ReturnType<typeof vi.fn>;
    deleteScoringResume: ReturnType<typeof vi.fn>;
    unscoredResumes: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    facadeMock = {
      scorings: signal<ScoringResume[]>([]),
      loadingScoring: signal(false),
      loadingAll: signal(false),
      loadingResumeId: signal(null),
      scoringError: signal(null),
      selectedScoringResume: signal(null),
      showScoringListModal: signal(false),
      showScoringDetailModal: signal(false),
      scoringToastMessage: signal(null),
      scoringToastType: signal('success'),
      loadScoringData: vi.fn(),
      openScoringListModal: vi.fn(),
      closeScoringListModal: vi.fn(),
      openScoringDetail: vi.fn(),
      backToScoringList: vi.fn(),
      closeScoringDetailModal: vi.fn(),
      scoreAllCVs: vi.fn(),
      deleteScoringResume: vi.fn(),
      unscoredResumes: vi.fn().mockReturnValue([]),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: JobPostFacade, useValue: facadeMock }],
    });

    component = TestBed.runInInjectionContext(() => new ResumeEvaluationComponent());
    component.jobPostId = 1;
    component.jobPostGoogleDriveFileId = 'file1';
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should call loadScoringData on init', () => {
    component.ngOnInit();
    expect(facadeMock.loadScoringData).toHaveBeenCalledWith(1);
  });

  it('should reflect loading state from facade', () => {
    facadeMock.loadingScoring.set(true);
    expect(component.loading()).toBe(true);
  });

  it('should reflect error state from facade', () => {
    facadeMock.scoringError.set('Erreur lors du chargement des données.');
    expect(component.errorMessage()).toBe('Erreur lors du chargement des données.');
  });

  it('should open list modal via facade', () => {
    component.openListModal();
    expect(facadeMock.openScoringListModal).toHaveBeenCalled();
  });

  it('should close list modal and emit event', () => {
    const spy = vi.spyOn(component.closePanelEvent, 'emit');
    component.closeListModal();
    expect(facadeMock.closeScoringListModal).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('should close detail modal and emit event', () => {
    const spy = vi.spyOn(component.closePanelEvent, 'emit');
    component.closeDetailModal();
    expect(facadeMock.closeScoringDetailModal).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
  });

  it('should call scoreAllCVs on facade', () => {
    component.scoreAllCVs();
    expect(facadeMock.scoreAllCVs).toHaveBeenCalledWith(1, {
      jobPostGoogleDriveFileId: 'file1',
      jobPostId: 1,
    });
  });

  it('should reflect scorings from facade', () => {
    facadeMock.scorings.set([{ id: 1, scoreGlobal: 80 } as unknown as ScoringResume]);
    expect(component.scorings().length).toBe(1);
  });

  it('should call deleteScoringResume on facade', () => {
    const event = new Event('click');
    component.deleteScoringResume(event, 1);
    expect(facadeMock.deleteScoringResume).toHaveBeenCalledWith(1);
  });

  it('should call unscoredResumes on facade', () => {
    const mockFiles = [{ id: '2' }] as DriveFile[];
    facadeMock.unscoredResumes.mockReturnValue(mockFiles);
    expect(component.unscoredResumes()).toEqual(mockFiles);
    expect(facadeMock.unscoredResumes).toHaveBeenCalledWith(1);
  });

  it('should open detail via facade', () => {
    const scoring = { id: 1 } as unknown as ScoringResume;
    component.openDetail(scoring);
    expect(facadeMock.openScoringDetail).toHaveBeenCalledWith(scoring);
  });

  it('should go back to list via facade', () => {
    component.backToList();
    expect(facadeMock.backToScoringList).toHaveBeenCalled();
  });

  it('should return correct bar color', () => {
    expect(component.getBarColor(80)).toBe('bg-green-500');
    expect(component.getBarColor(50)).toBe('bg-amber-500');
    expect(component.getBarColor(20)).toBe('bg-red-500');
  });

  it('should return correct text color', () => {
    expect(component.getTextColor(80)).toBe('text-green-700');
    expect(component.getTextColor(50)).toBe('text-amber-600');
    expect(component.getTextColor(20)).toBe('text-red-700');
  });

  it('should return correct badge class', () => {
    expect(component.getBadgeClass('ACCEPTED')).toContain('green');
    expect(component.getBadgeClass('REJECTED')).toContain('red');
  });

  it('should return correct score circle class', () => {
    expect(component.getScoreCircleClass(80)).toContain('green');
    expect(component.getScoreCircleClass(50)).toContain('amber');
    expect(component.getScoreCircleClass(20)).toContain('red');
  });
});
