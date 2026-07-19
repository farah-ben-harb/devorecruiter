import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { JobPostEvaluationComponent } from './job-post-evaluations.component';
import { CandidatesFacade } from '../../state/candidates/candidates.facade';
import { ResumeListItem } from '../../models/candidate.model';

describe('JobPostEvaluationComponent', () => {
  let component: JobPostEvaluationComponent;

  let facadeMock: {
    scoringResult: ReturnType<typeof signal>;
    scoringLoading: ReturnType<typeof signal>;
    scoringTriggering: ReturnType<typeof signal>;
    scoringError: ReturnType<typeof signal>;
    downloadingFileId: ReturnType<typeof signal>;
    loadScoringResult: ReturnType<typeof vi.fn>;
    triggerScoring: ReturnType<typeof vi.fn>;
    downloadJobPost: ReturnType<typeof vi.fn>;
    ngOnDestroy: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    facadeMock = {
      scoringResult: signal(null),
      scoringLoading: signal(false),
      scoringTriggering: signal(false),
      scoringError: signal(''),
      downloadingFileId: signal(null),
      loadScoringResult: vi.fn(),
      triggerScoring: vi.fn(),
      downloadJobPost: vi.fn(),
      ngOnDestroy: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: CandidatesFacade, useValue: facadeMock }],
    });

    const fixture = TestBed.createComponent(JobPostEvaluationComponent);
    component = fixture.componentInstance;
    component.resume = { id: '123' } as ResumeListItem;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should call loadScoringResult on init', () => {
    component.ngOnInit();

    expect(facadeMock.loadScoringResult).toHaveBeenCalledWith('123');
  });

  it('should reflect loading state from facade', () => {
    facadeMock.scoringLoading.set(true);

    expect(component.loading()).toBe(true);
  });

  it('should reflect error state from facade', () => {
    facadeMock.scoringError.set('Impossible de charger les résultats.');

    expect(component.error()).toBe('Impossible de charger les résultats.');
  });

  it('should reflect result from facade', () => {
    facadeMock.scoringResult.set({ totalMatch: 95 });

    expect(component.result()?.totalMatch).toBe(95);
  });

  it('should reflect triggering state from facade', () => {
    facadeMock.scoringTriggering.set(true);

    expect(component.triggering()).toBe(true);
  });

  it('should call triggerScoring on facade', () => {
    component.triggerScoring();

    expect(facadeMock.triggerScoring).toHaveBeenCalledWith('123');
  });

  it('should call ngOnDestroy on facade', () => {
    component.ngOnDestroy();

    expect(facadeMock.ngOnDestroy).toHaveBeenCalled();
  });

  it('should call downloadJobPost on facade', () => {
    component.downloadJobPost('file-1', 'offre.pdf');

    expect(facadeMock.downloadJobPost).toHaveBeenCalledWith('file-1', 'offre.pdf');
  });

  it('should emit close event', () => {
    const spy = vi.spyOn(component.closed, 'emit');

    component.close();

    expect(spy).toHaveBeenCalled();
  });

  it('should return correct scoreCircleClass', () => {
    expect(component.scoreCircleClass(70)).toContain('green');
    expect(component.scoreCircleClass(50)).toContain('yellow');
    expect(component.scoreCircleClass(30)).toContain('red');
  });

  it('should return correct scoreBarColor', () => {
    expect(component.scoreBarColor(70)).toBe('bg-green-500');
    expect(component.scoreBarColor(50)).toBe('bg-yellow-500');
    expect(component.scoreBarColor(30)).toBe('bg-red-400');
  });
});
