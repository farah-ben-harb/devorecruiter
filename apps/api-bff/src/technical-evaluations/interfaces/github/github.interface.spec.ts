import {
  GithubRepoResponse,
  GithubUserSearchResponse,
  GithubBranch,
  GithubTreeFile,
  GithubTreeResponse,
  GithubFileContentResponse,
  GithubRepository,
  GithubPushPayload,
} from './github.interface';

describe('GithubInterface', () => {
  describe('GithubRepoResponse', () => {
    it('should accept a valid object', () => {
      const obj: GithubRepoResponse = {
        html_url: 'https://github.com/org/repo',
      };
      expect(obj.html_url).toBe('https://github.com/org/repo');
    });
  });

  describe('GithubUserSearchResponse', () => {
    it('should accept a valid object with items', () => {
      const obj: GithubUserSearchResponse = {
        total_count: 2,
        items: [{ login: 'user1' }, { login: 'user2' }],
      };
      expect(obj.total_count).toBe(2);
      expect(obj.items).toHaveLength(2);
      expect(obj.items[0].login).toBe('user1');
    });

    it('should accept empty items array', () => {
      const obj: GithubUserSearchResponse = { total_count: 0, items: [] };
      expect(obj.items).toEqual([]);
    });
  });

  describe('GithubBranch', () => {
    it('should accept a valid branch object', () => {
      const obj: GithubBranch = { name: 'feature/auth' };
      expect(obj.name).toBe('feature/auth');
    });
  });

  describe('GithubTreeFile', () => {
    it('should accept a blob type', () => {
      const obj: GithubTreeFile = {
        type: 'blob',
        path: 'src/index.ts',
        sha: 'abc123',
      };
      expect(obj.type).toBe('blob');
    });

    it('should accept a tree type', () => {
      const obj: GithubTreeFile = { type: 'tree', path: 'src', sha: 'def456' };
      expect(obj.type).toBe('tree');
    });
  });

  describe('GithubTreeResponse', () => {
    it('should accept a valid tree response', () => {
      const obj: GithubTreeResponse = {
        tree: [
          { type: 'blob', path: 'src/index.ts', sha: 'abc' },
          { type: 'tree', path: 'src', sha: 'def' },
        ],
      };
      expect(obj.tree).toHaveLength(2);
    });

    it('should accept an empty tree', () => {
      const obj: GithubTreeResponse = { tree: [] };
      expect(obj.tree).toEqual([]);
    });
  });

  describe('GithubFileContentResponse', () => {
    it('should accept a valid base64 content with encoding', () => {
      const obj: GithubFileContentResponse = {
        content: 'Y29uc29sZS5sb2coImhlbGxvIik=',
        encoding: 'base64',
      };
      expect(obj.content).toBeTruthy();
      expect(obj.encoding).toBe('base64');
    });

    it('should accept an object with optional size', () => {
      const obj: GithubFileContentResponse = {
        content: 'Y29uc29sZS5sb2coImhlbGxvIik=',
        encoding: 'base64',
        size: 3932,
      };
      expect(obj.size).toBe(3932);
    });

    it('should accept an object without size (optional field)', () => {
      const obj: GithubFileContentResponse = {
        content: 'abc',
        encoding: 'base64',
      };
      expect(obj.size).toBeUndefined();
    });
  });

  describe('GithubRepository', () => {
    it('should accept a valid repository object', () => {
      const obj: GithubRepository = { name: 'frontend-test-jean-dupont' };
      expect(obj.name).toBe('frontend-test-jean-dupont');
    });
  });

  describe('GithubPushPayload', () => {
    it('should accept a valid push payload', () => {
      const obj: GithubPushPayload = {
        ref: 'refs/heads/feature/my-branch',
        repository: { name: 'frontend-test-jean-dupont' },
      };
      expect(obj.ref).toBe('refs/heads/feature/my-branch');
      expect(obj.repository.name).toBe('frontend-test-jean-dupont');
    });

    it('should extract branch name from ref', () => {
      const obj: GithubPushPayload = {
        ref: 'refs/heads/feature/my-branch',
        repository: { name: 'my-repo' },
      };
      const branch = obj.ref.replace('refs/heads/', '');
      expect(branch).toBe('feature/my-branch');
    });

    it('should handle main branch push payload', () => {
      const obj: GithubPushPayload = {
        ref: 'refs/heads/main',
        repository: { name: 'my-repo' },
      };
      expect(obj.ref).toBe('refs/heads/main');
    });
  });
});
