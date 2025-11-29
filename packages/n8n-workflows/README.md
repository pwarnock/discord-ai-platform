# n8n Workflows (TypeScript)

Workflow-as-code using [n8n-kit](https://github.com/Vahor/n8n-kit).

## Setup

1. Create n8n API key in n8n UI (Settings → API)
2. Add to root `.env`:
   ```
   N8N_BASE_URL=http://localhost:5678
   N8N_API_KEY=your_api_key_here
   ```

## Commands

```bash
# Import workflow from n8n to TypeScript
bun run import -- --id=<workflow-id> --out=src/<name>.ts

# Build workflows to JSON
bun run build

# Deploy workflows to n8n
bun run deploy

# Watch mode (auto-deploy on changes)
bun run watch

# Check differences between code and n8n
bun run diff
```

## Workflow Development

### Import Existing Workflow

1. Get workflow ID from n8n URL or backup filename
2. Import to TypeScript:
   ```bash
   export N8N_BASE_URL=http://localhost:5678
   export N8N_API_KEY=your_key
   bun run import -- --id=vqXm2QIwvcb0dpI4 --out=src/discord-bridge.ts
   ```

### Edit Workflow

Edit the TypeScript file in `src/`. Code nodes are inline TypeScript.

### Deploy Changes

```bash
export N8N_BASE_URL=http://localhost:5678
export N8N_API_KEY=your_key
bun run deploy
```

Changes appear immediately in n8n canvas.

## Notes

- n8n-kit import is experimental - may need manual fixes
- Code nodes in TypeScript files can be edited directly
- Deploy updates the workflow in n8n (doesn't create new)
- Use `just sync` from root to export canvas changes back to backups
