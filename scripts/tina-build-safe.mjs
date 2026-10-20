#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { sanitizeGeneratedClient } from './sanitize-generated-client.mjs';

const local = process.argv.includes('--local');
const run = (args, env = process.env) => spawnSync('pnpm', ['exec', 'tinacms', ...args], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
const astroRuntimeEnv = (env = process.env) => {
  const clean = { ...env };
  for (const key of Object.keys(clean)) {
    // No Tina content token belongs in a compiled browser/server bundle, even
    // when a hosting environment exposes legacy public-prefixed aliases.
    if (key === 'TINA_TOKEN' || (/TINA/.test(key) && /TOKEN/.test(key))) {
      delete clean[key];
    }
  }
  return clean;
};
const runAstro = (env = process.env) => spawnSync('pnpm', ['exec', 'astro', 'build'], {
  stdio: 'inherit',
  env: astroRuntimeEnv(env),
  shell: process.platform === 'win32',
});

let status = 1;
try {
  if (local) {
    const generated = run(['build', '--local', '--skip-cloud-checks', '--noTelemetry', '-c', 'node --version']);
    if ((generated.status ?? 1) !== 0) {
      status = generated.status ?? 1;
    } else {
      // Tina writes the build token into its generated server client. Remove it
      // before Astro bundles that client into dist/server.
      sanitizeGeneratedClient();
      status = runAstro().status ?? 1;
    }
  } else {
    // A same-origin proxy is correct for the deployed editor, but Tina's schema
    // status endpoint must be checked directly against Tina Cloud first.
    const cloudEnv = { ...process.env, TINA_DIRECT_CLOUD_CHECK: '1' };
    const cloudCheck = run(['build', '--noTelemetry', '-c', 'node --version'], cloudEnv);
    if ((cloudCheck.status ?? 1) !== 0) {
      status = cloudCheck.status ?? 1;
    } else {
      // Regenerate the deployed editor with its configured same-origin proxy,
      // but do not let Tina invoke Astro until the generated server client has
      // been scrubbed of build-time credentials.
      const generated = run(
        ['build', '--skip-cloud-checks', '--noTelemetry', '-c', 'node --version'],
        astroRuntimeEnv(),
      );
      if ((generated.status ?? 1) !== 0) {
        status = generated.status ?? 1;
      } else {
        sanitizeGeneratedClient();
        status = runAstro().status ?? 1;
      }
    }
  }
} finally {
  sanitizeGeneratedClient();
}
process.exit(status);
