// ─── Modes ───────────────────────────────────────────────────────────────────
export type AssistantMode = 'it' | 'rh';
export type MessageRole = 'user' | 'assistant';
export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Source (RH) ─────────────────────────────────────────────────────────────
export interface Source {
  title: string;
  source: string;
  page: string | number;
}

// ─── Message unifié ───────────────────────────────────────────────────────────
export interface UnifiedMessage {
  id?: string | number;
  role: MessageRole;
  content: string;
  timestamp: Date;
  mode?: AssistantMode;
  sources?: Source[];
  isLoading?: boolean;
}

// ─── Conversation unifiée (sidebar unique) ────────────────────────────────────
export interface UnifiedConversation {
  id: string | number;
  title: string;
  mode: AssistantMode;
  createdAt: Date;
  updatedAt?: Date;
  isPinned: boolean;
  isActive?: boolean;
}

// ─── État global simplifié ────────────────────────────────────────────────────
export interface UnifiedAssistantState {
  detectedMode: AssistantMode | null;
  conversations: UnifiedConversation[];
  activeConversationId: string | number | null;
  currentMessages: UnifiedMessage[];
  status: LoadingStatus;
  error: string | null;
  showSidebar: boolean;
}

// ─── API responses ────────────────────────────────────────────────────────────
export interface ApiUnifiedChatResponse {
  content: string;
  title?: string;
  mode: AssistantMode;
  sources?: Source[];
  conversationId?: string | number;
}

export interface ApiStreamEvent {
  chunk?: string;
  title?: string;
  done?: boolean;
  mode?: AssistantMode;
  sources?: Source[];
  conversationId?: string | number;
}

export interface ApiItConversation {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiItMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface ApiRhMessage {
  id: number;
  role: string;
  content: string;
  sources: Source[] | null;
  createdAt: string;
}

export interface RhSidebarConversation {
  id: number;
  title: string;
  createdAt: string;
  isActive: boolean;
  isPinned: boolean;
}
