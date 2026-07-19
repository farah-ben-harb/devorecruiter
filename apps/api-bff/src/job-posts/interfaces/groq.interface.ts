// groq.interface.ts

export interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | GroqMessageContentPart[];
}

export interface GroqMessageContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface GroqChoice {
  message: {
    content: string;
  };
}

export interface GroqResponse {
  choices: GroqChoice[];
}

export interface GroqRequestBody {
  model: string;
  messages: GroqMessage[];
  temperature: number;
}
