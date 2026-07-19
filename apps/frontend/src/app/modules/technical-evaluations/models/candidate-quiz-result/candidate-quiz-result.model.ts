export interface CandidateQuizResult {
  id: number;
  invitationId: number;
  candidateId: string;
  evaluationId: number;
  totalQuestions: number;
  correctAnswers: number;
  scorePercent: number;
  detailJson: string | null;
  aiFeedbackJson: string | null;
  durationSeconds: number | null;
  submittedAt: string;
}

export interface QuizQuestionWithAnswer {
  id: number;
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'open';
  options: string[];
  domain: string;
  difficulty: 'easy' | 'medium' | 'hard';
  correctAnswer: string | string[];
  explanation: string;
}

export interface EditContentPayload {
  htmlContent?: string;
  quizContent?: string;
  quizAnswerKey?: string;
  changeType: 'minor' | 'major';
  isQuiz: boolean;
  name?: string;
}

export interface QuillEditor {
  clipboard: { dangerouslyPasteHTML: (html: string) => void };
}

export interface QuillChangeEvent {
  html: string | null;
}
