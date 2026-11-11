import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AgentService } from './agent.service';
import { createDbQueryTool, createSearchTool } from '../tools/db-query.tool';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, toolCallLimitMiddleware } from 'langchain';

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn(),
}));

jest.mock('langchain', () => ({
  createAgent: jest.fn(),
  toolCallLimitMiddleware: jest.fn(),
}));

jest.mock('../tools/db-query.tool', () => ({
  createDbQueryTool: jest.fn(() => ['query-tool', 'joined-query-tool']),
  createSearchTool: jest.fn(() => 'search-tool'),
}));

describe('AgentService LangChain v1 integration', () => {
  const createAgentMock = jest.mocked(createAgent);
  const toolCallLimitMiddlewareMock = jest.mocked(toolCallLimitMiddleware);
  const chatOpenAIMock = jest.mocked(ChatOpenAI);
  const createDbQueryToolMock = jest.mocked(createDbQueryTool);
  const createSearchToolMock = jest.mocked(createSearchTool);
  const invokeMock = jest.fn();

  let service: AgentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({
      messages: [{ content: 'Réponse de test' }],
    });
    chatOpenAIMock.mockImplementation((options) => options as never);
    toolCallLimitMiddlewareMock.mockReturnValue({} as never);
    createAgentMock.mockReturnValue({ invoke: invokeMock } as never);

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'fictional-test-key';
        if (key === 'OPENAI_BASE_URL') return 'https://fictional.test/v1';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new AgentService({} as DataSource, configService);
    await service.onModuleInit();
  });

  it('builds the v1 agent with the SQL/search tools and bounded tool calls', async () => {
    const history = [
      new HumanMessage('Question précédente'),
    ] as BaseMessage[];

    await service.chat('Combien de candidats ?', history);

    expect(createDbQueryToolMock).toHaveBeenCalledTimes(1);
    expect(createSearchToolMock).toHaveBeenCalledTimes(1);
    expect(toolCallLimitMiddlewareMock).toHaveBeenCalledWith({
      runLimit: 5,
      exitBehavior: 'continue',
    });
    expect(createAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: expect.stringContaining('DevoRecruiter'),
        tools: ['query-tool', 'joined-query-tool', 'search-tool'],
        middleware: [{}],
      }),
    );

    const invocation = invokeMock.mock.calls[0][0] as {
      messages: BaseMessage[];
    };
    expect(invocation.messages).toHaveLength(2);
    expect(invocation.messages[0]).toBe(history[0]);
    expect(invocation.messages[1]).toBeInstanceOf(HumanMessage);
    expect(invocation.messages[1].content).toBe('Combien de candidats ?');
  });

  it('returns text from string and structured message content', async () => {
    invokeMock
      .mockResolvedValueOnce({ messages: [{ content: 'Réponse simple' }] })
      .mockResolvedValueOnce({
        messages: [{
          content: [
            { type: 'text', text: 'Réponse ' },
            { type: 'text', text: 'structurée' },
          ],
        }],
      });

    await expect(service.chat('Question 1', [])).resolves.toBe('Réponse simple');
    await expect(service.chat('Question 2', [])).resolves.toBe('Réponse structurée');
  });

  it('rotates to the next model after a rate-limit response', async () => {
    invokeMock
      .mockRejectedValueOnce(new Error('429 fictional rate limit'))
      .mockResolvedValueOnce({ messages: [{ content: 'Réponse après rotation' }] });

    await expect(service.chat('Question limitée', [])).resolves.toBe(
      'Réponse après rotation',
    );
    expect(createAgentMock).toHaveBeenCalledTimes(2);
  });

  it('keeps unexpected provider errors out of the response contract', async () => {
    invokeMock.mockRejectedValue(new Error('fictional provider failure'));

    await expect(service.chat('Question en erreur', [])).rejects.toThrow(
      'fictional provider failure',
    );
  });
});
