export interface GithubRepoResponse {
  html_url: string;
}

export interface GithubUserSearchResponse {
  total_count: number;
  items: { login: string }[];
}

export interface GithubBranch {
  name: string;
}

export interface GithubTreeFile {
  type: 'blob' | 'tree';
  path: string;
  sha: string;
}

export interface GithubTreeResponse {
  tree: GithubTreeFile[];
}

export interface GithubFileContentResponse {
  content: string;
  encoding: string;
  size?: number;
}

export interface GithubRepository {
  name: string;
}

export interface GithubPushPayload {
  ref: string;
  repository: GithubRepository;
}
