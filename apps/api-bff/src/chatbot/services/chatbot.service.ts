import { Injectable, Logger } from '@nestjs/common';
import { ChatMessageDto, ChatResponseDto } from '../dtos/chat-message.dto';
import { AgentService } from './agent.service';
import { MemoryService } from './memory.service';


@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly memoryService: MemoryService,
  ) {}

  // ── Résolution des pronoms depuis le chat_history ─────────────────────────
  private resolvePronouns(message: string, history: any[]): string {
    const pronounPattern = /\b(son|sa|ses|leur|il|elle|ce candidat|ce cv|lui)\b/i;
    if (!pronounPattern.test(message)) return message;

    // Chercher le dernier nom mentionné dans les réponses IA
    const aiContents = history
      .filter(m => {
        const ids: string[] = m?.id ?? [];
        return ids.includes('AIMessage') || ids.includes('AIMessageChunk');
      })
      .map(m => m?.kwargs?.content as string)
      .filter(Boolean)
      .reverse();

    const namePatterns = [
      // "est celui de Wissem Lallahem" / "de Salma Ben Romdhane"
      /\bde\s+([A-ZÀÂÉÈÊÎÔÙÛ][a-zàâéèêîôùû]+(?: [A-ZÀÂÉÈÊÎÔÙÛ][a-zàâéèêîôùû]+)+)/,
      // "Le candidat Wissem Lallahem"
      /\bcandida[t|ts]\s+([A-ZÀÂÉÈÊÎÔÙÛ][a-zàâéèêîôùû]+(?: [A-ZÀÂÉÈÊÎÔÙÛ][a-zàâéèêîôùû]+)+)/i,
      // "\* Wissem Lallahem"
      /[*•]\s+([A-ZÀÂÉÈÊÎÔÙÛ][a-zàâéèêîôùû]+(?: [A-ZÀÂÉÈÊÎÔÙÛ][a-zàâéèêîôùû]+)+)/,
    ];

    for (const content of aiContents) {
      for (const pattern of namePatterns) {
        const match = content.match(pattern);
        if (match) {
          const resolvedName = match[1].trim();
          this.logger.debug(`Pronom résolu : "${message}" → "${resolvedName}"`);
          return message.replace(pronounPattern, `de ${resolvedName}`);
        }
      }
    }

    return message;
  }

  async processMessage(dto: ChatMessageDto): Promise<ChatResponseDto> {
    const { message, sessionId } = dto;

    const history = this.memoryService.getHistory(sessionId);

    // Résoudre les pronoms ("son email" → "email de Wissem Lallahem")
    const resolvedMessage = this.resolvePronouns(message, history);
    if (resolvedMessage !== message) {
      this.logger.log(`Pronom résolu : "${message}" → "${resolvedMessage}"`);
    }

    const response = await this.agentService.chat(resolvedMessage, history);

    // Sauvegarder le message ORIGINAL (pas le résolu) pour un contexte naturel
    this.memoryService.addExchange(sessionId, message, response);

    this.logger.log(`Session ${sessionId} — Q: "${message.substring(0, 60)}"`);

    return { response, sessionId, timestamp: new Date() };
  }

  clearHistory(sessionId: string): { success: boolean } {
    this.memoryService.clearHistory(sessionId);
    return { success: true };
  }
}