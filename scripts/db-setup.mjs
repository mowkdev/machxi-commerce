import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

loadEnv({ path: resolve(ROOT, '.env') });

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true, ...opts });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('>>> Installing extensions (citext, pgcrypto, btree_gist)...');
const preSql = readFileSync(resolve(ROOT, 'packages/database/sql/pre-push.sql'), 'utf8');
run('docker', ['exec', '-i', 'machxi-db', 'psql', '-U', 'postgres', '-d', 'machxi_commerce'], {
  input: preSql,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: false,
});

console.log('\n>>> Pushing schema...');
run('pnpm', ['--filter', '@repo/database', 'exec', 'drizzle-kit', 'push', '--force']);

console.log('\n>>> Applying triggers, foreign keys, and constraints...');
const postSql = readFileSync(resolve(ROOT, 'packages/database/sql/post-push.sql'), 'utf8');
run('docker', ['exec', '-i', 'machxi-db', 'psql', '-U', 'postgres', '-d', 'machxi_commerce'], {
  input: postSql,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: false,
});

console.log('\n>>> Seeding admin user...');
run('pnpm', ['--filter', '@repo/database', 'db:seed']);

console.log('\nDone. Run `pnpm dev` to start the apps.');
