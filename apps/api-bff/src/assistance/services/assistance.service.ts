import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { UserMemoryRepository } from '../repositories/user-memory.repository';
import { CreateConversationDto } from '../dtos/create-conversation.dto';
import { UpdateConversationDto } from '../dtos/update-conversation.dto';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { SendChatDto } from '../dtos/chat-message.dto';
import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';
import { GroqStreamChunk } from '../interfaces/assistance-repository.interface';

type GroqResponse = { choices: [{ message: { content: string } }] };



@Injectable()
export class AssistanceService {
  private readonly GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly MODEL = 'llama-3.3-70b-versatile';
  private readonly API_KEY = process.env.GROQ_API_KEY;
  private readonly DEFAULT_CONVERSATION_TITLE = 'Nouvelle conversation';

  private readonly SYSTEM_PROMPT = `
Tu es un assistant technique expert dédié aux consultants IT.

Tu aides uniquement sur :
- développement logiciel
- programmation
- DevOps
- cloud computing
- intelligence artificielle
- cybersécurité
- bases de données
- architecture logicielle
- Kubernetes
- Docker
- Angular
- React
- Node.js
- Java
- Python
- préparation aux entretiens techniques
- apprentissage des technologies IT

Tu es pédagogue, clair et précis.

IMPORTANT :
Tu refuses poliment toutes les questions hors informatique et hors technologie.

Si une question ne concerne pas l'informatique, réponds exactement :
"Je suis spécialisé uniquement dans les sujets informatiques et technologiques."

Réponds toujours en français.
`;

  private get groqHeaders() {
    return {
      Authorization: `Bearer ${this.API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly messageRepo: MessageRepository,
    private readonly userMemoryRepo: UserMemoryRepository,
    private readonly httpService: HttpService,
  ) {}

  // ── Chat avec mémoire ─────────────────────────────────────────────────────

  async chat(
    dto: SendChatDto,
    userId: number,
  ): Promise<{ content: string; title?: string }> {
    const conversation = await this.conversationRepo.findOneById(
      dto.conversationId,
      userId,
    );
    if (!conversation) throw new ForbiddenException('Access denied');

    const existingMessages = await this.messageRepo.findByConversationId(
      dto.conversationId,
    );
    const isFirstMessage = existingMessages.length === 0;

    const memory = await this.userMemoryRepo.getByUserId(userId);
    const memorySummary = memory?.summary ?? null;

    const systemContent = memorySummary
      ? `${this.SYSTEM_PROMPT}\n\n---\nCe que tu sais déjà sur cet utilisateur :\n${memorySummary}\n---`
      : this.SYSTEM_PROMPT;

    const messages = [
      { role: 'system', content: systemContent },
      ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await firstValueFrom(
      this.httpService.post<GroqResponse>(
        this.GROQ_URL,
        { model: this.MODEL, messages },
        { headers: this.groqHeaders },
      ),
    );

    const assistantReply = response.data.choices[0].message.content;

    const lastUserMessage = dto.messages[dto.messages.length - 1];
    const firstUserMessage = dto.messages.find((m) => m.role === 'user');

    await this.messageRepo.create({
      conversationId: dto.conversationId,
      role: 'user',
      content: lastUserMessage.content,
    });
    await this.messageRepo.create({
      conversationId: dto.conversationId,
      role: 'assistant',
      content: assistantReply,
    });

    let generatedTitle: string | undefined;

    if (
      isFirstMessage &&
      firstUserMessage &&
      this.shouldAutoGenerateTitle(conversation.title)
    ) {
      try {
        const rawTitle = await this.generateTitle(firstUserMessage.content);
        const sanitized = rawTitle.replace(/^["'`]+|["'`]+$/g, '').trim();
        generatedTitle =
          sanitized || this.fallbackTitleFromMessage(firstUserMessage.content);
        await this.conversationRepo.update(dto.conversationId, {
          title: generatedTitle,
        });
      } catch {
        generatedTitle = this.fallbackTitleFromMessage(
          firstUserMessage.content,
        );
        await this.conversationRepo.update(dto.conversationId, {
          title: generatedTitle,
        });
      }
    }

