import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const envPath = resolve(ROOT, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set. Check your .env file.');
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true, ...opts });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('>>> Pushing schema...');
run('pnpm', ['--filter', '@repo/database', 'db:push']);

console.log('\n>>> Applying custom SQL...');
const sql = readFileSync(resolve(ROOT, 'packages/database/migrations/custom.sql'), 'utf8');
run('docker', ['exec', '-i', 'machxi-db', 'psql', '-U', 'postgres', '-d', 'machxi_commerce'], {
  input: sql,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: false,
});

console.log('\nDone.');
