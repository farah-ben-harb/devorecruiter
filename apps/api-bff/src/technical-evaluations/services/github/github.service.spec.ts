import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { GithubService } from './github.service';
import {
  GithubRepoResponse,
  GithubUserSearchResponse,
  GithubBranch,
  GithubTreeResponse,
  GithubFileContentResponse,
} from '../../interfaces/github/github.interface';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Types pour les réponses GitHub avec Axios
type AxiosGithubUserResponse = AxiosResponse<{ login: string }>;
type AxiosGithubRepoResponse = AxiosResponse<GithubRepoResponse>;
type AxiosGithubSearchResponse = AxiosResponse<GithubUserSearchResponse>;
type AxiosGithubBranchesResponse = AxiosResponse<GithubBranch[]>;
type AxiosGithubTreeResponse = AxiosResponse<GithubTreeResponse>;
type AxiosGithubContentResponse = AxiosResponse<GithubFileContentResponse>;
type AxiosGithubCollaboratorResponse = AxiosResponse<Record<string, unknown>>;

interface GithubError {
  response?: {
    status: number;
    data: {
      message: string;
    };
  };
  message?: string;
}

const MOCK_TOKEN = 'ghp_mocktoken123';
const MOCK_USERNAME = 'mock-user';
const EXPECTED_HEADERS = {
  Authorization: `Bearer ${MOCK_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

describe('GithubService', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('gh-token'),
    get: jest.fn().mockReturnValue('octo-user'),
  } as unknown as ConfigService;

  let service: GithubService;
  const createAxiosResponse = <T>(data: T, status = 200): AxiosResponse<T> => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Created',
    headers: {},
    config: { headers: {} } as AxiosResponse<T>['config'],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(MOCK_TOKEN),
            get: jest.fn().mockReturnValue(MOCK_USERNAME),
          },
        },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
    jest.clearAllMocks();

    mockedAxios.get.mockImplementation(
      (url: string): Promise<AxiosGithubUserResponse> => {
        if (url === 'https://api.github.com/user') {
          return Promise.resolve(createAxiosResponse({ login: MOCK_USERNAME }));
        }
        return Promise.reject(new Error(`Unhandled GET request to ${url}`));
      },
    );
  });

  describe('createRepo', () => {
    it('should sanitize and create a repo', async () => {
      const mockResponse: AxiosGithubRepoResponse = createAxiosResponse(
        { html_url: 'https://github.com/mock-user/evaluation-react' },
        201,
      );
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await service.createRepo('Évaluation Réact!');
      const { post } = mockedAxios;
      expect(post).toHaveBeenCalledWith(
        'https://api.github.com/user/repos',
        expect.objectContaining({ name: 'evaluation-react' }),
        expect.anything(),
      );
    });
  });

  describe('createRepoForCandidate', () => {
    const baseArgs: [string, string, string, string] = [
      'Frontend Test',
      'Dupont',
      'Jean',
      'jean.dupont@email.com',
    ];

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle the full flow (create + invite)', async () => {
      const mockRepoResponse: AxiosGithubRepoResponse = createAxiosResponse(
        { html_url: 'https://github.com/mock-user/repo' },
        201,
      );
      mockedAxios.post.mockResolvedValueOnce(mockRepoResponse);

      const mockCollaboratorResponse: AxiosGithubCollaboratorResponse =
        createAxiosResponse({}, 201);
      mockedAxios.put.mockResolvedValueOnce(mockCollaboratorResponse);

      const promise = service.createRepoForCandidate(...baseArgs, 'jean-gh');

      await jest.runAllTimersAsync();

      const url = await promise;

      expect(url).toBe('https://github.com/mock-user/repo');

      const { put } = mockedAxios;
      expect(put).toHaveBeenCalledWith(
        expect.stringContaining('/collaborators/jean-gh'),
        { permission: 'write' },
        expect.anything(),
      );
    }, 10_000);

    it('should recover when repo already exists (422)', async () => {
      const error: GithubError = {
        response: {
          status: 422,
          data: { message: 'Repository already exists' },
        },
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      const mockRepoResponse: AxiosGithubRepoResponse = createAxiosResponse(
        { html_url: 'https://github.com/mock-user/frontend-test-jean-dupont' },
        201,
      );
      mockedAxios.post.mockResolvedValueOnce(mockRepoResponse);

      const promise = service.createRepoForCandidate(...baseArgs);

      await jest.runAllTimersAsync();

      const url = await promise;

      expect(url).toContain('frontend-test-jean-dupont');
    }, 10_000);
  });

  describe('inviteCollaboratorByEmail', () => {
    it('should fall back to search if direct invitation fails', async () => {
      const error: GithubError = {
        response: { status: 404, data: { message: 'fail' } },
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      const mockSearchResponse: AxiosGithubSearchResponse = createAxiosResponse(
        {
          total_count: 1,
          items: [{ login: 'found-user' }],
        },
      );

      mockedAxios.get.mockImplementation(
        (
          url: string,
        ): Promise<AxiosGithubUserResponse | AxiosGithubSearchResponse> => {
          if (url === 'https://api.github.com/user') {
            return Promise.resolve(
              createAxiosResponse({ login: MOCK_USERNAME }),
            );
          }
          if (url.includes('search/users')) {
            return Promise.resolve(mockSearchResponse);
          }
          return Promise.reject(new Error(`Unhandled GET: ${url}`));
        },
      );

      const mockCollaboratorResponse: AxiosGithubCollaboratorResponse =
        createAxiosResponse({}, 201);
      mockedAxios.put.mockResolvedValueOnce(mockCollaboratorResponse);

      await service.inviteCollaboratorByEmail('my-repo', 'test@email.com');

      const { get } = mockedAxios;
      expect(get).toHaveBeenCalledWith(
        expect.stringContaining('search/users'),
        expect.anything(),
      );
    });
  });

  describe('getFileContent', () => {
    it('should decode base64 file content', async () => {
      const originalContent = 'hello world';
      const encoded = Buffer.from(originalContent).toString('base64');

      const mockContentResponse: AxiosGithubContentResponse =
        createAxiosResponse({
          content: encoded,
          encoding: 'base64',
        });

      mockedAxios.get.mockImplementation(
        (
          url: string,
        ): Promise<AxiosGithubUserResponse | AxiosGithubContentResponse> => {
          if (url.includes('/contents/')) {
            return Promise.resolve(mockContentResponse);
          }
          if (url === 'https://api.github.com/user') {
            return Promise.resolve(
              createAxiosResponse({ login: MOCK_USERNAME }),
            );
          }
          return Promise.reject(new Error(`Unhandled GET: ${url}`));
        },
      );

      const content = await service.getFileContent('user/repo', 'file.ts');
      expect(content).toBe(originalContent);
    });

    it('should pass ref as query param when provided', async () => {
      const encoded = Buffer.from('code content').toString('base64');
      const mockContentResponse: AxiosGithubContentResponse =
        createAxiosResponse({
          content: encoded,
          encoding: 'base64',
        });

      mockedAxios.get.mockImplementation(
        (
          url: string,
        ): Promise<AxiosGithubUserResponse | AxiosGithubContentResponse> => {
          if (url.includes('/contents/')) {
            return Promise.resolve(mockContentResponse);
          }
          if (url === 'https://api.github.com/user') {
            return Promise.resolve(
              createAxiosResponse({ login: MOCK_USERNAME }),
            );
          }
          return Promise.reject(new Error(`Unhandled GET: ${url}`));
        },
      );

      await service.getFileContent(
        'user/repo',
        'src/main.py',
        'feature/my-branch',
      );

      // ✅ Correction unbound-method
      const { get } = mockedAxios;
      expect(get).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents/src/main.py',
        expect.objectContaining({
          headers: EXPECTED_HEADERS,
          params: { ref: 'feature/my-branch' },
        }),
      );
    });

    it('should pass empty params when ref is not provided', async () => {
      const encoded = Buffer.from('code content').toString('base64');
      const mockContentResponse: AxiosGithubContentResponse =
        createAxiosResponse({
          content: encoded,
          encoding: 'base64',
        });

      mockedAxios.get.mockImplementation(
        (
          url: string,
        ): Promise<AxiosGithubUserResponse | AxiosGithubContentResponse> => {
          if (url.includes('/contents/')) {
            return Promise.resolve(mockContentResponse);
          }
          if (url === 'https://api.github.com/user') {
            return Promise.resolve(
              createAxiosResponse({ login: MOCK_USERNAME }),
            );
          }
          return Promise.reject(new Error(`Unhandled GET: ${url}`));
        },
      );

      await service.getFileContent('user/repo', 'file.ts');

      // ✅ Correction unbound-method
      const { get } = mockedAxios;
      expect(get).toHaveBeenCalledWith(
        'https://api.github.com/repos/user/repo/contents/file.ts',
        expect.objectContaining({
          params: {},
        }),
      );
    });

    it('should return empty string if content is missing', async () => {
      const mockContentResponse: AxiosGithubContentResponse =
        createAxiosResponse({
          content: '',
          encoding: 'base64',
        });

      mockedAxios.get.mockImplementation(
        (
          url: string,
        ): Promise<AxiosGithubUserResponse | AxiosGithubContentResponse> => {
          if (url.includes('/contents/')) {
            return Promise.resolve(mockContentResponse);
          }
          if (url === 'https://api.github.com/user') {
            return Promise.resolve(
              createAxiosResponse({ login: MOCK_USERNAME }),
            );
          }
          return Promise.reject(new Error(`Unhandled GET: ${url}`));
        },
      );

      const content = await service.getFileContent('user/repo', 'big-file.py');
      expect(content).toBe('');
    });

    it('should throw and log error on 404', async () => {
      const error: GithubError = {
        message: 'Not Found',
        response: { status: 404, data: { message: 'Not Found' } },
      };

      mockedAxios.get.mockImplementation((url: string): Promise<never> => {
        if (url.includes('/contents/')) {
          return Promise.reject(new Error(error.message));
        }
        if (url === 'https://api.github.com/user') {
          return Promise.resolve(
            createAxiosResponse({ login: MOCK_USERNAME }),
          ) as Promise<never>;
        }
        return Promise.reject(new Error(`Unhandled GET: ${url}`));
      });

      await expect(
        service.getFileContent('user/repo', 'missing.py', 'feature/branch'),
      ).rejects.toThrow();
    });
  });
});
