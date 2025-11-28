// Discord Bridge - Session ID Mapper
// Maps Discord messages to appropriate session IDs for AI chat workflow

const isDM = !$json.body.guild_id;
const authorId = $json.body.author.id;
const channelId = $json.body.channel_id;

let sessionId;

if (isDM) {
  // DMs: session per user
  sessionId = `discord-dm-${authorId}`;
} else {
  // Server: session per channel (shared conversation history)
  sessionId = `discord-server-${channelId}`;
}

return {
  json: {
    sessionId: sessionId,
    chatInput: $json.body.content,
    action: "sendMessage",
    ...($json)
  }
};
