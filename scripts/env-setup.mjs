/**
 * Copies .env.example → .env (and .env.local.example → .env.local) for every
 * app that ships an example file. Existing files are never overwritten so
 * local customisations are preserved.
 *
 * Run once after cloning: pnpm env:setup
 */

import { copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PAIRS = [
  { from: '.env.example',                        to: '.env' },
  { from: 'apps/api/.env.example',               to: 'apps/api/.env' },
  { from: 'apps/admin/.env.example',             to: 'apps/admin/.env' },
  { from: 'apps/worker/.env.example',            to: 'apps/worker/.env' },
  { from: 'apps/storefront/.env.local.example',  to: 'apps/storefront/.env.local' },
];

let copied = 0;
let skipped = 0;

for (const { from, to } of PAIRS) {
  const src  = resolve(ROOT, from);
  const dest = resolve(ROOT, to);

  if (!existsSync(src)) {
    console.log(`  skip   ${from}  (example not found)`);
    skipped++;
    continue;
  }

  if (existsSync(dest)) {
    console.log(`  exists ${to}`);
    skipped++;
    continue;
  }

  copyFileSync(src, dest);
  console.log(`  copied ${from}  →  ${to}`);
  copied++;
}

console.log(`\nDone. ${copied} created, ${skipped} already present.`);

if (copied > 0) {
  console.log('\nNext: review apps/api/.env and set AUTH_SECRET to a real secret:');
  console.log('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
}
