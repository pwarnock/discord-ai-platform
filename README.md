# n8n Discord Integration

A production-ready Discord bot integrated with n8n workflows for AI-powered chat automation. Built with TypeScript, Bun, and Turborepo.

## Features

- 🤖 **Discord Bot Bridge** - Forwards Discord messages to n8n workflows
- 🧠 **AI Chat Integration** - Channel-aware conversation memory with session management
- 📊 **Distributed Tracing** - OpenTelemetry + Jaeger for observability
- 📝 **Structured Logging** - Pino logger with configurable log levels
- 🔄 **Workflow as Code** - n8n-kit for TypeScript-based workflow development
- ⚡ **Turborepo Monorepo** - Parallel builds with intelligent caching
- ✅ **Pre-commit Hooks** - Automated testing before commits
- 🛠️ **Just Task Runner** - Simple command orchestration

## Architecture

```
packages/
├── discord-bot/        # Discord.js bot with n8n webhook integration
└── n8n-workflows/      # n8n workflows as TypeScript code
```

### Session Management

- **Server channels**: `discord-server-{channelId}` - Shared conversation history per channel
- **Direct messages**: `discord-dm-{userId}` - Private conversation per user

## Prerequisites

- [Bun](https://bun.sh) >= 1.3.3
- [Docker](https://www.docker.com/) & Docker Compose
- [Just](https://github.com/casey/just) (optional, for task runner)
- Discord Bot Token
- n8n API Key (for workflow deployment)

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd n8n_local
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DISCORD_BOT_TOKEN=your_discord_bot_token
TEST_CHANNEL_ID=your_test_channel_id
N8N_API_KEY=your_n8n_api_key
```

### 3. Start Services

```bash
# Using Just
just up

# Or using Docker Compose
docker-compose up -d
```

### 4. Run Tests

```bash
# Using Just
just test

# Or using Bun
bun run test
```

## Available Commands

### Just Commands

```bash
just                    # List all commands
just test               # Run all tests
just build              # Build all packages
just up                 # Start services
just down               # Stop services
just logs [service]     # View logs
just backup             # Backup workflows (timestamped)
just backup-latest      # Backup to latest/
just deploy-all         # Full pipeline: backup → build → deploy
just dev                # Development mode with watch
just test-webhook       # Test Discord webhook
```

### Turborepo Commands

```bash
bun run test            # Run tests in all packages
bun run build           # Build all packages
bun run deploy          # Deploy workflows to n8n
```

### n8n Workflow Management

```bash
# Export workflows
docker exec -it n8n n8n export:workflow --backup --output=backups/latest/

# Import workflow to TypeScript
cd packages/n8n-workflows
bun run import -- --workflow-id=<id> --output=src/workflow.ts

# Deploy workflows
bun run deploy

# Watch mode for development
bun run watch
```

## Development

### Project Structure

```
.
├── packages/
│   ├── discord-bot/              # Discord bot package
│   │   ├── index.ts              # Main bot logic
│   │   ├── logger.ts             # Pino logger setup
│   │   ├── tracing.ts            # OpenTelemetry config
│   │   └── index.test.ts         # Bun tests
│   └── n8n-workflows/            # n8n workflows package
│       ├── src/                  # TypeScript workflows
│       └── n8n-kit.config.ts     # n8n-kit configuration
├── code-nodes/                   # Extracted code node scripts
├── backups/                      # n8n workflow exports
│   ├── latest/                   # Latest backup
│   └── YYYYMMDD-HHMMSS/         # Timestamped backups
├── compose.yaml                  # Docker Compose config
├── turbo.json                    # Turborepo pipeline
├── justfile                      # Just task definitions
└── README.md
```

### Adding New Workflows

1. Create workflow in n8n UI
2. Export to TypeScript:
   ```bash
   just import <workflow-id>
   ```
3. Edit TypeScript in `packages/n8n-workflows/src/`
4. Deploy:
   ```bash
   just deploy-all
   ```

### Running Tests

Tests run automatically on pre-commit. To run manually:

```bash
just test
```

Discord bot tests are in `packages/discord-bot/index.test.ts`.

## Observability

### Jaeger Tracing

Access Jaeger UI at http://localhost:16686

Traces show:
- Discord message flow
- n8n webhook calls
- AI agent interactions
- Response handling

### Logs

View logs with:

```bash
just logs              # All services
just logs discord-bot  # Discord bot only
just logs n8n          # n8n only
```

Log levels: `error`, `warn`, `info`, `debug`, `trace`

Set via `LOG_LEVEL` environment variable.

## Deployment

### Backup Before Deploy

```bash
just backup
```

### Full Deployment Pipeline

```bash
just deploy-all
```

This runs:
1. Backup current workflows
2. Build all packages
3. Deploy to n8n

### Manual Deployment

```bash
just build
cd packages/n8n-workflows
bun run deploy
```

## Testing Discord Integration

### Test Webhook

```bash
just test-webhook "Hello from test"
```

### Manual Test

```bash
curl -X POST http://localhost:5678/webhook-test/discord \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test message",
    "author": {"id": "123456789"},
    "guild": {"id": "987654321"}
  }'
```

## Troubleshooting

### Discord Bot Not Responding

1. Check bot is running: `docker ps`
2. View logs: `just logs discord-bot`
3. Verify webhook URL in bot config
4. Test webhook: `just test-webhook`

### n8n Workflow Issues

1. Check workflow is active in n8n UI
2. View execution logs in n8n
3. Verify API key is set: `echo $N8N_API_KEY`
4. Re-export workflows: `just backup-latest`

### Tests Failing

1. Ensure services are running: `just up`
2. Check test output: `just test`
3. Run specific package tests:
   ```bash
   cd packages/discord-bot
   bun test
   ```

## Contributing

1. Create a feature branch
2. Make changes
3. Tests run automatically on commit (pre-commit hook)
4. Push and create PR

## License

MIT

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Bot Framework**: [Discord.js](https://discord.js.org)
- **Workflow Engine**: [n8n](https://n8n.io)
- **Workflow as Code**: [n8n-kit](https://github.com/Vahor/n8n-kit)
- **Monorepo**: [Turborepo](https://turbo.build)
- **Task Runner**: [Just](https://github.com/casey/just)
- **Tracing**: [OpenTelemetry](https://opentelemetry.io) + [Jaeger](https://www.jaegertracing.io)
- **Logging**: [Pino](https://getpino.io)
- **Git Hooks**: [Husky](https://typicode.github.io/husky) + [lint-staged](https://github.com/okonet/lint-staged)
