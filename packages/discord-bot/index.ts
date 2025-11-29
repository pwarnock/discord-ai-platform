import { Client, GatewayIntentBits, Message, PartialMessage, Partials } from 'discord.js';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import logger from './logger';

const tracer = trace.getTracer('discord-bridge');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.BOT_TOKEN;

export function buildPayload(eventType: string, message: Message | PartialMessage) {
  return {
    eventType,
    content: message.content,
    messageId: message.id,
    timestamp: message.createdTimestamp,
    author: {
      id: message.author?.id,
      username: message.author?.username,
      avatar: message.author?.displayAvatarURL(),
    },
    channel: {
      id: message.channel?.id,
      name: message.channel && 'name' in message.channel ? message.channel.name : null,
    },
    guild: {
      id: message.guild?.id,
      name: message.guild?.name,
    },
    attachments: Array.from(message.attachments?.values() || []).map(a => ({
      url: a.url,
      name: a.name,
      contentType: a.contentType,
    })),
    stickers: Array.from(message.stickers?.values() || []).map(s => ({
      id: s.id,
      name: s.name,
      url: s.url,
    })),
    embeds: message.embeds?.map(e => e.toJSON()) || [],
    mentions: {
      users: Array.from(message.mentions?.users?.values() || []).map(u => ({ id: u.id, username: u.username })),
      roles: Array.from(message.mentions?.roles?.values() || []).map(r => ({ id: r.id, name: r.name })),
    },
    reference: message.reference ? {
      messageId: message.reference.messageId,
      channelId: message.reference.channelId,
    } : null,
  };
}

export async function sendResponse(message: Message, data: any) {
  return tracer.startActiveSpan('sendResponse', async (span) => {
    try {
      if (data.reply) {
        await message.reply(data.reply);
        span.addEvent('sent_reply', { content: data.reply });
        logger.info({ reply: data.reply }, 'Sent reply');
      }
      if (data.embed) {
        await message.channel.send({ embeds: [data.embed] });
        span.addEvent('sent_embed');
        logger.info('Sent embed');
      }
      if (data.reaction) {
        await message.react(data.reaction);
        span.addEvent('added_reaction', { reaction: data.reaction });
        logger.info({ reaction: data.reaction }, 'Added reaction');
      }
      if (data.fileUrl) {
        await message.channel.send({ files: [data.fileUrl] });
        span.addEvent('sent_file', { url: data.fileUrl });
        logger.info({ fileUrl: data.fileUrl }, 'Sent file');
      }
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error as Error);
      logger.error({ error }, 'Failed to send response');
      throw error;
    } finally {
      span.end();
    }
  });
}

export async function forwardToN8n(eventType: string, message: Message | PartialMessage, webhookUrl?: string) {
  return tracer.startActiveSpan('forwardToN8n', async (span) => {
    // Determine webhook URL
    let webhook = webhookUrl;
    if (!webhook) {
      const testChannelId = process.env.TEST_CHANNEL_ID;
      const isTestChannel = testChannelId && message.channel?.id === testChannelId;
      webhook = isTestChannel 
        ? process.env.N8N_WEBHOOK_TEST 
        : process.env.N8N_WEBHOOK;
    }
    
    span.setAttributes({
      'event.type': eventType,
      'message.id': message.id,
      'author.username': message.author?.username || 'unknown',
      'channel.id': message.channel?.id || 'unknown',
    });

    if (!webhook) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'N8N_WEBHOOK not defined' });
      span.addEvent('webhook_not_configured');
      span.end();
      logger.error('N8N_WEBHOOK is not defined');
      return;
    }

    const payload = buildPayload(eventType, message);
    
    logger.info({ 
      eventType, 
      messageId: message.id,
      author: message.author?.username 
    }, 'Forwarding to n8n');
    
    logger.debug({ payload }, 'Full payload');
    span.addEvent('forwarding_to_webhook', { 
      webhook, 
      eventType,
      content: message.content || '',
      author: message.author?.username || 'unknown',
      hasAttachments: (message.attachments?.size || 0) > 0,
      hasStickers: (message.stickers?.size || 0) > 0,
      hasEmbeds: (message.embeds?.length || 0) > 0
    });

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      span.setAttribute('http.status_code', response.status);
      span.addEvent('webhook_response', { 
        status: response.status 
      });
      
      logger.info({ status: response.status }, 'n8n responded');

      const data = await response.json();
      
      span.addEvent('response_data', {
        hasReply: !!data.reply,
        hasEmbed: !!data.embed,
        hasReaction: !!data.reaction,
        hasFile: !!data.fileUrl
      });
      
      logger.debug({ data }, 'Response data');

      if (eventType === 'messageCreate' && message instanceof Message) {
        await sendResponse(message, data);
      }

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error as Error);
      span.addEvent('webhook_error', { error: String(error) });
      logger.error({ error, eventType }, 'Error forwarding to n8n');
    } finally {
      span.end();
    }
  });
}

export function setupClient(client: Client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    logger.info({ 
      author: message.author.username, 
      content: message.content,
      messageId: message.id 
    }, 'Received message');
    await forwardToN8n('messageCreate', message);
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.author?.bot) return;
    logger.info({ 
      author: newMessage.author?.username,
      messageId: newMessage.id 
    }, 'Message edited');
    await forwardToN8n('messageUpdate', newMessage);
  });

  client.on('messageDelete', async (message) => {
    if (message.author?.bot) return;
    logger.info({ 
      author: message.author?.username,
      messageId: message.id 
    }, 'Message deleted');
    await forwardToN8n('messageDelete', message);
  });
}

if (import.meta.main) {
  // Initialize tracing first
  await import('./tracing');
  
  if (!BOT_TOKEN) {
    throw new Error('Missing DISCORD_BOT_TOKEN');
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  setupClient(client);
  
  client.once('clientReady', () => {
    logger.info({ user: client.user?.tag }, 'Bot logged in and ready');
  });
  
  client.on('error', (error) => {
    logger.error({ error }, 'Discord client error');
  });
  
  await client.login(BOT_TOKEN);
  logger.info('Discord bridge running...');
}
