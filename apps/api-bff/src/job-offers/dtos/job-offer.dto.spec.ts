import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  GenerateJobOfferDto,
  UpdateJobOfferDto,
  JobOfferResponseDto,
} from './job-offer.dto';

// ── GenerateJobOfferDto ───────────────────────────────────────────────────────

describe('GenerateJobOfferDto', () => {
  const valid = (): GenerateJobOfferDto =>
    plainToInstance(GenerateJobOfferDto, { promptLibre: 'Développeur JS en startup fintech' });

  it('should pass with a valid promptLibre', async () => {
    const errors = await validate(valid());
    expect(errors).toHaveLength(0);
  });

  it('should fail when promptLibre is missing', async () => {
    const dto = plainToInstance(GenerateJobOfferDto, {});
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'promptLibre')).toBe(true);
  });

  it('should fail when promptLibre is an empty string', async () => {
    const dto = plainToInstance(GenerateJobOfferDto, { promptLibre: '' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'promptLibre')).toBe(true);
  });

  it('should fail when promptLibre is shorter than 10 characters', async () => {
    const dto = plainToInstance(GenerateJobOfferDto, { promptLibre: 'Dev JS' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'promptLibre')).toBe(true);
  });

  it('should fail when promptLibre is not a string', async () => {
    const dto = plainToInstance(GenerateJobOfferDto, { promptLibre: 12345 });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'promptLibre')).toBe(true);
  });
});

// ── UpdateJobOfferDto ─────────────────────────────────────────────────────────

describe('UpdateJobOfferDto', () => {
  it('should pass with an empty object (all fields optional)', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with all fields provided', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, {
      titre: 'Nouveau titre',
      accroche: 'Nouvelle accroche',
      formatLinkedin: 'Format complet',
      missions: ['Mission A', 'Mission B'],
      profil: ['Profil A'],
      avantages: ['Avantage A'],
      hashtags: ['#JS'],
      motsCles: ['javascript'],
      isPublished: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when titre is not a string', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { titre: 123 });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'titre')).toBe(true);
  });

  it('should fail when accroche is not a string', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { accroche: 123 });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'accroche')).toBe(true);
  });

  it('should fail when formatLinkedin is not a string', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { formatLinkedin: 123 });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'formatLinkedin')).toBe(true);
  });

  it('should fail when missions is not an array', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { missions: 'not-an-array' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'missions')).toBe(true);
  });

  it('should fail when missions contains a non-string element', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { missions: [1, 2, 3] });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'missions')).toBe(true);
  });

  it('should fail when profil is not an array', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { profil: 'not-an-array' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'profil')).toBe(true);
  });

  it('should fail when avantages contains a non-string element', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { avantages: [true, false] });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'avantages')).toBe(true);
  });

  it('should fail when hashtags is not an array', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { hashtags: '#JS' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'hashtags')).toBe(true);
  });

  it('should fail when motsCles contains a non-string element', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { motsCles: [42] });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'motsCles')).toBe(true);
  });

  it('should fail when isPublished is not a boolean', async () => {
    const dto = plainToInstance(UpdateJobOfferDto, { isPublished: 'yes' });
    const errors = await validate(dto);
    expect(errors.some(e => e.property === 'isPublished')).toBe(true);
  });
});

// ── JobOfferResponseDto ───────────────────────────────────────────────────────
// JobOfferResponseDto has no validators — it is a Swagger response shape only.
// Its correctness is guaranteed by TypeScript's type checker at compile time.
describe('JobOfferResponseDto', () => {
  it('should instantiate with the expected shape', () => {
    const dto = plainToInstance(JobOfferResponseDto, {
      id: 'uuid-1',
      promptLibre: 'Prompt test',
      titre: 'Titre test',
      accroche: 'Accroche test',
      formatLinkedin: 'Format test',
      missions: ['Mission 1'],
      profil: ['Profil 1'],
      avantages: ['Avantage 1'],
      hashtags: ['#JS'],
      motsCles: ['javascript'],
      isPublished: false,
      userId: '42',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(dto).toBeInstanceOf(JobOfferResponseDto);
    expect(dto.id).toBe('uuid-1');
    expect(dto.missions).toEqual(['Mission 1']);
  });
});