import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { SendEvaluationModalComponent } from './send-evaluation-modal.component';
import { JobPostService } from '../../../job-posts/services/job-posts.service';
import { PostApiResponse, PaginatedResponse } from '../../../job-posts/models/job-post.model';
import { ResumeListItem } from '../../../candidates/models/candidate.model';
import { TechnicalEvaluation } from '@app/modules/technical-evaluations/models/technical-evaluation/technical-evaluation.model';
import { TechnicalEvaluationService } from '@app/modules/technical-evaluations/services/technical-evaluations/technical-evaluation.service';
import { EvaluationInvitationsService } from '@app/modules/technical-evaluations/services/evaluation-invitations/evaluation-invitations.service';
import { EvaluationInvitation } from '@app/modules/technical-evaluations/models/evaluation-invitation/evaluation-invitation.model';
import { CandidateQuizService } from '@app/modules/technical-evaluations/services/candidate-quiz/candidate-quiz.service';
import { CandidateCodeEvaluationService } from '@app/modules/technical-evaluations/services/candidates-code-evaluation/candidate-code-evaluation.service';
import { CandidateCodeEvaluation } from '@app/modules/technical-evaluations/models/candidate-code-evaluation/candidate-code-evaluation.model';
import { CandidateQuizResult } from '@app/modules/technical-evaluations/models/candidate-quiz-result/candidate-quiz-result.model';

type JobPostServiceMock = Pick<JobPostService, 'getAll'>;
type TechnicalEvaluationServiceMock = Pick<TechnicalEvaluationService, 'findAll'>;
type EvaluationInvitationsServiceMock = Pick<
  EvaluationInvitationsService,
  'findByResumeFileId' | 'send'
>;
type CandidateQuizServiceMock = Pick<CandidateQuizService, 'getResultByInvitation'>;
type CandidateCodeEvaluationServiceMock = Pick<
  CandidateCodeEvaluationService,
  'getByInvitation' | 'evaluate'
>;
type RouterMock = Pick<Router, 'navigate'>;

const buildCandidate = (overrides: Partial<ResumeListItem> = {}): ResumeListItem => ({
  id: 'cand-1',
  name: 'Jean Dupont',
  driveLink: 'https://drive.google.com/file/cand-1',
  driveId: 'drive-cand-1',
  type: 'unifie',
  createdAt: '2026-01-01T00:00:00.000Z',
  status: 'done',
  hasUnifie: true,
  ...overrides,
});

