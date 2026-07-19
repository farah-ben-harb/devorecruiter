export type EvaluationStatus = 'pending' | 'in_progress' | 'completed' | 'approved' | 'rejected';

export interface TechnicalEvaluation {
  id: number;
  jobPostId: number;
  title: string;
  status: EvaluationStatus;
  version: string;
  name: string | null;
  driveFileId?: string;
  driveFileUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  htmlContent?: string;
  gitRepoUrl?: string;
  index: number | null;
  quizContent?: string | null;
  quizAnswerKey?: string | null;
}

export interface RegenerateDto {
  jobPostId: number;
  evaluationId: number;
  prompt: string;
}

export interface QuizQuestionPublic {
  id: number;
  question: string;
  type: string;
  options: string[];
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizPublicView {
  invitationId: number;
  evaluationId: number;
  candidateFirstName: string;
  candidateName: string;
  title: string;
  description: string;
  durationMinutes: number;
  dueDate: string;
  questions: QuizQuestionPublic[];
}

export interface QuizAnswerItem {
  questionId: number;
  answer: string;
}

export interface QuizSubmitPayload {
  answers: QuizAnswerItem[];
  durationSeconds?: number;
}

export interface QuizDetailItem {
  questionId: number;
  question: string;
  yourAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizDomainAnalysis {
  domain: string;
  mastery: 'strong' | 'average' | 'weak';
  comment: string;
}

export interface QuizAiFeedback {
  globalScore: number;
  recommendation: 'hire' | 'maybe' | 'reject';
  globalFeedback: string;
  strengths: string[];
  weaknesses: string[];
  domainAnalysis: QuizDomainAnalysis[];
  interviewRecommendations: string[];
}

export interface QuizSubmitResult {
  scorePercent: number;
  correctAnswers: number;
  totalQuestions: number;
  detail: QuizDetailItem[];
  aiFeedback: QuizAiFeedback;
}

export interface MenuPosition {
  top: number;
  left: number;
}

export interface RegeneratePayload {
  prompt: string;
}

export interface QuizContentItem {
  id: number;
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'open';
  options: string[];
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizAnswerKeyItem {
  id: number;
  correctAnswer: string | string[];
  correct_answer?: string | string[];
  explanation: string;
}

export interface ToggleMenuEvent {
  id: number;
  event: MouseEvent;
}
