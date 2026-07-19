import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SendInvitationDto } from './evaluation-invitation.dto';

describe('SendInvitationDto', () => {
  it('should validate a correct DTO', async () => {
    const dto = plainToInstance(SendInvitationDto, {
      scoringResumeIds: [1, 2, 3],
      unscoredResumeIds: ['uuid-1', 'uuid-2'],
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '2026-01-01',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should validate when optional arrays are missing', async () => {
    const dto = plainToInstance(SendInvitationDto, {
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '2026-01-01',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail when evaluationId is missing', async () => {
    const dto = plainToInstance(SendInvitationDto, {
      jobPostId: 1,
      dueDate: '2026-01-01',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when jobPostId is missing', async () => {
    const dto = plainToInstance(SendInvitationDto, {
      evaluationId: 1,
      dueDate: '2026-01-01',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when dueDate is empty', async () => {
    const dto = plainToInstance(SendInvitationDto, {
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept empty arrays for resumes', async () => {
    const dto = plainToInstance(SendInvitationDto, {
      scoringResumeIds: [],
      unscoredResumeIds: [],
      evaluationId: 1,
      jobPostId: 1,
      dueDate: '2026-01-01',
    });

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });
});