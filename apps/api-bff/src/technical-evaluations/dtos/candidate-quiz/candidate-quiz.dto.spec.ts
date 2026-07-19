import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubmitQuizDto } from './candidate-quiz.dto';

describe('SubmitQuizDto', () => {
  it('should validate correct DTO', async () => {
    const dto = plainToInstance(SubmitQuizDto, {
      answers: [
        { questionId: 1, answer: 'Option A' },
        { questionId: 2, answer: 'Option B' },
      ],
      durationSeconds: 120,
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should validate without durationSeconds (optional)', async () => {
    const dto = plainToInstance(SubmitQuizDto, {
      answers: [{ questionId: 1, answer: 'Option A' }],
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail if answers is missing', async () => {
    const dto = plainToInstance(SubmitQuizDto, {
      durationSeconds: 100,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if answer is empty string', async () => {
    const dto = plainToInstance(SubmitQuizDto, {
      answers: [{ questionId: 1, answer: '' }],
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if durationSeconds is negative', async () => {
    const dto = plainToInstance(SubmitQuizDto, {
      answers: [{ questionId: 1, answer: 'Option A' }],
      durationSeconds: -10,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate QuizAnswerDto structure inside SubmitQuizDto', async () => {
    const dto = plainToInstance(SubmitQuizDto, {
      answers: [
        { questionId: 1, answer: 'Option A' },
        { questionId: 2, answer: 'Option B' },
      ],
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});