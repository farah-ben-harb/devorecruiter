export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  sessionId: string;
  error: string | null;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  timestamp: string;
}
