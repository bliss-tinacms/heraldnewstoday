import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const candidates = [
  process.env.SITE_ENV_FILE,
  resolve(appDir, '.env'),
  resolve(process.cwd(), '.env'),
].filter(Boolean);

for (const envFile of [...new Set(candidates)]) {
  if (!existsSync(envFile)) continue;
  const content = readFileSync(envFile, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
  break;
}

const { startServer } = await import('./dist/server/entry.mjs');

startServer();
