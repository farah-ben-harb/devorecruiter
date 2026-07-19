export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}
//conversation
export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isPinned: boolean;
  _persisted?: boolean;
}

export interface ConversationGroup {
  label: string;
  conversations: Conversation[];
  isPinnedGroup?: boolean;
}

export interface ConversationResponse {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
