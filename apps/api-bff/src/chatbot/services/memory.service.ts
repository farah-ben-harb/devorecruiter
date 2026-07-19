import { Injectable } from '@nestjs/common';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

@Injectable()
export class MemoryService {
  // Map sessionId → historique de messages
  private readonly sessions = new Map<string, BaseMessage[]>();

  getHistory(sessionId: string): BaseMessage[] {
    return this.sessions.get(sessionId) ?? [];
  }

  addExchange(sessionId: string, userMessage: string, assistantMessage: string): void {
    const history = this.getHistory(sessionId);
    history.push(new HumanMessage(userMessage));
    history.push(new AIMessage(assistantMessage));
    this.sessions.set(sessionId, history);
  }

  clearHistory(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}