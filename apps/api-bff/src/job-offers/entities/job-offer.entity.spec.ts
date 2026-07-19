import { JobOffer } from './job-offer.entity';

describe('JobOffer Entity', () => {
  let jobOffer: JobOffer;

  beforeEach(() => {
    jobOffer = new JobOffer();

    jobOffer.id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    jobOffer.promptLibre =
      'Développeur Full Stack React/Node.js avec expérience en startup';

    jobOffer.titre = 'Développeur Full Stack React/Node.js H/F';
    jobOffer.accroche =
      'Rejoignez une startup innovante et participez à des projets à fort impact !';

    jobOffer.formatLinkedin =
      'Nous recherchons un Développeur Full Stack passionné...';

    jobOffer.missions = [
      'Développer de nouvelles fonctionnalités',
      'Maintenance des applications existantes',
    ];

    jobOffer.profil = [
      'Minimum 3 ans d’expérience en React',
      'Maîtrise de Node.js',
    ];

    jobOffer.avantages = [
      'Télétravail hybride',
      'Formation continue',
    ];

    jobOffer.hashtags = [
      '#ReactJS',
      '#NodeJS',
    ];

    jobOffer.motsCles = [
      'react',
      'nodejs',
      'typescript',
    ];

    jobOffer.isPublished = false;

    jobOffer.userId = 42;

    jobOffer.createdAt = new Date();
    jobOffer.updatedAt = new Date();
  });

  it('should be defined', () => {
    expect(jobOffer).toBeDefined();
  });

  it('should assign all properties correctly', () => {
    expect(jobOffer.id).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );

    expect(jobOffer.promptLibre).toContain('React/Node.js');

    expect(jobOffer.titre).toBe(
      'Développeur Full Stack React/Node.js H/F',
    );

    expect(jobOffer.accroche).toContain('startup innovante');

    expect(jobOffer.formatLinkedin).toContain(
      'Développeur Full Stack',
    );

    expect(jobOffer.missions).toHaveLength(2);

    expect(jobOffer.profil).toContain(
      'Maîtrise de Node.js',
    );

    expect(jobOffer.avantages).toContain(
      'Télétravail hybride',
    );

    expect(jobOffer.hashtags).toContain('#ReactJS');

    expect(jobOffer.motsCles).toContain('typescript');

    expect(jobOffer.isPublished).toBe(false);

    expect(jobOffer.userId).toBe(42);
  });

  it('should allow updating publication status', () => {
    jobOffer.isPublished = true;

    expect(jobOffer.isPublished).toBe(true);
  });

  it('should handle missions as array', () => {
    expect(Array.isArray(jobOffer.missions)).toBe(true);

    expect(jobOffer.missions[0]).toBe(
      'Développer de nouvelles fonctionnalités',
    );
  });

  it('should handle profil as array', () => {
    expect(Array.isArray(jobOffer.profil)).toBe(true);
  });

  it('should handle avantages as array', () => {
    expect(Array.isArray(jobOffer.avantages)).toBe(true);
  });

  it('should handle hashtags as array', () => {
    expect(Array.isArray(jobOffer.hashtags)).toBe(true);
  });

  it('should handle motsCles as array', () => {
    expect(Array.isArray(jobOffer.motsCles)).toBe(true);
  });

  it('should have valid createdAt and updatedAt dates', () => {
    expect(jobOffer.createdAt).toBeInstanceOf(Date);

    expect(jobOffer.updatedAt).toBeInstanceOf(Date);
  });
});