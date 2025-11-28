import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { buildPayload, forwardToN8n, sendResponse, setupClient } from './index';

describe('Discord Bridge', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('buildPayload', () => {
    test('builds complete payload with all fields', () => {
      const mockMessage = {
        id: 'msg123',
        content: 'test message',
        createdTimestamp: 1234567890,
        author: {
          id: 'user123',
          username: 'testuser',
          bot: false,
          displayAvatarURL: () => 'https://avatar.url',
        },
        channel: {
          id: 'channel123',
          name: 'general',
        },
        guild: {
          id: 'guild123',
          name: 'Test Server',
        },
        attachments: new Map([
          ['att1', { url: 'https://file.url', name: 'test.png', contentType: 'image/png' }]
        ]),
        embeds: [{ toJSON: () => ({ title: 'Test' }) }],
        mentions: {
          users: new Map([['u1', { id: 'u1', username: 'user1' }]]),
          roles: new Map([['r1', { id: 'r1', name: 'role1' }]]),
        },
        reference: {
          messageId: 'ref123',
          channelId: 'channel123',
        },
      } as any;

      const payload = buildPayload('messageCreate', mockMessage);

      expect(payload.eventType).toBe('messageCreate');
      expect(payload.content).toBe('test message');
      expect(payload.messageId).toBe('msg123');
      expect(payload.author.username).toBe('testuser');
      expect(payload.channel.name).toBe('general');
      expect(payload.guild.name).toBe('Test Server');
      expect(payload.attachments).toHaveLength(1);
      expect(payload.attachments[0].url).toBe('https://file.url');
      expect(payload.embeds).toHaveLength(1);
      expect(payload.mentions.users).toHaveLength(1);
      expect(payload.mentions.roles).toHaveLength(1);
      expect(payload.reference?.messageId).toBe('ref123');
    });

    test('handles minimal message', () => {
      const mockMessage = {
        id: 'msg123',
        content: 'test',
        createdTimestamp: 1234567890,
        author: { id: 'u1', username: 'user', displayAvatarURL: () => 'url' },
        channel: { id: 'c1' },
        attachments: new Map(),
        embeds: [],
        mentions: { users: new Map(), roles: new Map() },
        reference: null,
      } as any;

      const payload = buildPayload('messageCreate', mockMessage);

      expect(payload.messageId).toBe('msg123');
      expect(payload.attachments).toHaveLength(0);
      expect(payload.reference).toBeNull();
    });
  });

  describe('sendResponse', () => {
    test('sends reply when data.reply exists', async () => {
      const mockReply = mock(() => Promise.resolve());
      const mockMessage = {
        reply: mockReply,
        channel: { send: mock() },
        react: mock(),
      } as any;

      await sendResponse(mockMessage, { reply: 'test response' });

      expect(mockReply).toHaveBeenCalledWith('test response');
      expect(mockReply).toHaveBeenCalledTimes(1);
    });

    test('sends embed when data.embed exists', async () => {
      const mockSend = mock(() => Promise.resolve());
      const mockMessage = {
        reply: mock(),
        channel: { send: mockSend },
        react: mock(),
      } as any;

      const embed = { title: 'Test', description: 'Test embed' };
      await sendResponse(mockMessage, { embed });

      expect(mockSend).toHaveBeenCalledWith({ embeds: [embed] });
    });

    test('adds reaction when data.reaction exists', async () => {
      const mockReact = mock(() => Promise.resolve());
      const mockMessage = {
        reply: mock(),
        channel: { send: mock() },
        react: mockReact,
      } as any;

      await sendResponse(mockMessage, { reaction: '👍' });

      expect(mockReact).toHaveBeenCalledWith('👍');
    });

    test('sends file when data.fileUrl exists', async () => {
      const mockSend = mock(() => Promise.resolve());
      const mockMessage = {
        reply: mock(),
        channel: { send: mockSend },
        react: mock(),
      } as any;

      await sendResponse(mockMessage, { fileUrl: 'https://file.url/image.png' });

      expect(mockSend).toHaveBeenCalledWith({ files: ['https://file.url/image.png'] });
    });

    test('handles multiple response types', async () => {
      const mockReply = mock(() => Promise.resolve());
      const mockReact = mock(() => Promise.resolve());
      const mockMessage = {
        reply: mockReply,
        channel: { send: mock() },
        react: mockReact,
      } as any;

      await sendResponse(mockMessage, { reply: 'text', reaction: '✅' });

      expect(mockReply).toHaveBeenCalledTimes(1);
      expect(mockReact).toHaveBeenCalledTimes(1);
    });
  });

  describe('forwardToN8n', () => {
    test('sends payload to webhook', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ reply: 'response' }),
        })
      );
      global.fetch = mockFetch as any;

      const mockMessage = {
        id: 'msg123',
        content: 'test',
        createdTimestamp: 123,
        author: { id: 'u1', username: 'user', displayAvatarURL: () => 'url' },
        channel: { id: 'c1' },
        attachments: new Map(),
        embeds: [],
        mentions: { users: new Map(), roles: new Map() },
        reference: null,
        reply: mock(() => Promise.resolve()),
      } as any;

      await forwardToN8n('messageCreate', mockMessage, 'http://test.webhook');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe('http://test.webhook');
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.eventType).toBe('messageCreate');
      expect(body.content).toBe('test');
    });

    test('handles fetch errors gracefully', async () => {
      const mockFetch = mock(() => Promise.reject(new Error('Network error')));
      global.fetch = mockFetch as any;

      const mockMessage = {
        id: 'msg123',
        content: 'test',
        createdTimestamp: 123,
        author: { id: 'u1', username: 'user', displayAvatarURL: () => 'url' },
        channel: { id: 'c1' },
        attachments: new Map(),
        embeds: [],
        mentions: { users: new Map(), roles: new Map() },
        reference: null,
      } as any;

      await forwardToN8n('messageCreate', mockMessage, 'http://test.webhook');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('skips response for non-messageCreate events', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ reply: 'response' }),
        })
      );
      global.fetch = mockFetch as any;

      const mockReply = mock(() => Promise.resolve());
      const mockMessage = {
        id: 'msg123',
        content: 'test',
        createdTimestamp: 123,
        author: { id: 'u1', username: 'user', displayAvatarURL: () => 'url' },
        channel: { id: 'c1' },
        attachments: new Map(),
        embeds: [],
        mentions: { users: new Map(), roles: new Map() },
        reference: null,
        reply: mockReply,
      } as any;

      await forwardToN8n('messageDelete', mockMessage, 'http://test.webhook');

      expect(mockReply).not.toHaveBeenCalled();
    });
  });

  describe('setupClient', () => {
    test('registers messageCreate handler', () => {
      const mockOn = mock();
      const mockClient = { on: mockOn } as any;

      setupClient(mockClient);

      expect(mockOn).toHaveBeenCalledTimes(3);
      expect(mockOn.mock.calls[0][0]).toBe('messageCreate');
      expect(mockOn.mock.calls[1][0]).toBe('messageUpdate');
      expect(mockOn.mock.calls[2][0]).toBe('messageDelete');
    });

    test('messageCreate handler ignores bot messages', async () => {
      let messageHandler: any;
      const mockClient = {
        on: (event: string, handler: any) => {
          if (event === 'messageCreate') messageHandler = handler;
        },
      } as any;

      setupClient(mockClient);

      const mockFetch = mock();
      global.fetch = mockFetch as any;

      const botMessage = {
        author: { bot: true },
      } as any;

      await messageHandler(botMessage);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('messageCreate handler processes user messages', async () => {
      let messageHandler: any;
      const mockClient = {
        on: (event: string, handler: any) => {
          if (event === 'messageCreate') messageHandler = handler;
        },
      } as any;

      setupClient(mockClient);

      const mockFetch = mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({}),
        })
      );
      global.fetch = mockFetch as any;

      const userMessage = {
        id: 'msg123',
        content: 'test',
        createdTimestamp: 123,
        author: { 
          bot: false, 
          id: 'u1', 
          username: 'user', 
          displayAvatarURL: () => 'url' 
        },
        channel: { id: 'c1' },
        attachments: new Map(),
        embeds: [],
        mentions: { users: new Map(), roles: new Map() },
        reference: null,
      } as any;

      // Set N8N_WEBHOOK for this test
      process.env.N8N_WEBHOOK = 'http://test.webhook';
      
      await messageHandler(userMessage);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Clean up
      delete process.env.N8N_WEBHOOK;
    });
  });
});
