import {
  IAiJobOfferResponse,
  ICreateJobOfferData,
  IUpdateJobOfferData,
} from './job-offer.interface';

describe('Job Offer Interfaces', () => {
  it('should create a valid IAiJobOfferResponse object', () => {
    const response: IAiJobOfferResponse = {
      titre: 'Développeur Backend NestJS',
      accroche: 'Rejoignez notre équipe tech',
      format_linkedin: 'Description complète LinkedIn',
      missions: ['Créer des APIs REST'],
      profil: ['Expérience NestJS'],
      avantages: ['Télétravail'],
      hashtags: ['#NestJS'],
      mots_cles: ['nestjs', 'backend'],
    };

    expect(response.titre).toBe(
      'Développeur Backend NestJS',
    );

    expect(response.missions).toContain(
      'Créer des APIs REST',
    );
  });

  it('should create a valid ICreateJobOfferData object', () => {
    const createData: ICreateJobOfferData = {
      promptLibre: 'Prompt test',
      titre: 'Titre test',
      accroche: 'Accroche test',
      formatLinkedin: 'Format LinkedIn',
      missions: ['Mission 1'],
      profil: ['Profil 1'],
      avantages: ['Avantage 1'],
      hashtags: ['#Test'],
      motsCles: ['test'],
      userId: 1,
    };

    expect(createData.userId).toBe(1);

    expect(createData.titre).toBe('Titre test');
  });

  it('should create a valid partial IUpdateJobOfferData object', () => {
    const updateData: IUpdateJobOfferData = {
      titre: 'Nouveau titre',
      isPublished: true,
    };

    expect(updateData.titre).toBe('Nouveau titre');

    expect(updateData.isPublished).toBe(true);
  });

  it('should allow empty optional fields in IUpdateJobOfferData', () => {
    const updateData: IUpdateJobOfferData = {};

    expect(updateData).toEqual({});
  });
});