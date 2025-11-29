import { defineConfig } from '@vahor/n8n-kit-cli';

export default defineConfig({
  n8n: {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
  },
  workflows: {
    input: './src',
    output: './dist',
  },
});
