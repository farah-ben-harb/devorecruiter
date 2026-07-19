import { QuizQuestionPublic } from "../../templates/quiz-evaluation.template";

export interface AiQuizFeedback {
  globalScore: number;
  recommendation: 'hire' | 'maybe' | 'reject';
  globalFeedback: string;
  strengths: string[];
  weaknesses: string[];
  domainAnalysis: {
    domain: string;
    mastery: 'strong' | 'average' | 'weak';
    comment: string;
  }[];
  interviewRecommendations: string[];
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

export interface QuizSubmitResult {
  scorePercent: number;
  correctAnswers: number;
  totalQuestions: number;
  detail: {
    questionId: number;
    question: string;
    yourAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}