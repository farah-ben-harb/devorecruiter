import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, toolCallLimitMiddleware } from 'langchain';
import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import { createDbQueryTool, createSearchTool } from '../tools/db-query.tool';
import { StructuredToolInterface } from '@langchain/core/tools';

// ── Modèles Groq actifs (Mai 2026) ───────────────────────────────────────────
// Ordre : du plus capable au plus léger
// llama-3.1-8b-instant en dernier — génère des tool calls invalides
// llama3-70b-8192 → décommissionné, retiré de la liste
const GROQ_MODELS = [
  { name: 'meta-llama/llama-4-scout-17b-16e-instruct', tpd: 500_000 },
  { name: 'llama-3.3-70b-versatile', tpd: 100_000 },
  { name: 'openai/gpt-oss-20b', tpd: 500_000 },
  { name: 'qwen/qwen3-32b', tpd: 500_000 },
  { name: 'llama-3.1-8b-instant', tpd: 500_000 }, // dernier recours
];

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private tools!: StructuredToolInterface[];
  private apiKey!: string;
  private baseURL!: string;
  private currentModelIndex = 0;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY manquant — agent non initialisé');
      return;
    }

    this.apiKey = apiKey;
    this.baseURL = this.configService.get<string>('OPENAI_BASE_URL') ?? '';

    const dbTools = createDbQueryTool(
      this.dataSource,
    ) as unknown as StructuredToolInterface[];
    const searchTool = createSearchTool(
      this.dataSource,
    ) as unknown as StructuredToolInterface;
    this.tools = [...dbTools, searchTool];

    this.logger.log(`Agent initialisé avec ${this.tools.length} tools`);
    this.logger.log(
      `Modèle actif : ${GROQ_MODELS[this.currentModelIndex].name}`,
    );
  }

  // ── Crée un agent LangChain v1 avec une limite d'appels par exécution ─────
  private createAgent(modelName: string) {
    const llm = new ChatOpenAI({
      model: modelName,
      temperature: 0,
      openAIApiKey: this.apiKey,
      configuration: { baseURL: this.baseURL },
    });

    return createAgent({
      model: llm,
      tools: this.tools as any,
      systemPrompt: this.getSystemPrompt(),
      middleware: [
        toolCallLimitMiddleware({
          runLimit: 5,
          exitBehavior: 'continue',
        }),
      ],
    });
  }

  // ── Chat avec rotation automatique des modèles ────────────────────────────
  async chat(message: string, history: BaseMessage[]): Promise<string> {
    if (!this.tools) {
      return "L'assistant n'est pas disponible. Vérifiez la configuration OPENAI_API_KEY.";
    }

    for (let attempt = 0; attempt < GROQ_MODELS.length; attempt++) {
      const modelIdx = (this.currentModelIndex + attempt) % GROQ_MODELS.length;
      const modelName = GROQ_MODELS[modelIdx].name;

      try {
        const agent = this.createAgent(modelName);
        const result = await agent.invoke({
          messages: [...history, new HumanMessage(message)],
        });
        const lastMessage = result.messages.at(-1);
        const output = this.extractMessageText(lastMessage?.content);

        // Succès → mémoriser ce modèle pour la prochaine fois
        if (attempt > 0) {
          this.currentModelIndex = modelIdx;
          this.logger.log(`Basculé sur le modèle : ${modelName}`);
        }

        return output;
      } catch (err: any) {
        const msg = err?.message ?? '';

        // ── Rate limit 429 ────────────────────────────────────────────────
        if (msg.includes('429')) {
          const waitMatch = msg.match(/try again in (\d+)m(\d+)/);
          const waitMin = waitMatch ? parseInt(waitMatch[1]) : 0;
          const waitSec = waitMatch ? parseInt(waitMatch[2]) : 0;

          this.logger.warn(
            `Rate limit sur ${modelName} (attente ${waitMin}m${waitSec}s) → essai du modèle suivant...`,
          );

          if (attempt === GROQ_MODELS.length - 1) {
            const waitDisplay =
              waitMin > 0
                ? `${waitMin} min ${waitSec} sec`
                : `${waitSec} secondes`;
            return `⏳ Tous les modèles sont temporairement saturés. Réessaie dans ${waitDisplay}.`;
          }

          await new Promise((r) => setTimeout(r, 500));
          continue;
        }

        // ── Modèle décommissionné ou invalide (400) ───────────────────────
        if (
          msg.includes('400') ||
          msg.includes('decommissioned') ||
          msg.includes('no longer supported') ||
          msg.includes('does not exist')
        ) {
          this.logger.warn(
            `Modèle indisponible ${modelName} → essai du modèle suivant...`,
          );

          if (attempt === GROQ_MODELS.length - 1) {
            return `❌ Aucun modèle disponible. Vérifie la liste des modèles Groq actifs.`;
          }

          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        // ── Tool call invalide (modèles faibles type llama-3.1-8b) ────────
        if (
          msg.includes('tool call validation failed') ||
          msg.includes('missing properties') ||
          msg.includes('did not match schema')
        ) {
          this.logger.warn(
            `Tool call invalide sur ${modelName} → essai du modèle suivant...`,
          );

          if (attempt === GROQ_MODELS.length - 1) {
            return `❌ Impossible de traiter cette requête. Essaie de reformuler ta question.`;
          }

          await new Promise((r) => setTimeout(r, 300));
          continue;
        }

        // ── Autre erreur → logger et remonter ────────────────────────────
        this.logger.error('Erreur agent pour le modèle configuré.');
        throw err;
      }
    }

    return 'Service temporairement indisponible.';
  }

  private extractMessageText(content: BaseMessage['content'] | undefined): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';

    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object' && 'text' in block) {
          return typeof block.text === 'string' ? block.text : '';
        }
        return '';
      })
      .join('')
      .trim();
  }

  // ── System prompt ─────────────────────────────────────────────────────────
  private getSystemPrompt(): string {
    return `Tu es l'assistant de DevoRecruiter. Réponds TOUJOURS en appelant un tool.

TABLES : users, candidates, job_posts, job_offers, technical_evaluations, invitations, candidate_quiz_results, candidate_code_evaluations, resume_evaluation, job_post_evaluation

RÈGLES :
- Nom/email/github d'une personne → search_candidate_by_name
- Compter/lister une table → query_database
- Questions croisées ou jointures → query_database_joined
- Fiche de poste spécifique (BNP, Microsoft...) → query_database_joined resume_evaluations_by_job_post
- Maximum 2 appels tools par question
- Ne pas chercher l'email si non demandé

VALEURS :
- resume_evaluation recommendation : "retenir" = retenu, "ecarter" = écarté
- technical_evaluations status : approved, rejected, completed, pending, in_progress
- invitations status : sent, opened, submitted

IMPORTANT — FORMULATION DES RÉPONSES :
- Une fiche a un QCM = son quizContent est généré (champ quizGenere=true). Ne jamais dire "hasQcm=true".
- Baser les réponses uniquement sur les données retournées par les tools, sans reformuler avec des termes techniques internes.

FORMAT DE RÉPONSE :
- Réponses courtes et directes, sans répéter le titre de la requête
- Listes simples avec tirets plutôt que tableaux Markdown quand il y a peu de résultats
- Tableaux uniquement si plus de 5 résultats ou si l'utilisateur demande explicitement
- Ne jamais mentionner les noms de champs techniques (quizContent, jobPostId, evaluationId...)
- Présenter les infos essentielles : entreprise, titre du poste, statut`;
  }
}
