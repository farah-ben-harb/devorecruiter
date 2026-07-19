import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import * as mammothModule from 'mammoth';
import { JobPostHelpersService } from './job-posts-helpers.service';
import { GoogleDriveService } from '../../common/google-drive/google-drive.service';
import { GroqService } from './groq.service';
import { parsePdf } from '../../common/utils/pdf-parse.util';

jest.mock('axios');
jest.mock('../../common/utils/pdf-parse.util', () => ({
  parsePdf: jest.fn(),
}));

jest.mock('mammoth', () => ({
  __esModule: true,
  extractRawText: jest.fn(),
}));

// ✅ FIX ESLint no-unsafe-assignment
const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

describe('JobPostHelpersService', () => {
  let service: JobPostHelpersService;
  let extractCompanyFromNameBound: (filename: string) => string | null;

  const googleDriveMock: Record<string, jest.Mock> = {
    downloadFile: jest.fn(),
    getValidAccessToken: jest.fn(),
  };

  const groqMock: Record<string, jest.Mock> = {
    extractFromImage: jest.fn(),
    extractFromText: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (mammothModule.extractRawText as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobPostHelpersService,
        { provide: GoogleDriveService, useValue: googleDriveMock },
        { provide: GroqService, useValue: groqMock },
      ],
    }).compile();

    service = module.get<JobPostHelpersService>(JobPostHelpersService);

    extractCompanyFromNameBound = service.extractCompanyFromName.bind(service);
  });

  describe('extractCompanyFromName', () => {
    it('should extract company name', () => {
      expect(
        extractCompanyFromNameBound('fiche_de_poste_Acme_123.pdf'),
      ).toContain('Acme');
    });

    it('should return null when no company', () => {
      expect(extractCompanyFromNameBound('fiche_de_poste.pdf')).toBeNull();
    });

    it('should strip prefix', () => {
      const result = extractCompanyFromNameBound(
        'fiche de poste Société Générale.pdf',
      );
      expect(result?.toLowerCase()).not.toContain('fiche');
    });

    it('should strip suffix', () => {
      const result = extractCompanyFromNameBound('Acme fiche de poste.pdf');
      expect(result?.toLowerCase()).not.toContain('fiche');
    });

    it('should remove standalone digits from the name', () => {
      const result = extractCompanyFromNameBound('fiche_Acme_(42).pdf');
      expect(result).toBe('Acme');
    });

    it('should replace underscores and hyphens', () => {
      const result = extractCompanyFromNameBound('fiche_poste_My-Company.pdf');
      expect(result).toContain('My Company');
    });

    it('should handle unicode', () => {
      const result = extractCompanyFromNameBound('fiche_poste_Société.pdf');
      expect(result).toContain('Société');
    });

    it('should return null for empty string', () => {
      expect(extractCompanyFromNameBound('')).toBeNull();
    });
  });

  describe('extractTitleFromFile — DOCX', () => {
    const DOCX_TYPES = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.google-apps.document',
    ];

    it.each(DOCX_TYPES)(
      'should extract title from DOCX for %s',
      async (mime) => {
        (mammothModule.extractRawText as jest.Mock).mockResolvedValue({
          value:
            'Backend Engineer - Description complète du poste avec toutes les informations nécessaires',
        });

        googleDriveMock.getValidAccessToken.mockResolvedValue('fake-token');

        mockedAxios.get.mockResolvedValue({
          data: Buffer.from('fake docx content'),
        });

        groqMock.extractFromText.mockResolvedValue('Backend Engineer');

        const extractRawText = mammothModule.extractRawText as jest.Mock;

        const result = await service.extractTitleFromFile(1, 'file1', mime);

        expect(googleDriveMock.getValidAccessToken).toHaveBeenCalledWith(1);
        expect(mockedAxios.get).toHaveBeenCalled();
        expect(extractRawText).toHaveBeenCalled();
        expect(groqMock.extractFromText).toHaveBeenCalled();
        expect(result).toBe('Backend Engineer');
      },
    );

    it('should return null if text too short', async () => {
      (mammothModule.extractRawText as jest.Mock).mockResolvedValue({
        value: 'Court',
      });

      googleDriveMock.getValidAccessToken.mockResolvedValue('fake-token');

      mockedAxios.get.mockResolvedValue({
        data: Buffer.from('fake docx content'),
      });

      const result = await service.extractTitleFromFile(
        1,
        'file1',
        DOCX_TYPES[0],
      );

      expect(groqMock.extractFromText).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if mammoth throws', async () => {
      (mammothModule.extractRawText as jest.Mock).mockRejectedValue(
        new Error('Mammoth error'),
      );

      googleDriveMock.getValidAccessToken.mockResolvedValue('fake-token');

      mockedAxios.get.mockResolvedValue({
        data: Buffer.from('fake docx content'),
      });

      const result = await service.extractTitleFromFile(
        1,
        'file1',
        DOCX_TYPES[0],
      );

      expect(result).toBeNull();
    });

    it('should return null if Groq returns null', async () => {
      (mammothModule.extractRawText as jest.Mock).mockResolvedValue({
        value: 'Texte suffisamment long mais sans titre identifiable',
      });

      googleDriveMock.getValidAccessToken.mockResolvedValue('fake-token');

      mockedAxios.get.mockResolvedValue({
        data: Buffer.from('fake docx content'),
      });

      groqMock.extractFromText.mockResolvedValue(null);

      const result = await service.extractTitleFromFile(
        1,
        'file1',
        DOCX_TYPES[0],
      );

      expect(groqMock.extractFromText).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null if axios fails', async () => {
      googleDriveMock.getValidAccessToken.mockResolvedValue('fake-token');
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.extractTitleFromFile(
        1,
        'file1',
        DOCX_TYPES[0],
      );

      expect(result).toBeNull();
    });
  });

  describe('extractTitleFromFile — Images', () => {
    const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    it.each(IMAGE_TYPES)(
      'should extract title from image for %s',
      async (mime) => {
        googleDriveMock.downloadFile.mockResolvedValue('base64imagecontent');

        groqMock.extractFromImage.mockResolvedValue('Frontend Developer');

        const result = await service.extractTitleFromFile(1, 'image1', mime);

        expect(googleDriveMock.downloadFile).toHaveBeenCalledWith(
          1,
          'image1',
          mime,
        );

        expect(groqMock.extractFromImage).toHaveBeenCalledWith(
          'base64imagecontent',
          mime,
        );

        expect(result).toBe('Frontend Developer');
      },
    );

    it('should return null if download fails', async () => {
      googleDriveMock.downloadFile.mockResolvedValue(null);

      const result = await service.extractTitleFromFile(
        1,
        'image1',
        'image/jpeg',
      );

      expect(result).toBeNull();
      expect(groqMock.extractFromImage).not.toHaveBeenCalled();
    });
  });

  describe('extractTitleFromFile — PDF', () => {
    it('should extract title from PDF text', async () => {
      const mockPdfBuffer = Buffer.from('%PDF...');
      const mockBase64 = mockPdfBuffer.toString('base64');

      googleDriveMock.downloadFile.mockResolvedValue(mockBase64);

      (parsePdf as jest.Mock).mockResolvedValue({
        text: 'Poste: Développeur Full Stack avec plusieurs années expérience...',
      });

      groqMock.extractFromText.mockResolvedValue('Développeur Full Stack');

      const parsePdfMock = parsePdf as jest.Mock;

      const result = await service.extractTitleFromFile(
        1,
        'file.pdf',
        'application/pdf',
      );

      expect(parsePdfMock).toHaveBeenCalled();
      expect(groqMock.extractFromText).toHaveBeenCalled();
      expect(result).toBe('Développeur Full Stack');
    });

    it('should use Groq Vision for scanned PDF', async () => {
      const mockPdfBuffer = Buffer.from('%PDF...');
      const mockBase64 = mockPdfBuffer.toString('base64');

      googleDriveMock.downloadFile.mockResolvedValue(mockBase64);

      (parsePdf as jest.Mock).mockResolvedValue({ text: 'court' });

      groqMock.extractFromImage.mockResolvedValue('Scanned Title');

      const result = await service.extractTitleFromFile(
        1,
        'file.pdf',
        'application/pdf',
      );

      expect(groqMock.extractFromImage).toHaveBeenCalledWith(
        mockBase64,
        'image/jpeg',
      );

      expect(result).toBe('Scanned Title');
    });

    it('should return null if download fails', async () => {
      googleDriveMock.downloadFile.mockResolvedValue(null);

      const result = await service.extractTitleFromFile(
        1,
        'file.pdf',
        'application/pdf',
      );

      expect(result).toBeNull();
    });
  });

  describe('extractStartDateFromPdf', () => {
    it('should extract date from PDF', async () => {
      const mockPdfBuffer = Buffer.from('%PDF...');
      const mockBase64 = mockPdfBuffer.toString('base64');

      googleDriveMock.downloadFile.mockResolvedValue(mockBase64);

      (parsePdf as jest.Mock).mockResolvedValue({
        text: 'Date de démarrage souhaitée: 15/06/2024',
      });

      const result = await service.extractStartDateFromPdf(1, 'file.pdf');

      expect(result).toBe('15/06/2024');
    });

    it('should return null if no date found', async () => {
      googleDriveMock.downloadFile.mockResolvedValue('base64content');

      (parsePdf as jest.Mock).mockResolvedValue({
        text: 'Description without any date information',
      });

      const result = await service.extractStartDateFromPdf(1, 'file.pdf');

      expect(result).toBeNull();
    });

    it('should return null if download fails', async () => {
      googleDriveMock.downloadFile.mockResolvedValue(null);

      const result = await service.extractStartDateFromPdf(1, 'file.pdf');

      expect(result).toBeNull();
    });
  });
});
