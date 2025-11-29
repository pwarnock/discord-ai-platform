# n8n Discord Integration - Task Runner

# Default recipe (show available commands)
default:
    @just --list

# Run all tests
test:
    bun run test

# Build all packages
build:
    bun run build

# Start all services
up:
    docker-compose up -d
    docker-compose -f observability-compose.yaml up -d

# Stop all services
down:
    docker-compose down

# Restart all services
restart:
    docker-compose restart

# View logs
logs service="":
    #!/usr/bin/env bash
    if [ -z "{{service}}" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f {{service}}
    fi

# Backup n8n workflows with timestamp
backup:
    #!/usr/bin/env bash
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    docker exec n8n n8n export:workflow --backup --output=backups/$TIMESTAMP/
    echo "Backed up to backups/$TIMESTAMP/"

# Backup to latest (overwrites)
backup-latest:
    docker exec n8n n8n export:workflow --backup --output=backups/latest/

# Import workflow from n8n to TypeScript
import workflow_id:
    cd packages/n8n-workflows && bun run import -- --workflow-id={{workflow_id}} --output=src/{{workflow_id}}.ts

# Deploy workflows to n8n
deploy:
    cd packages/n8n-workflows && bun run deploy

# Watch mode for workflow development
watch:
    cd packages/n8n-workflows && bun run watch

# Full deployment pipeline: backup → build → deploy
deploy-all: backup-latest build deploy
    @echo "✅ Deployment complete"

# Development mode: start services + watch workflows
dev:
    #!/usr/bin/env bash
    just up
    sleep 3
    cd packages/n8n-workflows && bun run watch

# Clean build artifacts
clean:
    rm -rf packages/*/dist
    rm -rf .turbo

# Test Discord webhook
test-webhook message="Hello from Just":
    curl -X POST http://localhost:5678/webhook-test/discord \
      -H "Content-Type: application/json" \
      -d '{"content": "{{message}}", "author": {"id": "123456789"}, "guild": {"id": "987654321"}}'

# Check for workflow changes and prompt to sync
sync:
    #!/usr/bin/env bash
    echo "🔍 Checking for workflow changes..."
    cd packages/n8n-workflows
    if bun run diff 2>&1 | grep -q "No differences found\|No workflows"; then
        echo "✅ No changes detected"
    else
        echo ""
        echo "📝 Changes detected in n8n workflows"
        read -p "Export changes to backups/latest/? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd ../..
            just backup-latest
            echo "✅ Workflows synced"
        else
            echo "⏭️  Skipped sync"
        fi
    fi

# Delete workflow by ID (backs up first)
delete-workflow workflow_id:
    #!/usr/bin/env bash
    set -a
    source .env
    set +a
    echo "🔄 Backing up before delete..."
    just backup
    echo "🗑️  Deleting workflow {{workflow_id}}..."
    curl -X DELETE http://localhost:5678/api/v1/workflows/{{workflow_id}} \
      -H "X-N8N-API-KEY: ${N8N_API_KEY}"
    echo ""
    echo "✅ Workflow deleted"
    echo "🔄 Syncing backups..."
    just backup-latest

# Activate n8n webhooks after restart
activate-webhooks:
    ./scripts/activate-webhooks.sh
