import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { GroqService } from './groq.service';

const makeGroqResponse = (content: string) => ({
  data: { choices: [{ message: { content } }] },
});

const makeEmptyResponse = () => ({
  data: { choices: [] },
});

describe('GroqService', () => {
  let service: GroqService;

  const httpMock = { post: jest.fn() };

  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'GROQ_API_KEY') return 'test-key';
      if (key === 'GROQ_MODEL') return 'llama3-8b-8192';
      if (key === 'GROQ_VISION_MODEL')
        return 'meta-llama/llama-4-scout-17b-16e-instruct';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroqService,
        { provide: HttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = module.get<GroqService>(GroqService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Initialisation
  // ─────────────────────────────────────────────

  describe('initialisation', () => {
    it('should use default model when GROQ_MODEL is not set', async () => {
      const partialConfigMock = {
        get: jest.fn((key: string) => {
          if (key === 'GROQ_API_KEY') return 'test-key';
          return null;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          GroqService,
          { provide: HttpService, useValue: httpMock },
          { provide: ConfigService, useValue: partialConfigMock },
        ],
      }).compile();

      const svc = module.get<GroqService>(GroqService);
      expect(svc).toBeDefined();

      httpMock.post.mockReturnValue(of(makeGroqResponse('Backend Engineer')));
      const result = await svc.extractFromText('some job description');
      expect(result).toBe('Backend Engineer');

      const callBody = httpMock.post.mock.calls[0][1];
      expect(callBody.model).toBe('llama-3.3-70b-versatile');
    });

    it('should use default vision model when GROQ_VISION_MODEL is not set', async () => {
      const partialConfigMock = {
        get: jest.fn((key: string) => {
          if (key === 'GROQ_API_KEY') return 'test-key';
          if (key === 'GROQ_MODEL') return 'llama3-8b-8192';
          return null;
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          GroqService,
          { provide: HttpService, useValue: httpMock },
          { provide: ConfigService, useValue: partialConfigMock },
        ],
      }).compile();

      const svc = module.get<GroqService>(GroqService);
      httpMock.post.mockReturnValue(of(makeGroqResponse('Dev Frontend')));
      await svc.extractFromImage('base64', 'image/png');

      const callBody = httpMock.post.mock.calls[0][1];
      expect(callBody.model).toBe('meta-llama/llama-4-scout-17b-16e-instruct');
    });
  });

  // ─────────────────────────────────────────────
  // extractFromText
  // ─────────────────────────────────────────────

  describe('extractFromText', () => {
    it('should return null for empty string', async () => {
      expect(await service.extractFromText('')).toBeNull();
      expect(httpMock.post).not.toHaveBeenCalled();
    });

    it('should return null for whitespace-only string', async () => {
      expect(await service.extractFromText('   ')).toBeNull();
      expect(httpMock.post).not.toHaveBeenCalled();
    });

    it('should return extracted content from API', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Backend Engineer')));

      expect(await service.extractFromText('some job description')).toBe(
        'Backend Engineer',
      );
    });

    it('should trim whitespace from API response', async () => {
      httpMock.post.mockReturnValue(
        of(makeGroqResponse('  Backend Engineer  ')),
      );

      expect(await service.extractFromText('some job description')).toBe(
        'Backend Engineer',
      );
    });

    it('should use a default prompt when none is provided', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Backend Engineer')));

      await service.extractFromText('job description text');

      const callBody = httpMock.post.mock.calls[0][1];
      expect(callBody.messages[0].content).toContain('job description text');
    });

    it('should prepend custom prompt when provided', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Lead Developer')));

      const customPrompt = 'Extract only the job title';
      await service.extractFromText('job description text', customPrompt);

      const callBody = httpMock.post.mock.calls[0][1];
      expect(callBody.messages[0].content).toContain(customPrompt);
      expect(callBody.messages[0].content).toContain('job description text');
    });

    it('should send request with temperature 0.2', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Backend Engineer')));

      await service.extractFromText('some text');

      const callBody = httpMock.post.mock.calls[0][1];
      expect(callBody.temperature).toBe(0.2);
    });

    it('should send Authorization header with API key', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Backend Engineer')));

      await service.extractFromText('some text');

      const callConfig = httpMock.post.mock.calls[0][2];
      expect(callConfig.headers.Authorization).toBe('Bearer test-key');
    });

    it('should return null when API returns empty choices array', async () => {
      httpMock.post.mockReturnValue(of(makeEmptyResponse()));

      expect(await service.extractFromText('some text')).toBeNull();
    });

    it('should return null when API returns null data', async () => {
      httpMock.post.mockReturnValue(of({ data: null }));

      expect(await service.extractFromText('some text')).toBeNull();
    });

    it('should return null when HTTP call throws', async () => {
      httpMock.post.mockReturnValue(
        throwError(() => new Error('network error')),
      );

      expect(await service.extractFromText('some text')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // extractFromImage
  // ─────────────────────────────────────────────

  describe('extractFromImage', () => {
    it('should return null for empty base64 string', async () => {
      expect(await service.extractFromImage('')).toBeNull();
      expect(httpMock.post).not.toHaveBeenCalled();
    });

    it('should return extracted content with explicit mimeType', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Dev Frontend')));

      expect(
        await service.extractFromImage('base64imagedata', 'image/png'),
      ).toBe('Dev Frontend');
    });

    it('should default to image/jpeg when mimeType is not provided', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Dev Frontend')));

      await service.extractFromImage('base64imagedata');

      const callBody = httpMock.post.mock.calls[0][1];
      const imageContent = (
        callBody.messages[0].content as Array<{
          type: string;
          image_url?: { url: string };
        }>
      ).find((c) => c.type === 'image_url');
      expect(imageContent?.image_url?.url).toContain('data:image/jpeg;base64,');
    });

    it('should embed base64 data correctly in the image_url', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Chef de Projet')));

      await service.extractFromImage('mybase64data', 'image/webp');

      const callBody = httpMock.post.mock.calls[0][1];
      const imageContent = (
        callBody.messages[0].content as Array<{
          type: string;
          image_url?: { url: string };
        }>
      ).find((c) => c.type === 'image_url');
      expect(imageContent?.image_url?.url).toBe(
        'data:image/webp;base64,mybase64data',
      );
    });

    it('should use the vision model', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Dev Frontend')));

      await service.extractFromImage('base64imagedata', 'image/png');

      const callBody = httpMock.post.mock.calls[0][1];
      expect(callBody.model).toBe('meta-llama/llama-4-scout-17b-16e-instruct');
    });

    it('should include a text prompt alongside the image', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('Dev Frontend')));

      await service.extractFromImage('base64imagedata', 'image/png');

      const callBody = httpMock.post.mock.calls[0][1];
      const textContent = (
        callBody.messages[0].content as Array<{ type: string; text?: string }>
      ).find((c) => c.type === 'text');
      expect(textContent?.text).toBeTruthy();
    });

    it('should return null when API returns empty choices', async () => {
      httpMock.post.mockReturnValue(of(makeEmptyResponse()));

      expect(
        await service.extractFromImage('base64imagedata', 'image/jpeg'),
      ).toBeNull();
    });

    it('should return null when HTTP call throws', async () => {
      httpMock.post.mockReturnValue(
        throwError(() => new Error('vision error')),
      );

      expect(
        await service.extractFromImage('base64imagedata', 'image/jpeg'),
      ).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // extractStructured
  // ─────────────────────────────────────────────

  describe('extractStructured', () => {
    it('should parse and return a valid JSON object', async () => {
      httpMock.post.mockReturnValue(
        of(makeGroqResponse('{"title":"Backend Engineer"}')),
      );

      const result = await service.extractStructured<{ title: string }>(
        'extract structured data',
      );
      expect(result).toEqual({ title: 'Backend Engineer' });
    });

    it('should parse and return a valid JSON array', async () => {
      httpMock.post.mockReturnValue(
        of(makeGroqResponse('[{"title":"Backend"},{"title":"Frontend"}]')),
      );

      const result =
        await service.extractStructured<{ title: string }[]>('extract list');
      expect(result).toEqual([{ title: 'Backend' }, { title: 'Frontend' }]);
    });

    it('should return null for invalid JSON response', async () => {
      httpMock.post.mockReturnValue(of(makeGroqResponse('not valid json {{')));

      expect(
        await service.extractStructured('extract structured data'),
      ).toBeNull();
    });

    it('should return null when API returns empty content', async () => {
      httpMock.post.mockReturnValue(of(makeEmptyResponse()));

      expect(
        await service.extractStructured('extract structured data'),
      ).toBeNull();
    });

    it('should return null when HTTP call throws', async () => {
      httpMock.post.mockReturnValue(throwError(() => new Error('error')));

      expect(
        await service.extractStructured('extract structured data'),
      ).toBeNull();
    });

    it('should return null for null API response data', async () => {
      httpMock.post.mockReturnValue(of({ data: null }));

      expect(
        await service.extractStructured('extract structured data'),
      ).toBeNull();
    });
  });
});
