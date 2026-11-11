import { Injectable } from '@nestjs/common';
import { ChatMessageDto, ChatResponseDto } from '../dtos/chat-message.dto';
import { AgentService } from './agent.service';
import { MemoryService } from './memory.service';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly agentService: AgentService,
    private readonly memoryService: MemoryService,
  ) {}

  // ── Résolution des pronoms depuis le chat_history ─────────────────────────
  private resolvePronouns(message: string, history: any[]): string {
    const pronounPattern =
      /\b(son|sa|ses|leur|il|elle|ce candidat|ce cv|lui)\b/i;
    if (!pronounPattern.test(message)) return message;

    // Chercher le dernier nom mentionné dans les réponses IA
    const aiContents = history
      .filter((m) => {
        const ids: string[] = m?.id ?? [];
        return ids.includes('AIMessage') || ids.includes('AIMessageChunk');
      })
      .map((m) => m?.kwargs?.content as string)
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
          return message.replace(pronounPattern, `de ${resolvedName}`);
        }
      }
    }

    return message;
  }

  async processMessage(
    dto: ChatMessageDto,
    userId: number,
  ): Promise<ChatResponseDto> {
    const { message, sessionId } = dto;
    const scopedSessionId = this.getScopedSessionId(userId, sessionId);

    const history = this.memoryService.getHistory(scopedSessionId);

    // Résoudre les pronoms ("son email" → "email de Wissem Lallahem")
    const resolvedMessage = this.resolvePronouns(message, history);

    const response = await this.agentService.chat(resolvedMessage, history);

    // Sauvegarder le message ORIGINAL (pas le résolu) pour un contexte naturel
    this.memoryService.addExchange(scopedSessionId, message, response);

    return { response, sessionId, timestamp: new Date() };
  }

  clearHistory(sessionId: string, userId: number): { success: boolean } {
    this.memoryService.clearHistory(this.getScopedSessionId(userId, sessionId));
    return { success: true };
  }

  private getScopedSessionId(userId: number, sessionId: string): string {
    return `user:${userId}:session:${sessionId}`;
  }
}
