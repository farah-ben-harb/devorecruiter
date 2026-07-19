import { ChatMessage, ChatResponse } from '../models/chatbot.model';

export class ChatbotMapper {
  static responseToMessage(response: ChatResponse): ChatMessage {
    return {
      id: crypto.randomUUID(),
      content: response.response,
      role: 'assistant',
      timestamp: new Date(response.timestamp),
    };
  }

  static userInputToMessage(content: string): ChatMessage {
    return {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      timestamp: new Date(),
    };
  }

  static loadingMessage(): ChatMessage {
    return {
      id: crypto.randomUUID(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isLoading: true,
    };
  }
}
