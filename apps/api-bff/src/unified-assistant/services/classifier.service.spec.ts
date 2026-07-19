// src/unified-assistant/services/classifier.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosHeaders } from 'axios';
import { ClassifierService } from './classifier.service';

interface GroqChoice {
  message: { content: string };
}

interface GroqChatCompletionResponse {
  choices: GroqChoice[];
}

function makeAxiosResponse(content: string): AxiosResponse<GroqChatCompletionResponse> {
  return {
    data: { choices: [{ message: { content } }] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

type MockedHttpService = jest.Mocked<Pick<HttpService, 'post'>>;

describe('ClassifierService', () => {
  let service: ClassifierService;
  let httpService: MockedHttpService;

  beforeEach(async () => {
    const mockHttpService: MockedHttpService = {
      post: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassifierService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<ClassifierService>(ClassifierService);
    httpService = mockHttpService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns "rh" when Groq responds with rh', async () => {
    httpService.post.mockReturnValue(of(makeAxiosResponse('rh')));

    const result = await service.classify('Combien de jours de congés ?');

    expect(result).toBe('rh');
  });

  it('returns "db" when Groq responds with db', async () => {
    httpService.post.mockReturnValue(of(makeAxiosResponse('db')));

    const result = await service.classify('Combien de candidats ont un score > 80 ?');

    expect(result).toBe('db');
  });

  it('returns "it" when Groq responds with it', async () => {
    httpService.post.mockReturnValue(of(makeAxiosResponse('it')));

    const result = await service.classify('Comment configurer Docker ?');

    expect(result).toBe('it');
  });

  it('defaults to "it" when Groq returns something unexpected', async () => {
    httpService.post.mockReturnValue(of(makeAxiosResponse('blabla')));

    const result = await service.classify('Question ambiguë');

    expect(result).toBe('it');
  });

  it('cleans up punctuation and casing before matching', async () => {
    httpService.post.mockReturnValue(of(makeAxiosResponse(' RH! ')));

    const result = await service.classify('Question RH');

    expect(result).toBe('rh');
  });

  it('sends the question and correct model config to Groq', async () => {
    httpService.post.mockReturnValue(of(makeAxiosResponse('it')));

    await service.classify('Comment configurer Docker ?');

    expect(httpService.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 5,
        temperature: 0,
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Comment configurer Docker ?' }),
        ]),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('returns "it" and does not throw when the Groq call fails', async () => {
    httpService.post.mockReturnValue(throwError(() => new Error('network down')));

    const result = await service.classify('Une question quelconque');

    expect(result).toBe('it');
  });
});