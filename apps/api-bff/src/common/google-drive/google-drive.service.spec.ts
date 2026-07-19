import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Readable } from 'stream';
import { of } from 'rxjs';
import { UsersService } from '../../users/services/users.service';
import { GoogleDriveService } from './google-drive.service';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

global.FormData = jest.fn().mockImplementation(() => ({
  append: jest.fn(),
}));

global.Blob = jest
  .fn()
  .mockImplementation((content: unknown, options: unknown) => ({
    content,
    options,
  }));

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('mock-value'),
  };

  const mockUsersService = {
    getGoogleAccessToken: jest.fn(),
    getGoogleRefreshToken: jest.fn(),
    updateGoogleAccessToken: jest.fn(),
    getAllEmailsExcept: jest.fn(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'resume.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test'),
    size: 4,
    stream: Readable.from(Buffer.from('test')),
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleDriveService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<GoogleDriveService>(GoogleDriveService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile()', () => {
    it('should upload file and return drive file data', async () => {
      const mockDriveFile = {
        id: 'file123',
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        webViewLink: 'https://drive.google.com/file/d/file123/view',
      };

      jest
        .spyOn(service, 'getValidAccessToken')
        .mockResolvedValue('access-token');
      const postSpy = jest
        .spyOn(mockedAxios, 'post')
        .mockResolvedValue({ data: mockDriveFile } as never);

      const result = await service.uploadFile(1, mockFile, 'folder123');

      expect(result).toEqual(mockDriveFile);
      expect(postSpy).toHaveBeenCalledWith(
        expect.stringContaining('upload/drive/v3/files'),
        expect.any(Object),
        {
          headers: { Authorization: 'Bearer access-token' },
        },
      );
    });
  });

  describe('getValidAccessToken()', () => {
    it('should return current token when present in database', async () => {
      mockUsersService.getGoogleAccessToken.mockResolvedValue('valid-token');

      const result = await service.getValidAccessToken(1);

      expect(result).toBe('valid-token');
      expect(mockUsersService.updateGoogleAccessToken).not.toHaveBeenCalled();
    });

    it('should return cached token on subsequent calls', async () => {
      mockUsersService.getGoogleAccessToken.mockResolvedValue('cached-token');

      const firstResult = await service.getValidAccessToken(1);
      const secondResult = await service.getValidAccessToken(1);

      expect(firstResult).toBe('cached-token');
      expect(secondResult).toBe('cached-token');
      expect(mockUsersService.getGoogleAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should refresh and persist token when no token is stored', async () => {
      mockUsersService.getGoogleAccessToken.mockResolvedValue(null);
      mockUsersService.getGoogleRefreshToken.mockResolvedValue('refresh-token');
      mockHttpService.post.mockReturnValue(
        of({ data: { access_token: 'new-token' } }),
      );

      const result = await service.getValidAccessToken(1);

      expect(result).toBe('new-token');
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          refresh_token: 'refresh-token',
          grant_type: 'refresh_token',
        }),
      );
      expect(mockUsersService.updateGoogleAccessToken).toHaveBeenCalledWith(
        1,
        'new-token',
      );
    });
  });

  describe('listFiles()', () => {
    it('should return list of drive files', async () => {
      const mockFiles = [
        { id: 'f1', name: 'file1.pdf', mimeType: 'application/pdf' },
        { id: 'f2', name: 'file2.docx', mimeType: 'application/msword' },
      ];

      jest
        .spyOn(service, 'getValidAccessToken')
        .mockResolvedValue('access-token');
      const getSpy = jest
        .spyOn(mockedAxios, 'get')
        .mockResolvedValue({ data: { files: mockFiles } } as never);

      const result = await service.listFiles(1, 'folder123');

      expect(result).toEqual(mockFiles);
      expect(getSpy).toHaveBeenCalledWith(
        expect.stringContaining('folder123'),
        {
          headers: { Authorization: 'Bearer access-token' },
        },
      );
    });
  });

  describe('downloadFile()', () => {
    it('should return base64 encoded file content', async () => {
      const fakeBuffer = Buffer.from('pdf content');

      jest
        .spyOn(service, 'getValidAccessToken')
        .mockResolvedValue('access-token');
      const getSpy = jest
        .spyOn(mockedAxios, 'get')
        .mockResolvedValue({ data: fakeBuffer } as never);

      const result = await service.downloadFile(
        1,
        'file123',
        'application/pdf',
      );

      expect(result).toBe(fakeBuffer.toString('base64'));
      expect(getSpy).toHaveBeenCalledWith(expect.stringContaining('file123'), {
        headers: { Authorization: 'Bearer access-token' },
        responseType: 'arraybuffer',
      });
    });

    it('should use application/pdf as default mimeType', async () => {
      jest
        .spyOn(service, 'getValidAccessToken')
        .mockResolvedValue('access-token');
      const getSpy = jest
        .spyOn(mockedAxios, 'get')
        .mockResolvedValue({ data: Buffer.from('x') } as never);

      await service.downloadFile(1, 'file123');

      expect(getSpy).toHaveBeenCalledWith(
        expect.stringContaining('mimeType=application/pdf'),
        expect.any(Object),
      );
    });
  });

  describe('deleteFile()', () => {
    it('should call axios delete with correct params', async () => {
      jest
        .spyOn(service, 'getValidAccessToken')
        .mockResolvedValue('access-token');
      mockedAxios.mockResolvedValue({ data: {} } as never);

      await service.deleteFile(1, 'file123');

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'delete',
        url: 'https://www.googleapis.com/drive/v3/files/file123?supportsAllDrives=true',
        headers: { Authorization: 'Bearer access-token' },
      });
    });

    it('should ignore axios 404 errors', async () => {
      const notFoundError = {
        response: { status: 404 },
      };

      jest
        .spyOn(service, 'getValidAccessToken')
        .mockResolvedValue('access-token');
      mockedAxios.mockRejectedValue(notFoundError);
      (
        mockedAxios.isAxiosError as jest.MockedFunction<
          typeof axios.isAxiosError
        >
      ).mockReturnValue(true);

      await expect(service.deleteFile(1, 'file123')).resolves.toBeUndefined();
    });
  });

  describe('share methods', () => {
    it('shareFileWithUser should call drive permissions endpoint', async () => {
      jest
        .spyOn(service, 'getValidAccessToken')
        .mockResolvedValue('access-token');
      const postSpy = jest
        .spyOn(mockedAxios, 'post')
        .mockResolvedValue({ data: {} } as never);

      await service.shareFileWithUser(10, 'file-id', 'member@company.com');

      expect(postSpy).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-id/permissions?supportsAllDrives=true&sendNotificationEmail=false',
        {
          role: 'writer',
          type: 'user',
          emailAddress: 'member@company.com',
        },
        { headers: { Authorization: 'Bearer access-token' } },
      );
    });

    it('shareWithAll should share file with all other users', async () => {
      mockUsersService.getAllEmailsExcept.mockResolvedValue([
        'a@company.com',
        'b@company.com',
      ]);
      const shareSpy = jest
        .spyOn(service, 'shareFileWithUser')
        .mockResolvedValue(undefined);

      await service.shareWithAll(10, 'file-id');

      expect(mockUsersService.getAllEmailsExcept).toHaveBeenCalledWith(10);
      expect(shareSpy).toHaveBeenCalledTimes(2);
      expect(shareSpy).toHaveBeenCalledWith(10, 'file-id', 'a@company.com');
      expect(shareSpy).toHaveBeenCalledWith(10, 'file-id', 'b@company.com');
    });

    it('shareAllExistingFiles should skip empty ids', async () => {
      const shareAllSpy = jest
        .spyOn(service, 'shareWithAll')
        .mockResolvedValue(undefined);
      const otherEmails = ['a@company.com', 'b@company.com'];

      await service.shareAllExistingFiles(10, [
        'file-1',
        null,
        undefined,
        'file-2',
      ]);

      expect(mockUsersService.getAllEmailsExcept).toHaveBeenCalledWith(10);
      expect(shareAllSpy).toHaveBeenCalledTimes(2);
      expect(shareAllSpy).toHaveBeenNthCalledWith(1, 10, 'file-1', otherEmails);
      expect(shareAllSpy).toHaveBeenNthCalledWith(2, 10, 'file-2', otherEmails);
    });
  });
});
