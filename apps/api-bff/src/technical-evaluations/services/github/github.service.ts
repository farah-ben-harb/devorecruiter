import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

import {
  GithubRepoResponse,
  GithubUserSearchResponse,
  GithubBranch,
  GithubTreeResponse,
  GithubFileContentResponse,
} from '../../interfaces/github/github.interface';

@Injectable()
export class GithubService {
  private readonly token: string;
  private readonly username: string;

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.getOrThrow<string>('GITHUB_TOKEN');
    this.username = this.configService.get<string>('GITHUB_USERNAME') || '';
  }

  async createRepo(name: string, description?: string): Promise<string> {
    const repoName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_.]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);

    const response = await axios.post<GithubRepoResponse>(
      `https://api.github.com/user/repos`,
      {
        name: repoName,
        description: description ?? '',
        private: true,
        auto_init: true,
      },
      { headers: this.headers() },
    );

    return response.data.html_url;
  }

  async createRepoForCandidate(
    evaluationTitle: string,
    candidateName: string,
    candidateFirstName: string,
    candidateEmail: string,
    githubUsername?: string | null,
  ): Promise<string> {
    console.log('🔑 Token used:', this.token?.substring(0, 10) + '...');
    console.log('👤 Username:', this.username);

    const sanitize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9-_.]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const title = sanitize(evaluationTitle);
    const name = sanitize(`${candidateFirstName}-${candidateName}`);
    const repoName = `${title}-${name}`.substring(0, 100);
    console.log('📦 Repo name generated:', repoName);

    const owner = await this.getOwner();
    let repoUrl: string;

    // ── Étape 1 : Créer le repo
    try {
      const response = await axios.post<GithubRepoResponse>(
        `https://api.github.com/user/repos`,
        {
          name: repoName,
          description: `Évaluation technique — ${evaluationTitle} — ${candidateFirstName} ${candidateName}`,
          private: true,
          auto_init: true,
        },
        { headers: this.headers() },
      );

      repoUrl = response.data.html_url;
      console.log(`✅ Repo créé: ${repoUrl}`);
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 422) {
        repoUrl = `https://github.com/${owner}/${repoName}`;
        console.warn(`⚠️ Repo déjà existant, URL récupérée: ${repoUrl}`);
      } else {
        throw error;
      }
    }

    // ── Étape 2 : Attendre que GitHub initialise le repo
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

    // ── Étape 3 : Inviter le candidat
    if (githubUsername) {
      try {
        await axios.put(
          `https://api.github.com/repos/${owner}/${repoName}/collaborators/${githubUsername}`,
          { permission: 'write' },
          { headers: this.headers() },
        );
        console.log(`✅ Collaborateur ajouté: ${githubUsername}`);
      } catch (e) {
        const axiosError = e as AxiosError<{ message: string }>;
        console.warn(
          `⚠️ Ajout collaborateur échoué: ${axiosError.response?.data?.message}`,
        );
      }
    } else {
      await this.inviteCollaboratorByEmail(repoName, candidateEmail, 'write');
    }

    return repoUrl!;
  }

  async inviteCollaboratorByEmail(
    repoName: string,
    email: string,
    permission: 'read' | 'write' | 'admin' = 'write',
  ): Promise<void> {
    const owner = await this.getOwner();

    // ── Tentative 1 : invitation directe par email
    try {
      await axios.post(
        `https://api.github.com/repos/${owner}/${repoName}/invitations`,
        { email, permissions: permission },
        { headers: this.headers() },
      );
      console.log(`✅ Invitation envoyée par email à ${email}`);
      return;
    } catch (e) {
      const axiosError = e as AxiosError<{ message: string }>;
      console.warn(
        `⚠️ Invitation par email échouée: ${axiosError.response?.data?.message}`,
      );
    }

    // ── Tentative 2 : chercher le username via l'API search
    try {
      const response = await axios.get<GithubUserSearchResponse>(
        `https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email`,
        { headers: this.headers() },
      );

      const searchData = response.data;

      if (searchData.total_count > 0) {
        const githubUsername = searchData.items[0].login;
        console.log(`✅ Username trouvé: ${githubUsername}`);

        await axios.put(
          `https://api.github.com/repos/${owner}/${repoName}/collaborators/${githubUsername}`,
          { permission },
          { headers: this.headers() },
        );
        console.log(`✅ Collaborator ajouté via username: ${githubUsername}`);
        return;
      }
    } catch (e) {
      const axiosError = e as AxiosError<{ message: string }>;
      console.warn(
        `⚠️ Recherche username échouée: ${axiosError.response?.data?.message}`,
      );
    }

    console.warn(
      `❌ Impossible d'inviter ${email} — aucun compte GitHub trouvé`,
    );
  }

  async listBranches(repoFullName: string): Promise<string[]> {
    const response = await axios.get<GithubBranch[]>(
      `https://api.github.com/repos/${repoFullName}/branches`,
      { headers: this.headers() },
    );
    return response.data.map((b) => b.name);
  }

  async getRepoTree(
    repoFullName: string,
    branch = 'main',
  ): Promise<{ path: string; sha: string }[]> {
    const encodedBranch = encodeURIComponent(branch);
    const response = await axios.get<GithubTreeResponse>(
      `https://api.github.com/repos/${repoFullName}/git/trees/${encodedBranch}?recursive=1`,
      { headers: this.headers() },
    );
    return (response.data.tree ?? []).filter((f) => f.type === 'blob');
  }

  async getFileContent(
    repoFullName: string,
    filePath: string,
    ref?: string,
  ): Promise<string> {
    try {
      const url = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;
      const response = await axios.get<GithubFileContentResponse>(url, {
        headers: this.headers(),
        params: ref ? { ref } : {},
      });

      const file = response.data;

      if (!file.content) {
        console.warn(
          `⚠️ ${filePath} — contenu vide (fichier trop grand ou encoding non supporté)`,
        );
        return '';
      }

      return Buffer.from(file.content, 'base64').toString('utf-8');
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>;
      console.error(
        `❌ getFileContent(${filePath}) — status: ${axiosError.response?.status}, message: ${axiosError.response?.data?.message}`,
      );
      throw err;
    }
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private async getOwner(): Promise<string> {
    if (this.username) return this.username;
    const response = await axios.get<{ login: string }>(
      'https://api.github.com/user',
      { headers: this.headers() },
    );
    return response.data.login;
  }
}
