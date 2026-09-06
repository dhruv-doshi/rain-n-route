#!/usr/bin/env node
/**
 * Generate PWA icons from public/icon.svg.
 * Uses sharp from the pnpm dependency tree.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const sharp = require(join(root, 'node_modules/.pnpm/sharp@0.34.5/node_modules/sharp'));
const svg = readFileSync(join(root, 'public/icon.svg'));

async function writeIcon(size, name) {
  await sharp(svg).resize(size, size).png().toFile(join(root, 'public', name));
  console.log(`Wrote public/${name}`);
}

await writeIcon(192, 'icon-192.png');
await writeIcon(512, 'icon-512.png');
await writeIcon(512, 'apple-touch-icon.png');