    void this.updateMemory(userId, dto.messages, assistantReply, memorySummary);

    return { content: assistantReply, title: generatedTitle };
  }

  private shouldAutoGenerateTitle(currentTitle: string): boolean {
    const normalizedTitle = currentTitle.trim().toLowerCase();
    return (
      !normalizedTitle ||
      normalizedTitle === this.DEFAULT_CONVERSATION_TITLE.toLowerCase() ||
      normalizedTitle === 'nouveau chat' ||
      normalizedTitle === 'new chat' ||
      normalizedTitle === 'untitled'
    );
  }

  private fallbackTitleFromMessage(message: string): string {
    const words = message.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    return words.join(' ') || this.DEFAULT_CONVERSATION_TITLE;
  }

  // ── Mise à jour de la mémoire ─────────────────────────────────────────────

  private async updateMemory(
    userId: number,
    messages: { role: string; content: string }[],
    assistantReply: string,
    existingSummary: string | null,
  ): Promise<void> {
    const conversationText = [
      ...messages.map(
        (m) =>
          `${m.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${m.content}`,
      ),
      `Assistant: ${assistantReply}`,
    ].join('\n');

    const memoryPrompt = existingSummary
      ? `Voici ce que tu sais déjà sur cet utilisateur :
${existingSummary}

Voici la nouvelle conversation :
${conversationText}

Mets à jour le résumé en intégrant les nouvelles informations importantes sur l'utilisateur (compétences, technologies qu'il apprend, objectifs, lacunes, préférences). 
Sois concis (10 lignes max). Réponds UNIQUEMENT avec le résumé mis à jour, sans explication.`
      : `Voici une conversation entre un assistant technique et un utilisateur :
${conversationText}

Résume en 10 lignes max les informations importantes sur l'utilisateur (compétences, technologies qu'il apprend, objectifs, lacunes, préférences).
Réponds UNIQUEMENT avec le résumé, sans explication.`;

    try {
      const memoryResponse = await firstValueFrom(
        this.httpService.post<GroqResponse>(
          this.GROQ_URL,
          {
            model: this.MODEL,
            messages: [{ role: 'user', content: memoryPrompt }],
          },
          { headers: this.groqHeaders },
        ),
      );
      const newSummary = memoryResponse.data.choices[0].message.content.trim();
      await this.userMemoryRepo.upsert(userId, newSummary);
    } catch {
      // Ne pas faire planter le chat si la mise à jour mémoire échoue
    }
  }

  // ── Génération de titre ───────────────────────────────────────────────────

  async generateTitle(userMessage: string): Promise<string> {
    const response = await firstValueFrom(
      this.httpService.post<GroqResponse>(
        this.GROQ_URL,
        {
          model: this.MODEL,
          messages: [
            {
              role: 'user',
              content: `Génère un titre très court (5 mots maximum) pour une conversation qui commence par ce message : "${userMessage}". 
Réponds UNIQUEMENT avec le titre, sans guillemets, sans ponctuation, sans explication.`,
            },
          ],
        },
        { headers: this.groqHeaders },
      ),
    );
    return response.data.choices[0].message.content.trim();
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  getConversations(userId: number): Promise<ConversationEntity[]> {
    return this.conversationRepo.findAllByUserId(userId);
  }

  async getMessages(
    conversationId: string,
    userId: number,
  ): Promise<MessageEntity[]> {
    const conversation = await this.conversationRepo.findOneById(
      conversationId,
      userId,
    );
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.messageRepo.findByConversationId(conversationId);
  }

  createConversation(
    dto: CreateConversationDto,
    userId: number,
  ): Promise<ConversationEntity> {
    return this.conversationRepo.create(
      {
        ...dto,
        title: dto.title?.trim() || this.DEFAULT_CONVERSATION_TITLE,
      },
      userId,
    );
  }

  async updateConversation(
    id: string,
    dto: UpdateConversationDto,
    userId: number,
  ): Promise<ConversationEntity> {
    const conversation = await this.conversationRepo.findOneById(id, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.conversationRepo.update(id, dto);
  }

  async deleteConversation(id: string, userId: number): Promise<void> {
    const conversation = await this.conversationRepo.findOneById(id, userId);
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.conversationRepo.delete(id);
  }

  async saveMessage(
    dto: CreateMessageDto,
    userId: number,
  ): Promise<MessageEntity> {
    const conversation = await this.conversationRepo.findOneById(
      dto.conversationId,
      userId,
    );
    if (!conversation) throw new ForbiddenException('Access denied');
    return this.messageRepo.create(dto);
  }

  // ── Chat en streaming ─────────────────────────────────────────────────────

  async *chatStream(
    dto: SendChatDto,
    userId: number,
  ): AsyncGenerator<{ chunk?: string; title?: string; done?: boolean }> {
    const conversation = await this.conversationRepo.findOneById(
      dto.conversationId,
      userId,
    );
    if (!conversation) throw new ForbiddenException('Access denied');

    const existingMessages = await this.messageRepo.findByConversationId(
      dto.conversationId,
    );
    const isFirstMessage = existingMessages.length === 0;

    const memory = await this.userMemoryRepo.getByUserId(userId);
    const memorySummary = memory?.summary ?? null;

    const systemContent = memorySummary
      ? `${this.SYSTEM_PROMPT}\n\n---\nMémoire utilisateur :\n${memorySummary}\n---`
      : this.SYSTEM_PROMPT;

    const messages = [
      { role: 'system', content: systemContent },
      ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(this.GROQ_URL, {
      method: 'POST',
      headers: { ...this.groqHeaders },
      body: JSON.stringify({ model: this.MODEL, messages, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Groq error: ${response.status}`);
    }

    let fullContent = '';
    const decoder = new TextDecoder();
    let buffer = '';
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      // ✅ for classique à la place de for...of
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim(); // ✅ slice(6) plus rapide que replace
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data) as GroqStreamChunk; // ✅ GroqStreamChunk
          const token = parsed.choices?.[0]?.delta?.content ?? '';
          if (token) {
            fullContent += token;
            yield { chunk: token };
          }
        } catch {
          // chunk invalide, on ignore
        }
      }
    }

    const lastUserMessage = dto.messages[dto.messages.length - 1];
    const firstUserMessage = dto.messages.find((m) => m.role === 'user');

    await this.messageRepo.create({
      conversationId: dto.conversationId,
      role: 'user',
      content: lastUserMessage.content,
    });
    await this.messageRepo.create({
      conversationId: dto.conversationId,
      role: 'assistant',
      content: fullContent,
    });

    let generatedTitle: string | undefined;
    if (
      isFirstMessage &&
      firstUserMessage &&
      this.shouldAutoGenerateTitle(conversation.title)
    ) {
      try {
        const rawTitle = await this.generateTitle(firstUserMessage.content);
        const sanitized = rawTitle.replace(/^["'`]+|["'`]+$/g, '').trim();
        generatedTitle =
          sanitized || this.fallbackTitleFromMessage(firstUserMessage.content);
        await this.conversationRepo.update(dto.conversationId, {
          title: generatedTitle,
        });
      } catch {
        generatedTitle = this.fallbackTitleFromMessage(
          firstUserMessage.content,
        );
        await this.conversationRepo.update(dto.conversationId, {
          title: generatedTitle,
        });
      }
    }

    yield { title: generatedTitle, done: true };

    void this.updateMemory(userId, dto.messages, fullContent, memorySummary);
  }
}
