import { validate } from 'class-validator';
import { CreateTechnicalEvaluationDto } from './technical-evaluations.dto';
import { EvaluationStatus } from '../../entities/technical-evaluations/technical-evaluations.entity';

describe('CreateTechnicalEvaluationDto', () => {
  it('should validate a correct DTO', async () => {
    const dto = new CreateTechnicalEvaluationDto();

    dto.jobPostId = 1;
    dto.status = EvaluationStatus.PENDING;
    dto.score = 85;
    dto.notes = 'Candidat motivé';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail if jobPostId is missing', async () => {
    const dto = new CreateTechnicalEvaluationDto();

    dto.status = EvaluationStatus.PENDING;
    dto.score = 50;

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('jobPostId');
  });

  it('should respect score range (0-100)', async () => {
    const dto = new CreateTechnicalEvaluationDto();

    dto.jobPostId = 1;
    dto.score = 150; // invalid

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});