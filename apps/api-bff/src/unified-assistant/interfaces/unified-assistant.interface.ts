export type AssistantMode = 'it' | 'rh' | 'db';

export interface UnifiedChatResponse {
  content: string;
  title?: string;
  mode: AssistantMode;
  sources?: { title: string; source: string; page: string | number }[];
  conversationId?: string | number;
}