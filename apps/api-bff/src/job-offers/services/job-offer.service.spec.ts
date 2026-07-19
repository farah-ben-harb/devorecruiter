// src/job-offers/services/job-offer.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import axios, { AxiosInstance, AxiosError, AxiosHeaders } from 'axios';
import { JobOfferService } from './job-offer.service';
import { JobOfferRepository } from '../repositories/job-offer.repository';
import { JobOffer } from '../entities/job-offer.entity';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { JobPost, JobPostStatus } from '../../job-posts/entities/job-post.entity';
import { parsePdf } from '../../common/utils/pdf-parse.util';
import { GenerateJobOfferDto, UpdateJobOfferDto } from '../dtos/job-offer.dto';
import { IAiJobOfferResponse, ICreateJobOfferData } from '../interfaces/job-offer.interface';
import { Repository, FindOneOptions, FindOptionsWhere } from 'typeorm';
jest.mock('axios');
jest.mock('../../common/utils/pdf-parse.util');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedParsePdf = parsePdf as jest.MockedFunction<typeof parsePdf>;

// ── Helpers de fabrication ──────────────────────────────────

function makeJobOffer(overrides: Partial<JobOffer> = {}): JobOffer {
  return {
    id: 'offer-uuid-1',
    promptLibre: 'Dev Backend NestJS',
    titre: 'Développeur Backend',
    accroche: 'Rejoignez une équipe innovante',
    formatLinkedin: 'Nous recherchons...',
    missions: ['Développer des APIs'],
    profil: ['3 ans experience'],
    avantages: ['Remote'],
    hashtags: ['#Tech'],
    motsCles: ['nestjs'],
    isPublished: false,
    userId: 1,
    user: {} as JobOffer['user'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    jobPostId: null,
    ...overrides,
  };
}

function makeJobPost(overrides: Partial<JobPost> = {}): JobPost {
  return {
    id: 1,
    googleDriveFileId: 'drive-1',
    name: 'fiche.pdf',
    type: 'application/pdf',
    url: 'https://drive.google.com/file/d/drive-1/view',
    googleDocId: null,
    unifiedUrl: null,
    company: 'ACME',
    startDate: null,
    evaluationsFolderId: null,
    status: JobPostStatus.UNIFIED,
    title: 'Développeur Backend',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    requiresCoding: null,
    hasQcm: null,
    unifiedDocxId: null,
    jobStatus: null,
    linkedCandidateIds: [],
    ...overrides,
  };
}

function makeAiResponse(overrides: Partial<IAiJobOfferResponse> = {}): IAiJobOfferResponse {
  return {
    titre: 'Développeur Backend',
    accroche: 'Rejoignez une équipe innovante',
    format_linkedin: 'Nous recherchons...',
    missions: ['Développer des APIs'],
    profil: ['3 ans experience'],
    avantages: ['Remote'],
    hashtags: ['#Tech'],
    mots_cles: ['nestjs'],
    ...overrides,
  };
}

interface GroqChoice {
  message: { content: string };
}

interface GroqChatCompletionResponse {
  choices: GroqChoice[];
}

function makeGroqAxiosData(content: string): { data: GroqChatCompletionResponse } {
  return { data: { choices: [{ message: { content } }] } };
}

// Construit une AxiosError utilisable par le catch du service (axios.isAxiosError
// doit être mocké en parallèle pour que le type guard renvoie true dans le test).
function makeAxiosError(status: number, groqMessage: string): AxiosError {
  const error = new Error(groqMessage) as AxiosError;
  error.isAxiosError = true;
  error.response = {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: { error: { message: groqMessage } },
  };
  return error;
}

// ── Mock de l'instance axios interne (groqHttp) ─────────────
// AxiosInstance a trop de propriétés pour être reconstruit entièrement à la
// main ; on ne fournit que "post" (seule méthode utilisée par le service) et
// on caste vers AxiosInstance via unknown, seul point du fichier concerné.
type MockGroqPost = jest.MockedFunction<
  (url: string, data?: object) => Promise<{ data: GroqChatCompletionResponse }>
>;

// ── Types des mocks des dépendances ──────────────────────────

type MockedJobOfferRepository = jest.Mocked<
  Pick<JobOfferRepository, 'create' | 'findAll' | 'findOne' | 'update' | 'delete'>
>;

type MockedConfigService = jest.Mocked<Pick<ConfigService, 'get'>>;

type MockedJobPostRepository = jest.Mocked<Pick<Repository<JobPost>, 'findOne'>>;

type MockedGoogleDriveService = jest.Mocked<Pick<GoogleDriveService, 'downloadFile'>>;

describe('JobOfferService', () => {
  let service: JobOfferService;
  let jobOfferRepo: MockedJobOfferRepository;
  let configService: MockedConfigService;
  let jobPostRepo: MockedJobPostRepository;
  let googleDriveService: MockedGoogleDriveService;
  let mockGroqPost: MockGroqPost;

  beforeEach(async () => {
    mockGroqPost = jest.fn();
    const mockAxiosInstance = { post: mockGroqPost } as unknown as AxiosInstance;
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    mockedAxios.isAxiosError.mockReturnValue(false);

    const mockJobOfferRepo: MockedJobOfferRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService: MockedConfigService = {
      get: jest.fn(),
    };

    const mockJobPostRepo: MockedJobPostRepository = {
      findOne: jest.fn(),
    };

    const mockGoogleDriveService: MockedGoogleDriveService = {
      downloadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobOfferService,
        { provide: JobOfferRepository, useValue: mockJobOfferRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(JobPost), useValue: mockJobPostRepo },
        { provide: GoogleDriveService, useValue: mockGoogleDriveService },
      ],
    }).compile();

    service = module.get<JobOfferService>(JobOfferService);
    jobOfferRepo = mockJobOfferRepo;
    configService = mockConfigService;
    jobPostRepo = mockJobPostRepo;
    googleDriveService = mockGoogleDriveService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── generate ────────────────────────────────────────────

  describe('generate', () => {
    it('génère et sauvegarde une offre à partir du prompt libre', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend NestJS senior' };
      const aiResponse = makeAiResponse();
      mockGroqPost.mockResolvedValue(makeGroqAxiosData(JSON.stringify(aiResponse)));

      const created = makeJobOffer();
      jobOfferRepo.create.mockResolvedValue(created);

      const result = await service.generate(dto, 1);

      expect(jobOfferRepo.create).toHaveBeenCalledWith({
        promptLibre: dto.promptLibre,
        titre: aiResponse.titre,
        accroche: aiResponse.accroche,
        formatLinkedin: aiResponse.format_linkedin,
        missions: aiResponse.missions,
        profil: aiResponse.profil,
        avantages: aiResponse.avantages,
        hashtags: aiResponse.hashtags,
        motsCles: aiResponse.mots_cles,
        userId: 1,
      });
      expect(result).toBe(created);
    });

    it('nettoie les vrais sauts de ligne à l\'intérieur des strings JSON avant parsing', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend' };
      const rawContentWithRealNewlines =
        '{"titre":"Dev","accroche":"Ligne1\nLigne2","format_linkedin":"text","missions":["a"],"profil":["b"],"avantages":["c"],"hashtags":["d"],"mots_cles":["e"]}';
      mockGroqPost.mockResolvedValue(makeGroqAxiosData(rawContentWithRealNewlines));

      jobOfferRepo.create.mockResolvedValue(makeJobOffer());

      await service.generate(dto, 1);

      expect(jobOfferRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ accroche: 'Ligne1\nLigne2' }),
      );
    });

    it('lève une BadGatewayException si aucun JSON n\'est trouvé dans la réponse', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend' };
      mockGroqPost.mockResolvedValue(makeGroqAxiosData('Pas de JSON ici'));

      await expect(service.generate(dto, 1)).rejects.toThrow(BadGatewayException);
    });

    it('lève une BadGatewayException si le JSON extrait est invalide', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend' };
      mockGroqPost.mockResolvedValue(makeGroqAxiosData('{invalid json}'));

      await expect(service.generate(dto, 1)).rejects.toThrow(BadGatewayException);
    });

    it('lève une BadGatewayException si un champ requis est manquant', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend' };
      const incomplete = { ...makeAiResponse(), titre: '' };
      mockGroqPost.mockResolvedValue(makeGroqAxiosData(JSON.stringify(incomplete)));

      await expect(service.generate(dto, 1)).rejects.toThrow(BadGatewayException);
    });

    it('transforme une erreur Groq 401 en message explicite', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend' };
      mockGroqPost.mockRejectedValue(makeAxiosError(401, 'Invalid API key'));
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(service.generate(dto, 1)).rejects.toThrow(
        'Clé GROQ_API_KEY invalide ou manquante.',
      );
    });

    it('transforme une erreur Groq 429 en message de limite de taux', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend' };
      mockGroqPost.mockRejectedValue(makeAxiosError(429, 'Rate limited'));
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(service.generate(dto, 1)).rejects.toThrow(
        'Limite de taux Groq atteinte. Réessayez dans quelques secondes.',
      );
    });

    it('transforme une erreur réseau générique en BadGatewayException', async () => {
      const dto: GenerateJobOfferDto = { promptLibre: 'Dev Backend' };
      mockGroqPost.mockRejectedValue(new Error('network down'));

      await expect(service.generate(dto, 1)).rejects.toThrow(BadGatewayException);
    });
  });

  // ── findAll / findOne / update / remove ──────────────────

  describe('findAll', () => {
    it('délègue au repository', async () => {
      const offers = [makeJobOffer()];
      jobOfferRepo.findAll.mockResolvedValue(offers);

      const result = await service.findAll(1);

      expect(jobOfferRepo.findAll).toHaveBeenCalledWith(1);
      expect(result).toBe(offers);
    });
  });

  describe('findOne', () => {
    it('retourne l\'offre trouvée', async () => {
      const offer = makeJobOffer({ id: 'offer-1' });
      jobOfferRepo.findOne.mockResolvedValue(offer);

      const result = await service.findOne('offer-1', 1);

      expect(jobOfferRepo.findOne).toHaveBeenCalledWith('offer-1', 1);
      expect(result).toBe(offer);
    });

    it('lève une NotFoundException si non trouvée', async () => {
      jobOfferRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('délègue au repository', async () => {
      const dto: UpdateJobOfferDto = { titre: 'Nouveau titre' };
      const updated = makeJobOffer({ titre: 'Nouveau titre' });
      jobOfferRepo.update.mockResolvedValue(updated);

      const result = await service.update('offer-1', 1, dto);

      expect(jobOfferRepo.update).toHaveBeenCalledWith('offer-1', 1, dto);
      expect(result).toBe(updated);
    });
  });

  describe('remove', () => {
    it('supprime et retourne un message de succès', async () => {
      jobOfferRepo.delete.mockResolvedValue(undefined);

      const result = await service.remove('offer-1', 1);

      expect(jobOfferRepo.delete).toHaveBeenCalledWith('offer-1', 1);
      expect(result).toEqual({ message: 'Job offer #offer-1 deleted successfully' });
    });
  });

  // ── generateFromJobPost ───────────────────────────────────

  describe('generateFromJobPost', () => {
    it('lève une NotFoundException si la fiche de poste n\'existe pas', async () => {
      jobPostRepo.findOne.mockResolvedValue(null);

      await expect(service.generateFromJobPost([1], 1)).rejects.toThrow(NotFoundException);
    });

    it('lève une NotFoundException si la fiche n\'est pas unifiée', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ status: JobPostStatus.RAW }));

      await expect(service.generateFromJobPost([1], 1)).rejects.toThrow(NotFoundException);
    });

    it('génère une offre sans contenu PDF si googleDocId est absent', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ googleDocId: null }));
      mockGroqPost.mockResolvedValue(makeGroqAxiosData(JSON.stringify(makeAiResponse())));
      jobOfferRepo.create.mockResolvedValue(makeJobOffer({ jobPostId: 1 }));

      await service.generateFromJobPost([1], 1);

      expect(googleDriveService.downloadFile).not.toHaveBeenCalled();
      const [, payload] = mockGroqPost.mock.calls[0];
      const messages = (payload as { messages: { content: string }[] }).messages;
      expect(messages[1].content).toContain('Titre du poste : Développeur Backend');
      expect(messages[1].content).not.toContain('Contenu complet de la fiche');
    });

    it('inclut le contenu du PDF quand googleDocId est présent', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ googleDocId: 'doc-123' }));
      googleDriveService.downloadFile.mockResolvedValue('base64content');
      mockedParsePdf.mockResolvedValue({ text: 'Contenu extrait du PDF' });
      mockGroqPost.mockResolvedValue(makeGroqAxiosData(JSON.stringify(makeAiResponse())));
      jobOfferRepo.create.mockResolvedValue(makeJobOffer({ jobPostId: 1 }));

      await service.generateFromJobPost([1], 1);

      expect(googleDriveService.downloadFile).toHaveBeenCalledWith(1, 'doc-123', 'application/pdf');
      expect(mockedParsePdf).toHaveBeenCalledWith(Buffer.from('base64content', 'base64'));

      const [, payload] = mockGroqPost.mock.calls[0];
      const messages = (payload as { messages: { content: string }[] }).messages;
      expect(messages[1].content).toContain('Contenu extrait du PDF');
    });

    it('continue sans le contenu PDF si le téléchargement échoue', async () => {
      jobPostRepo.findOne.mockResolvedValue(makeJobPost({ googleDocId: 'doc-123' }));
      googleDriveService.downloadFile.mockRejectedValue(new Error('Drive error'));
      mockGroqPost.mockResolvedValue(makeGroqAxiosData(JSON.stringify(makeAiResponse())));
      jobOfferRepo.create.mockResolvedValue(makeJobOffer({ jobPostId: 1 }));

      const result = await service.generateFromJobPost([1], 1);

      expect(mockedParsePdf).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('génère une offre par fiche de poste et associe jobPostId', async () => {
  jobPostRepo.findOne.mockImplementation((options: FindOneOptions<JobPost>) => {
    const where = options.where as FindOptionsWhere<JobPost>;
    const id = where.id as number;
    return Promise.resolve(makeJobPost({ id, googleDocId: null }));
  });
      mockGroqPost.mockResolvedValue(makeGroqAxiosData(JSON.stringify(makeAiResponse())));
      jobOfferRepo.create
        .mockResolvedValueOnce(makeJobOffer({ id: 'offer-1', jobPostId: 1 }))
        .mockResolvedValueOnce(makeJobOffer({ id: 'offer-2', jobPostId: 2 }));

      const result = await service.generateFromJobPost([1, 2], 7);

      expect(jobOfferRepo.create).toHaveBeenCalledTimes(2);
      expect(jobOfferRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining<Partial<ICreateJobOfferData>>({ jobPostId: 1, userId: 7 }),
      );
      expect(jobOfferRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining<Partial<ICreateJobOfferData>>({ jobPostId: 2, userId: 7 }),
      );
      expect(result).toHaveLength(2);
    });
  });
});