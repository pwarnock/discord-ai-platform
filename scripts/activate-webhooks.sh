#!/bin/bash
set -e

source .env

echo "Waiting for n8n..."
until curl -sf http://localhost:5678/healthz > /dev/null 2>&1; do
  sleep 1
done
sleep 2

echo "Deactivating workflow..."
curl -s -X PATCH "http://localhost:5678/api/v1/workflows/31ItqYUTCTrPXefj" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}' > /dev/null

sleep 1

echo "Activating workflow..."
curl -s -X PATCH "http://localhost:5678/api/v1/workflows/31ItqYUTCTrPXefj" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}' > /dev/null

sleep 1

echo "Testing webhook..."
if curl -sf -X POST http://localhost:5678/webhook/discord \
  -H "Content-Type: application/json" \
  -d '{"eventType":"test"}' > /dev/null 2>&1; then
  echo "✓ Webhook registered successfully"
else
  echo "✗ Webhook registration failed"
  exit 1
fi
