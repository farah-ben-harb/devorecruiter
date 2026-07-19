import { Quiz, QuizStatus } from './quiz.entity';

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeQuiz(overrides: Partial<Quiz> = {}): Quiz {
  const quiz = new Quiz();
  quiz.id = 1;
  quiz.jobPostId = 1;
  quiz.title = 'Quiz technique Backend NestJS';
  quiz.status = QuizStatus.PENDING;
  quiz.version = '1.0';
  quiz.index = null;
  quiz.quizContent = null;
  quiz.quizAnswerKey = null;
  quiz.createdAt = new Date('2024-01-15T10:00:00.000Z');
  quiz.updatedAt = new Date('2024-01-15T10:30:00.000Z');
  return Object.assign(quiz, overrides);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Quiz entity', () => {

  // ── Instantiation ──────────────────────────────────────────────────────────

  describe('instantiation', () => {
    it('should be instantiable', () => {
      expect(new Quiz()).toBeInstanceOf(Quiz);
    });

    it('should hold all assigned properties', () => {
      const quiz = makeQuiz();

      expect(quiz.id).toBe(1);
      expect(quiz.jobPostId).toBe(1);
      expect(quiz.title).toBe('Quiz technique Backend NestJS');
      expect(quiz.status).toBe(QuizStatus.PENDING);
      expect(quiz.version).toBe('1.0');
      expect(quiz.index).toBeNull();
      expect(quiz.quizContent).toBeNull();
      expect(quiz.quizAnswerKey).toBeNull();
      expect(quiz.createdAt).toBeInstanceOf(Date);
      expect(quiz.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ── QuizStatus enum ────────────────────────────────────────────────────────

  describe('QuizStatus enum', () => {
    it('should have all expected values', () => {
      expect(QuizStatus.PENDING).toBe('pending');
      expect(QuizStatus.IN_PROGRESS).toBe('in_progress');
      expect(QuizStatus.COMPLETED).toBe('completed');
      expect(QuizStatus.APPROVED).toBe('approved');
      expect(QuizStatus.REJECTED).toBe('rejected');
    });

    it('should contain exactly 5 values', () => {
      const values = Object.values(QuizStatus);
      expect(values).toHaveLength(5);
    });
  });

  // ── status field ───────────────────────────────────────────────────────────

  describe('status', () => {
    it('should default to PENDING', () => {
      const quiz = makeQuiz();
      expect(quiz.status).toBe(QuizStatus.PENDING);
    });

    it('should accept IN_PROGRESS', () => {
      const quiz = makeQuiz({ status: QuizStatus.IN_PROGRESS });
      expect(quiz.status).toBe(QuizStatus.IN_PROGRESS);
    });

    it('should accept COMPLETED', () => {
      const quiz = makeQuiz({ status: QuizStatus.COMPLETED });
      expect(quiz.status).toBe(QuizStatus.COMPLETED);
    });

    it('should accept APPROVED', () => {
      const quiz = makeQuiz({ status: QuizStatus.APPROVED });
      expect(quiz.status).toBe(QuizStatus.APPROVED);
    });

    it('should accept REJECTED', () => {
      const quiz = makeQuiz({ status: QuizStatus.REJECTED });
      expect(quiz.status).toBe(QuizStatus.REJECTED);
    });
  });

  // ── version field ──────────────────────────────────────────────────────────

  describe('version', () => {
    it('should default to "1.0"', () => {
      const quiz = makeQuiz();
      expect(quiz.version).toBe('1.0');
    });

    it('should accept a custom version string', () => {
      const quiz = makeQuiz({ version: '2.3' });
      expect(quiz.version).toBe('2.3');
    });
  });

  // ── index field ────────────────────────────────────────────────────────────

  describe('index', () => {
    it('should be null by default', () => {
      const quiz = makeQuiz();
      expect(quiz.index).toBeNull();
    });

    it('should accept a numeric index', () => {
      const quiz = makeQuiz({ index: 3 });
      expect(quiz.index).toBe(3);
    });
  });

  // ── quizContent field ──────────────────────────────────────────────────────

  describe('quizContent', () => {
    it('should be null by default', () => {
      const quiz = makeQuiz();
      expect(quiz.quizContent).toBeNull();
    });

    it('should accept a JSON string of questions without answers', () => {
      const content = JSON.stringify([
        {
          id: 1,
          question: "Qu'est-ce que NestJS ?",
          type: 'single_choice',
          options: ['A', 'B', 'C', 'D'],
          domain: 'NestJS',
          difficulty: 'easy',
        },
      ]);
      const quiz = makeQuiz({ quizContent: content });
      expect(quiz.quizContent).toBe(content);
    });

    it('should be parseable as valid JSON when set', () => {
      const content = JSON.stringify([{ id: 1, question: 'Q1', options: ['A', 'B'] }]);
      const quiz = makeQuiz({ quizContent: content });
      expect(() => JSON.parse(quiz.quizContent!)).not.toThrow();
    });
  });

  // ── quizAnswerKey field ────────────────────────────────────────────────────

  describe('quizAnswerKey', () => {
    it('should be null by default', () => {
      const quiz = makeQuiz();
      expect(quiz.quizAnswerKey).toBeNull();
    });

    it('should accept a JSON string with correct answers and explanations', () => {
      const answerKey = JSON.stringify([
        {
          id: 1,
          correctAnswer: 'A',
          explanation: 'NestJS est un framework Node.js',
        },
      ]);
      const quiz = makeQuiz({ quizAnswerKey: answerKey });
      expect(quiz.quizAnswerKey).toBe(answerKey);
    });

    it('should be parseable as valid JSON when set', () => {
      const answerKey = JSON.stringify([{ id: 1, correctAnswer: 'B' }]);
      const quiz = makeQuiz({ quizAnswerKey: answerKey });
      expect(() => JSON.parse(quiz.quizAnswerKey!)).not.toThrow();
    });
  });

  // ── dates ──────────────────────────────────────────────────────────────────

  describe('dates', () => {
    it('should store createdAt as a Date', () => {
      const quiz = makeQuiz({ createdAt: new Date('2024-01-15T10:00:00.000Z') });
      expect(quiz.createdAt).toBeInstanceOf(Date);
      expect(quiz.createdAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should store updatedAt as a Date', () => {
      const quiz = makeQuiz({ updatedAt: new Date('2024-01-15T10:30:00.000Z') });
      expect(quiz.updatedAt).toBeInstanceOf(Date);
      expect(quiz.updatedAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  // ── jobPostId ──────────────────────────────────────────────────────────────

  describe('jobPostId', () => {
    it('should store the foreign key correctly', () => {
      const quiz = makeQuiz({ jobPostId: 42 });
      expect(quiz.jobPostId).toBe(42);
    });
  });

  // ── title ──────────────────────────────────────────────────────────────────

  describe('title', () => {
    it('should store the title correctly', () => {
      const quiz = makeQuiz({ title: 'Quiz Frontend React' });
      expect(quiz.title).toBe('Quiz Frontend React');
    });
  });
});