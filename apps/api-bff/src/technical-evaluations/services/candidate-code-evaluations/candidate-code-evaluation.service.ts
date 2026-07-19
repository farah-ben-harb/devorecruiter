import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { CandidateCodeEvaluation } from '../../entities/candidate-code-evaluations/candidate-code-evaluations.entity';
import { GithubService } from '../github/github.service';
import { Invitation } from '../../entities/evaluation-invitations/evaluation-invitation.entity';
import { TechnicalEvaluation } from '../../entities/technical-evaluations/technical-evaluations.entity';
import {
  AiEvaluationResult,
  OpenRouterResponse,
} from '../../interfaces/candidate-code-evaluation/candidate-code-evaluation.interface';

@Injectable()
export class CandidateCodeEvaluationService {
  constructor(
    private readonly githubService: GithubService,
    private readonly configService: ConfigService,
    @InjectRepository(CandidateCodeEvaluation)
    private readonly repo: Repository<CandidateCodeEvaluation>,
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,
    @InjectRepository(TechnicalEvaluation)
    private readonly evaluationRepo: Repository<TechnicalEvaluation>,
  ) {}

  async evaluateCandidateWork(
    invitationId: number,
  ): Promise<CandidateCodeEvaluation> {
    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');

    const evaluation = await this.evaluationRepo.findOne({
      where: { id: invitation.evaluationId },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable');

    const repoName = this.extractRepoName(invitation.gitRepoUrl);
    if (!repoName)
      throw new NotFoundException('Repo Git introuvable pour cette invitation');

    const branches = await this.githubService.listBranches(repoName);
    const candidateBranch =
      branches.find((b) => b.startsWith('feature/') || b.startsWith('dev/')) ??
      branches.find((b) => b !== 'main' && b !== 'master') ??
      'main';

    const tree = await this.githubService.getRepoTree(repoName, candidateBranch);
    const codeFiles = tree.filter((f) => this.isCodeFile(f.path)).slice(0, 20);

    console.log('🌿 Branch:', candidateBranch);
    console.log('📁 Total files in tree:', tree.length);
    console.log('📄 Code files found:', codeFiles.map((f) => f.path));

    const codeContents: string[] = [];
    for (const file of codeFiles) {
      try {
        const content = await this.githubService.getFileContent(
          repoName,
          file.path,
          candidateBranch,
        );
        codeContents.push(
          `### ${file.path}\n\`\`\`\n${content.substring(0, 3000)}\n\`\`\``,
        );
      } catch {
        console.warn(`⚠️ Fichier illisible: ${file.path}`);
      }
    }

    const codeSubmitted = codeContents.join('\n\n');

    console.log('📝 codeSubmitted length:', codeSubmitted.length);
    console.log('📝 codeSubmitted empty?', !codeSubmitted);

    // ── Repo vide : retour immédiat sans IA ──────────────────────────────────
    if (!codeSubmitted) {
      return this.repo.save(
        this.repo.create({
          invitationId,
          candidateId: invitation.candidateId,
          evaluationId: invitation.evaluationId,
          branch: candidateBranch,
          globalScore: 0,
          technicalScore: 0,
          qualityScore: 0,
          feedback: "Le repository est vide. Le candidat n'a pas encore soumis de code.",
          strengths: [],
          improvements: ['Soumettre le code dans le repository avant la date limite.'],
          recommendation: 'reject',
          rawAiResponse: 'NO_CODE_FOUND',
          requirementsAnalysis: null,
        }),
      );
    }

    // ── Évaluation IA ─────────────────────────────────────────────────────────
    const prompt = this.buildEvaluationPrompt({
      candidateName: `${invitation.candidateFirstName} ${invitation.candidateName}`,
      jobPostName: evaluation.title,
      evaluationSubject: evaluation.htmlContent ?? '',
      codeSubmitted,
    });

    const aiResponse = await this.callOpenRouter(prompt);
    const parsed = this.parseAiResponse(aiResponse);

    return this.repo.save(
      this.repo.create({
        invitationId,
        candidateId: invitation.candidateId,
        evaluationId: invitation.evaluationId,
        branch: candidateBranch,
        globalScore: parsed.globalScore,
        technicalScore: parsed.technicalScore,
        qualityScore: parsed.qualityScore,
        feedback: parsed.feedback,
        strengths: parsed.strengths,
        improvements: parsed.improvements,
        recommendation: parsed.recommendation,
        rawAiResponse: aiResponse,
        requirementsAnalysis: parsed.requirementsAnalysis ?? null,
      }),
    );
  }

  async findByInvitation(
    invitationId: number,
  ): Promise<CandidateCodeEvaluation | null> {
    return this.repo.findOne({ where: { invitationId } });
  }

  async findByEvaluation(
    evaluationId: number,
  ): Promise<CandidateCodeEvaluation[]> {
    return this.repo.find({ where: { evaluationId } });
  }

  private parseAiResponse(aiResponse: string): AiEvaluationResult {
    const fallback: AiEvaluationResult = {
      globalScore: 0,
      technicalScore: 0,
      qualityScore: 0,
      feedback: aiResponse,
      requirementsAnalysis: { completed: [], partial: [], missing: [], bonus: [] },
      strengths: [],
      improvements: [],
      recommendation: 'maybe',
    };

    try {
      const clean = aiResponse.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean) as Partial<AiEvaluationResult>;

      return {
        globalScore: parsed.globalScore ?? 0,
        technicalScore: parsed.technicalScore ?? 0,
        qualityScore: parsed.qualityScore ?? 0,
        feedback: parsed.feedback ?? '',
        requirementsAnalysis: parsed.requirementsAnalysis ?? {
          completed: [],
          partial: [],
          missing: [],
          bonus: [],
        },
        strengths: parsed.strengths ?? [],
        improvements: parsed.improvements ?? [],
        recommendation: parsed.recommendation ?? 'maybe',
      };
    } catch {
      return fallback;
    }
  }

  private buildEvaluationPrompt(params: {
    candidateName: string;
    jobPostName: string;
    evaluationSubject: string;
    codeSubmitted: string;
  }): string {
    return `
Tu es un expert technique senior chargé d'évaluer le travail d'un candidat.

## Candidat
${params.candidateName}

## Poste visé
${params.jobPostName}

## Énoncé de l'évaluation (ce qui était demandé)
${params.evaluationSubject.replace(/<[^>]+>/g, '')}

## Code soumis par le candidat
${params.codeSubmitted}

## Ta mission
1. Extrais TOUTES les exigences fonctionnelles et techniques de l'énoncé (user stories, critères d'acceptance, fonctionnalités demandées, contraintes techniques).
2. Pour chaque exigence, vérifie si le candidat l'a implémentée, partiellement implémentée, ou omise.
3. Identifie les éventuels bonus (fonctionnalités non demandées mais pertinentes ajoutées par le candidat).
4. Évalue la qualité globale du code.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "globalScore": <0-100>,
  "technicalScore": <0-100>,
  "qualityScore": <0-100>,
  "feedback": "<paragraphe de feedback global synthétique>",
  "requirementsAnalysis": {
    "completed": ["<exigence réalisée 1>", "<exigence réalisée 2>"],
    "partial": ["<exigence partiellement réalisée avec explication>"],
    "missing": ["<exigence manquante 1>", "<exigence manquante 2>"],
    "bonus": ["<fonctionnalité bonus ajoutée par le candidat>"]
  },
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "improvements": ["<axe amélioration 1>", "<axe amélioration 2>"],
  "recommendation": "<hire|maybe|reject>"
}
    `.trim();
  }

  private isCodeFile(path: string): boolean {
    const filename = path.split('/').pop() ?? '';
    const excluded = ['README.md', 'readme.md', '.gitignore', 'LICENSE', 'LICENSE.md'];
    if (excluded.includes(filename)) return false;

    const extensions = ['.ts', '.js', '.py', '.java', '.go', '.cs', '.php', '.vue', '.jsx', '.tsx', '.sql'];
    return extensions.some((ext) => path.endsWith(ext));
  }

  private extractRepoName(gitRepoUrl: string | null): string | null {
    if (!gitRepoUrl) return null;
    const match = gitRepoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1].replace(/\.git$/, '') : null;
  }

  private async callOpenRouter(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this.configService.getOrThrow('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-nano-12b-v2-vl:free',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = (await response.json()) as OpenRouterResponse;
    if (!response.ok || !data.choices || data.choices.length === 0) {
    console.error('OpenRouter error:', JSON.stringify(data));
    throw new Error(`OpenRouter API error: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}
}