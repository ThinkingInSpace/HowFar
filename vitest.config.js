import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
export default defineConfig({ plugins: [cloudflareTest({ wrangler: { configPath: './research/wrangler.jsonc' } })], test: { include: ['research/*.spec.js'] } });
