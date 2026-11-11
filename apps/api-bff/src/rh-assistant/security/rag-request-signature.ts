import { createHmac, randomUUID } from 'node:crypto';

export type RagAction = 'chat' | 'reset';

export const RAG_REQUEST_MAX_SKEW_SECONDS = 60;

type RagRequestSignatureInput = {
  action: RagAction;
  question?: string;
  secret: string;
  sessionId: string;
  requestId?: string;
  timestamp?: number;
  userId: number;
};

function canonicalPayload(
  action: RagAction,
  timestamp: number,
  userId: number,
  sessionId: string,
  question: string,
  requestId: string,
): string {
  return [action, timestamp, userId, sessionId, requestId, question].join('\n');
}

export function createRagRequestHeaders({
  action,
  question = '',
  secret,
  sessionId,
  requestId = randomUUID(),
  timestamp = Math.floor(Date.now() / 1000),
  userId,
}: RagRequestSignatureInput): Record<string, string> {
  if (!secret || secret.length < 32) {
    throw new Error('RAG internal authentication is not configured');
  }

  if (!Number.isInteger(userId) || userId <= 0 || !sessionId) {
    throw new Error('Invalid RAG request identity');
  }

  const payload = canonicalPayload(
    action,
    timestamp,
    userId,
    sessionId,
    question,
    requestId,
  );
  const signature = createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return {
    'x-rag-action': action,
    'x-rag-user-id': String(userId),
    'x-rag-session-id': sessionId,
    'x-rag-request-id': requestId,
    'x-rag-timestamp': String(timestamp),
    'x-rag-signature': signature,
  };
}
