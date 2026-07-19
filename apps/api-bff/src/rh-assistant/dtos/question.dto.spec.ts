import { validate } from 'class-validator';
import { QuestionDto } from './question.dto';

describe('QuestionDto Validation', () => {
  it('should pass validation with valid question', async () => {
    const dto = new QuestionDto();
    dto.question = 'Hello AI';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when question is empty', async () => {
    const dto = new QuestionDto();
    dto.question = '';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isNotEmpty');
  });

  it('should fail when question is too short', async () => {
    const dto = new QuestionDto();
    dto.question = 'Hi';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail when question is not a string', async () => {
    const dto = new QuestionDto();
    (dto as unknown as { question: number }).question = 123;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should contain correct custom error messages', async () => {
    const dto = new QuestionDto();
    dto.question = '';

    const errors = await validate(dto);
    const messages = Object.values(errors[0].constraints ?? {});
    expect(messages).toContain('La question ne peut pas être vide.');
  });
});