const buildPostApiResponse = (overrides: Partial<PostApiResponse> = {}): PostApiResponse => ({
  id: 1,
  name: 'poste-1.docx',
  status: 'unified',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildEvaluation = (overrides: Partial<TechnicalEvaluation> = {}): TechnicalEvaluation => ({
  id: 1,
  jobPostId: 10,
  title: 'Évaluation coding',
  status: 'approved',
  version: '1.0',
  name: 'Kata Node',
  index: 0,
  quizContent: null,
  ...overrides,
});

const buildInvitation = (overrides: Partial<EvaluationInvitation> = {}): EvaluationInvitation => ({
  id: 1,
  evaluationId: 1,
  candidateId: 'cand-1',
  jobPostId: 10,
  sentAt: '2026-01-01T00:00:00.000Z',
  dueDate: '2026-02-01',
  ...overrides,
});

describe('SendEvaluationModalComponent', () => {
  let component: SendEvaluationModalComponent;
  let jobPostServiceMock: JobPostServiceMock;
  let evalServiceMock: TechnicalEvaluationServiceMock;
  let invitationsServiceMock: EvaluationInvitationsServiceMock;
  let quizResultServiceMock: CandidateQuizServiceMock;
  let codeEvalServiceMock: CandidateCodeEvaluationServiceMock;
  let routerMock: RouterMock;

  const emptyPaginated: PaginatedResponse<PostApiResponse> = { data: [] };

  beforeEach(() => {
    jobPostServiceMock = {
      getAll: vi.fn().mockReturnValue(of(emptyPaginated)),
    };
    evalServiceMock = {
      findAll: vi.fn().mockReturnValue(of([])),
    };
    invitationsServiceMock = {
      findByResumeFileId: vi.fn().mockReturnValue(of([])),
      send: vi.fn().mockReturnValue(of(undefined)),
    };
    quizResultServiceMock = {
      getResultByInvitation: vi.fn().mockReturnValue(of(null)),
    };
    codeEvalServiceMock = {
      getByInvitation: vi.fn().mockReturnValue(of(null)),
      evaluate: vi.fn().mockReturnValue(of({} as CandidateCodeEvaluation)),
    };
    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [SendEvaluationModalComponent],
      providers: [
        { provide: JobPostService, useValue: jobPostServiceMock },
        { provide: TechnicalEvaluationService, useValue: evalServiceMock },
        { provide: EvaluationInvitationsService, useValue: invitationsServiceMock },
        { provide: CandidateQuizService, useValue: quizResultServiceMock },
        { provide: CandidateCodeEvaluationService, useValue: codeEvalServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    const fixture = TestBed.createComponent(SendEvaluationModalComponent);
    component = fixture.componentInstance;
    component.candidate = buildCandidate();
  });

  describe('ngOnInit', () => {
    it('charge les fiches de poste et les invitations existantes', () => {
      invitationsServiceMock.findByResumeFileId = vi.fn().mockReturnValue(of([buildInvitation()]));

      component.ngOnInit();

      expect(jobPostServiceMock.getAll).toHaveBeenCalledWith(1, 999, undefined, 'unified');
      expect(invitationsServiceMock.findByResumeFileId).toHaveBeenCalledWith('drive-cand-1');
      expect(component.existingInvitations()).toHaveLength(1);
      expect(component.loadingJobPosts()).toBe(false);
      expect(component.loadingInvitations()).toBe(false);
    });

    it("ne charge pas les invitations si le candidat n'a pas de driveId", () => {
      component.candidate = buildCandidate({ driveId: '' });

      component.ngOnInit();

      expect(invitationsServiceMock.findByResumeFileId).not.toHaveBeenCalled();
    });
  });

  describe('loadJobPosts (via ngOnInit)', () => {
    it('mappe les PostApiResponse en UploadedFile', () => {
      const raw = buildPostApiResponse({
        id: 5,
        name: 'poste-5.docx',
        company: 'Devoteam',
        title: 'DevOps Engineer',
        jobStatus: 'open',
      });
      jobPostServiceMock.getAll = vi.fn().mockReturnValue(of({ data: [raw] }));

      component.ngOnInit();

      const jobPosts = component.jobPosts();
      expect(jobPosts).toHaveLength(1);
      expect(jobPosts[0]).toMatchObject({
        id: '5',
        name: 'poste-5.docx',
        company: 'Devoteam',
        title: 'DevOps Engineer',
        jobStatus: 'open',
        isDriveFile: true,
        status: 'unified',
      });
    });

    it('applique les valeurs par défaut si les champs optionnels sont absents', () => {
      jobPostServiceMock.getAll = vi
        .fn()
        .mockReturnValue(of({ data: [buildPostApiResponse({ id: 7, name: undefined })] }));

      component.ngOnInit();

      const jobPosts = component.jobPosts();
      expect(jobPosts[0].name).toBe('Sans nom');
      expect(jobPosts[0].hasEvaluation).toBe(false);
      expect(jobPosts[0].requiresCoding).toBeNull();
      expect(jobPosts[0].hasQcm).toBeNull();
      expect(jobPosts[0].linkedCandidateIds).toEqual([]);
    });
  });

  describe('invitations et filtres de fiches de poste', () => {
    beforeEach(() => {
      jobPostServiceMock.getAll = vi.fn().mockReturnValue(
        of({
          data: [
            buildPostApiResponse({ id: 1 }),
            buildPostApiResponse({ id: 2 }),
            buildPostApiResponse({ id: 3 }),
          ],
        }),
      );
      invitationsServiceMock.findByResumeFileId = vi
        .fn()
        .mockReturnValue(of([buildInvitation({ jobPostId: 1 })]));
      component.ngOnInit();
    });

    it('isJobPostInvited retourne true pour une fiche invitée', () => {
      expect(component.isJobPostInvited('1')).toBe(true);
      expect(component.isJobPostInvited('2')).toBe(false);
    });

    it('filteredJobPosts filtre correctement selon "invited"', () => {
      component.setJobPostFilter('invited');
      expect(component.filteredJobPosts().map((j) => j.id)).toEqual(['1']);
    });

    it('filteredJobPosts filtre correctement selon "not-invited"', () => {
      component.setJobPostFilter('not-invited');
      expect(component.filteredJobPosts().map((j) => j.id)).toEqual(['2', '3']);
    });

    it('invitedCount et notInvitedCount sont corrects', () => {
      expect(component.invitedCount()).toBe(1);
      expect(component.notInvitedCount()).toBe(2);
    });
  });

  describe('selectJobPost', () => {
    it('passe à l’étape 2 et charge les évaluations taguées coding/quiz', () => {
      const codingEval = buildEvaluation({ id: 1, quizContent: null });
      const quizEval = buildEvaluation({ id: 2, quizContent: 'quiz-payload' });
      evalServiceMock.findAll = vi
        .fn()
        .mockImplementation((_jobPostId: number, mode?: 'coding' | 'quiz') =>
          mode === 'quiz' ? of([quizEval]) : of([codingEval]),
        );

      component.selectJobPost({
        id: '10',
        name: 'poste-10.docx',
        type: 'application/vnd.google-apps.document',
        url: '',
        isDriveFile: true,
        isLoading: false,
        status: 'unified',
      });

      expect(component.step()).toBe(2);
      expect(evalServiceMock.findAll).toHaveBeenCalledWith(10, 'coding');
      expect(evalServiceMock.findAll).toHaveBeenCalledWith(10, 'quiz');

      const all = component.allEvaluations();
      expect(all).toHaveLength(2);
      expect(all.find((e) => e.id === 1)?.quizContent).toBeNull();
      expect(all.find((e) => e.id === 2)?.quizContent).toBe('quiz-payload');
    });
  });

  describe('filteredEvaluations et compteurs', () => {
    beforeEach(() => {
      component.allEvaluations.set([
        buildEvaluation({ id: 1, status: 'approved', quizContent: null }),
        buildEvaluation({ id: 2, status: 'approved', quizContent: 'quiz' }),
        buildEvaluation({ id: 3, status: 'pending', quizContent: null }),
      ]);
      component.existingInvitations.set([buildInvitation({ id: 100, evaluationId: 1 })]);
      component.selectedJobPost.set({
        id: '10',
        name: 'poste-10.docx',
        type: 'application/vnd.google-apps.document',
        url: '',
        isDriveFile: true,
        isLoading: false,
        status: 'unified',
      });
    });

    it('ne garde que les évaluations approuvées et filtre par mode coding', () => {
      component.setEvalMode('coding');
      expect(component.filteredEvaluations().map((e) => e.id)).toEqual([1]);
    });

    it('filtre par mode quiz', () => {
      component.setEvalMode('quiz');
      expect(component.filteredEvaluations().map((e) => e.id)).toEqual([2]);
    });

    it('filtre "sent" ne garde que les évaluations déjà invitées', () => {
      component.setEvalMode('coding');
      component.setEvalFilter('sent');
      expect(component.filteredEvaluations().map((e) => e.id)).toEqual([1]);
    });

    it('filtre "not-sent" exclut les évaluations déjà invitées', () => {
      component.setEvalMode('coding');
      component.setEvalFilter('not-sent');
      expect(component.filteredEvaluations()).toEqual([]);
    });

    it('codingCount et quizCount comptent uniquement les évaluations approuvées', () => {
      expect(component.codingCount()).toBe(1);
      expect(component.quizCount()).toBe(1);
    });
  });

  describe('sélection des évaluations', () => {
    beforeEach(() => {
      component.allEvaluations.set([
        buildEvaluation({ id: 1, status: 'approved', quizContent: null }),
        buildEvaluation({ id: 2, status: 'approved', quizContent: null }),
      ]);
      component.setEvalMode('coding');
    });

    it('toggleSelection ajoute puis retire un id', () => {
      component.toggleSelection(1);
      expect(component.isSelected(1)).toBe(true);
      component.toggleSelection(1);
      expect(component.isSelected(1)).toBe(false);
    });

    it('toggleSelectAll sélectionne tout puis désélectionne tout', () => {
      component.toggleSelectAll();
      expect(component.isAllSelected()).toBe(true);
      component.toggleSelectAll();
      expect(component.selectedCount()).toBe(0);
    });

    it('isIndeterminate est vrai si une partie seulement est sélectionnée', () => {
      component.toggleSelection(1);
      expect(component.isIndeterminate()).toBe(true);
    });

    it("n'inclut pas dans toggleSelectAll les évaluations déjà envoyées", () => {
      component.selectedJobPost.set({
        id: '10',
        name: 'poste-10.docx',
        type: 'application/vnd.google-apps.document',
        url: '',
        isDriveFile: true,
        isLoading: false,
        status: 'unified',
      });
      component.existingInvitations.set([buildInvitation({ evaluationId: 1, jobPostId: 10 })]);

      component.toggleSelectAll();

      expect(component.isSelected(1)).toBe(false);
      expect(component.isSelected(2)).toBe(true);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      component.selectedJobPost.set({
        id: '10',
        name: 'poste-10.docx',
        type: 'application/vnd.google-apps.document',
        url: '',
        isDriveFile: true,
        isLoading: false,
        status: 'unified',
      });
      component.allEvaluations.set([buildEvaluation({ id: 1, title: 'Kata Node' })]);
      component.selectedIds.set(new Set([1]));
      component.dueDate.set('2026-08-01');
    });

    it("affiche une erreur si la date d'échéance est manquante", async () => {
      component.dueDate.set('');

      await component.send();

      expect(component.error()).toBe(
        "Veuillez sélectionner au moins une évaluation et une date d'échéance.",
      );
      expect(invitationsServiceMock.send).not.toHaveBeenCalled();
    });

    it('envoie les invitations et marque le succès', async () => {
      await component.send();

      expect(invitationsServiceMock.send).toHaveBeenCalledWith({
        evaluationId: 1,
        jobPostId: 10,
        dueDate: '2026-08-01',
        scoringResumeIds: [],
        unscoredResumeIds: ['drive-cand-1'],
      });
      expect(component.sendResults()).toEqual([{ title: 'Kata Node', success: true }]);
      expect(component.allSent()).toBe(true);
      expect(component.sending()).toBe(false);
    });

    it("consigne l'échec avec le message d'erreur retourné", async () => {
      invitationsServiceMock.send = vi
        .fn()
        .mockReturnValue(throwError(() => ({ error: { message: 'Quota dépassé' } })));

      await component.send();

      expect(component.sendResults()).toEqual([
        { title: 'Kata Node', success: false, error: 'Quota dépassé' },
      ]);
    });
  });

  describe('openHistoryForEvaluation', () => {
    it('charge les résultats de quiz pour une évaluation de type quiz', () => {
      const evaluation = buildEvaluation({ id: 2, quizContent: 'quiz-payload' });
      const invitation = buildInvitation({ id: 50, evaluationId: 2 });
      const quizResult: CandidateQuizResult = {
        id: 1,
        invitationId: 50,
        candidateId: 'cand-1',
        evaluationId: 2,
        totalQuestions: 10,
        correctAnswers: 8,
        scorePercent: 80,
        detailJson: null,
        aiFeedbackJson: null,
        durationSeconds: 300,
        submittedAt: '2026-01-01T00:00:00.000Z',
      };
      component.existingInvitations.set([invitation]);
      quizResultServiceMock.getResultByInvitation = vi.fn().mockReturnValue(of(quizResult));

      component.openHistoryForEvaluation(evaluation);

      expect(component.showHistoryModal()).toBe(true);
      expect(quizResultServiceMock.getResultByInvitation).toHaveBeenCalledWith(50);
      expect(component.quizResults().get(50)).toEqual(quizResult);
    });

    it('charge les résultats de code pour une évaluation de type coding', () => {
      const evaluation = buildEvaluation({ id: 1, quizContent: null });
      const invitation = buildInvitation({ id: 60, evaluationId: 1 });
      const codeResult: CandidateCodeEvaluation = {
        id: 1,
        invitationId: 60,
        candidateId: 'cand-1',
        evaluationId: 1,
        branch: 'main',
        globalScore: 85,
        technicalScore: 90,
        qualityScore: 80,
        feedback: 'Bon travail',
        strengths: ['Clean code'],
        improvements: ['Tests manquants'],
        recommendation: 'hire',
        evaluatedAt: '2026-01-01T00:00:00.000Z',
      };
      component.existingInvitations.set([invitation]);
      codeEvalServiceMock.getByInvitation = vi.fn().mockReturnValue(of(codeResult));

      component.openHistoryForEvaluation(evaluation);

      expect(codeEvalServiceMock.getByInvitation).toHaveBeenCalledWith(60);
      expect(component.codeEvaluations().get(60)).toEqual(codeResult);
    });
  });

  describe('onEvaluate', () => {
    it('déclenche l’évaluation et stocke le résultat', () => {
      const codeResult: CandidateCodeEvaluation = {
        id: 1,
        invitationId: 60,
        candidateId: 'cand-1',
        evaluationId: 1,
        branch: 'main',
        globalScore: 70,
        technicalScore: 75,
        qualityScore: 65,
        feedback: 'Correct',
        strengths: [],
        improvements: [],
        recommendation: 'maybe',
        evaluatedAt: '2026-01-01T00:00:00.000Z',
      };
      codeEvalServiceMock.evaluate = vi.fn().mockReturnValue(of(codeResult));

      component.onEvaluate(60);

      expect(codeEvalServiceMock.evaluate).toHaveBeenCalledWith(60);
      expect(component.codeEvaluations().get(60)).toEqual(codeResult);
      expect(component.evaluatingInvitationId()).toBeNull();
    });
  });

  describe('navigation', () => {
    it('goToCreateEvaluation ferme la modale et navigue en mode coding', () => {
      const closeSpy = vi.fn();
      component.close.subscribe(closeSpy);
      component.selectedJobPost.set({
        id: '10',
        name: 'poste-10.docx',
        type: 'application/vnd.google-apps.document',
        url: '',
        isDriveFile: true,
        isLoading: false,
        status: 'unified',
        company: 'Devoteam',
      });

      component.goToCreateEvaluation();

      expect(closeSpy).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/technical-evaluations'], {
        queryParams: { jobPostId: '10', company: 'Devoteam', mode: 'coding' },
      });
    });

    it('goBack réinitialise l’état vers l’étape 1', () => {
      component.step.set(2);
      component.selectedJobPost.set({
        id: '10',
        name: 'poste-10.docx',
        type: 'application/vnd.google-apps.document',
        url: '',
        isDriveFile: true,
        isLoading: false,
        status: 'unified',
      });
      component.dueDate.set('2026-08-01');

      component.goBack();

      expect(component.step()).toBe(1);
      expect(component.selectedJobPost()).toBeNull();
      expect(component.dueDate()).toBe('');
      expect(component.allEvaluations()).toEqual([]);
    });
  });
});
