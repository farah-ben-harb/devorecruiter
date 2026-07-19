import { JobOffer, JobOfferApiResponse } from '../models/job-offer.model';

export class JobOfferMapper {
  static fromApi(raw: JobOfferApiResponse): JobOffer {
    return {
      id: raw.id,
      promptLibre: raw.promptLibre,
      titre: raw.titre,
      accroche: raw.accroche,
      formatLinkedin: raw.formatLinkedin,
      missions: raw.missions ?? [],
      profil: raw.profil ?? [],
      avantages: raw.avantages ?? [],
      hashtags: raw.hashtags ?? [],
      motsCles: raw.motsCles ?? [],
      isPublished: raw.isPublished,
      userId: raw.userId,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
      jobPostId: raw.jobPostId ?? null,
    };
  }

  static fromApiList(raws: JobOfferApiResponse[]): JobOffer[] {
    return raws.map((r) => JobOfferMapper.fromApi(r));
  }
}
