export interface Source {
  title: string;
  source: string;
  page: string | number;
}

export interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  createdAt?: Date;
  isLoading?: boolean;
}

export interface RhResponse {
  response: string;
  sources: Source[];
  timestamp: Date;
  conversationId: number;
}

export interface ConversationHistory {
  conversationId: number;
  userId: number;
  messages: Message[];
  total: number;
  createdAt: Date;
}

export interface Stats {
  totalConversations: number;
  totalMessages: number;
  userId: number;
}

// Raw API responses (avant mapping)
export interface ApiMessage {
  id: number;
  role: string;
  content: string;
  sources: ApiSource[] | null;
  createdAt: string;
}

export interface ApiSource {
  title: string;
  source: string;
  page: string | number;
}

export interface ApiConversationHistory {
  conversationId: number;
  userId: number;
  messages: ApiMessage[];
  total: number;
  createdAt: string;
}

export interface ApiRhResponse {
  response: string;
  sources: ApiSource[];
  timestamp: string;
  conversationId: number;
}

export interface ApiStats {
  totalConversations: number;
  totalMessages: number;
  userId: number;
}

export interface SidebarConversation {
  id: number;
  title: string;
  createdAt: string;
  isActive: boolean;
  isPinned: boolean;
}

export interface RhAssistantState {
  messages: Message[];
  conversationId: number | null;
  createdAt: Date | null;
  stats: Stats | null;
  status: LoadingStatus;
  historyStatus: LoadingStatus;
  statsStatus: LoadingStatus;
  error: string | null;
  inputValue: string;
  showSidebar: boolean;
}

export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';
