import { mapPostApiResponseToUploadedFile } from './job-posts.mapper';
import { PostApiResponse } from '../models/job-post.model';
import { environment } from '@env/environment';

describe('mapPostApiResponseToUploadedFile', () => {
  const baseResponse: PostApiResponse = {
    id: 42,
    name: 'offre-emploi.pdf',
    status: 'raw',
    type: 'application/pdf',
    url: 'https://example.com/file.pdf',
    googleDocId: 'doc123',
    generatedDocId: undefined,
    document_id: undefined,
    googleDriveFileId: 'drive456',
    unifiedUrl: 'https://example.com/unified.pdf',
    company: 'Acme Corp',
    startDate: '2024-06-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  describe('id', () => {
    it('should convert numeric id to string', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.id).toBe('42');
    });

    it('should return undefined if id is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        id: undefined,
      } as unknown as PostApiResponse);
      expect(result.id).toBeUndefined();
    });
  });

  describe('name', () => {
    it('should use name from response', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.name).toBe('offre-emploi.pdf');
    });

    it('should fallback to "Sans nom" when name is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        name: undefined,
      } as unknown as PostApiResponse);
      expect(result.name).toBe('Sans nom');
    });
  });

  describe('status', () => {
    it('should use status from response', () => {
      const result = mapPostApiResponseToUploadedFile({ ...baseResponse, status: 'unified' });
      expect(result.status).toBe('unified');
    });

    it('should fallback to "raw" when status is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        status: undefined,
      } as unknown as PostApiResponse);
      expect(result.status).toBe('raw');
    });
  });

  describe('type', () => {
    it('should use type from response', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.type).toBe('application/pdf');
    });

    it('should fallback to google document mime type when type is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        type: undefined,
      } as unknown as PostApiResponse);
      expect(result.type).toBe(`${environment.googleMimePrefix}.document`);
    });
  });

  describe('url', () => {
    it('should use url from response', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.url).toBe('https://example.com/file.pdf');
    });

    it('should fallback to empty string when url is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        url: undefined,
      } as unknown as PostApiResponse);
      expect(result.url).toBe('');
    });
  });

  describe('googleDocId', () => {
    it('should prefer googleDocId over generatedDocId and document_id', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        googleDocId: 'primary',
        generatedDocId: 'secondary',
        document_id: 'tertiary',
      });
      expect(result.googleDocId).toBe('primary');
    });

    it('should fallback to generatedDocId when googleDocId is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        googleDocId: undefined,
        generatedDocId: 'secondary',
        document_id: 'tertiary',
      });
      expect(result.googleDocId).toBe('secondary');
    });

    it('should fallback to document_id when googleDocId and generatedDocId are missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        googleDocId: undefined,
        generatedDocId: undefined,
        document_id: 'tertiary',
      });
      expect(result.googleDocId).toBe('tertiary');
    });

    it('should be undefined when all doc id fields are missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        googleDocId: undefined,
        generatedDocId: undefined,
        document_id: undefined,
      });
      expect(result.googleDocId).toBeUndefined();
    });
  });

  describe('driveFileId', () => {
    it('should use googleDriveFileId from response', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.driveFileId).toBe('drive456');
    });

    it('should be undefined when googleDriveFileId is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        googleDriveFileId: undefined,
      } as unknown as PostApiResponse);
      expect(result.driveFileId).toBeUndefined();
    });
  });

  describe('unifiedUrl', () => {
    it('should use unifiedUrl from response', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.unifiedUrl).toBe('https://example.com/unified.pdf');
    });

    it('should be undefined when unifiedUrl is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        unifiedUrl: undefined,
      });
      expect(result.unifiedUrl).toBeUndefined();
    });
  });

  describe('company', () => {
    it('should use company from response', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.company).toBe('Acme Corp');
    });

    it('should be undefined when company is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        company: undefined,
      });
      expect(result.company).toBeUndefined();
    });
  });

  describe('startDate', () => {
    it('should use startDate from response', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.startDate).toBe('2024-06-01');
    });

    it('should be undefined when startDate is missing', () => {
      const result = mapPostApiResponseToUploadedFile({
        ...baseResponse,
        startDate: undefined,
      });
      expect(result.startDate).toBeUndefined();
    });
  });

  describe('fixed fields', () => {
    it('should always set isDriveFile to true', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.isDriveFile).toBe(true);
    });

    it('should always set isLoading to false', () => {
      const result = mapPostApiResponseToUploadedFile(baseResponse);
      expect(result.isLoading).toBe(false);
    });
  });
});
