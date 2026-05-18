#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// migrate.js
// One-time conversion: posts.json entries → _posts/YYYY-MM-DD-slug.md
//
// Run once:  node migrate.js
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, 'posts.json');
const POSTS_DIR = path.join(__dirname, '_posts');

// Month name → zero-padded number
const MONTH_MAP = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12',
};

/**
 * "May 18, 2026" → "2026-05-18"
 * Pure string manipulation — no Date constructor, no timezone risk.
 */
function toISODate(human) {
  const m = human.match(/(\w+)\s+(\d+),\s+(\d+)/);
  if (!m) return '1970-01-01';
  const [, month, day, year] = m;
  return `${year}-${MONTH_MAP[month] || '01'}-${String(day).padStart(2, '0')}`;
}

/**
 * Escape double-quotes inside a YAML quoted scalar.
 */
function yamlStr(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(SOURCE)) {
  console.error('[migrate] posts.json not found — nothing to migrate.');
  process.exit(1);
}

if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR);
  console.log('[migrate] Created _posts/');
}

const posts = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
let created = 0;
let skipped = 0;

posts.forEach((post) => {
  const isoDate = toISODate(post.date);
  const filename = `${isoDate}-${post.id}.md`;
  const dest = path.join(POSTS_DIR, filename);

  if (fs.existsSync(dest)) {
    console.log(`[migrate] skipped (already exists): ${filename}`);
    skipped++;
    return;
  }

  // Build YAML frontmatter block
  const frontmatter = [
    '---',
    `title:    "${yamlStr(post.title)}"`,
    `category: "${yamlStr(post.category)}"`,
    `date:     "${isoDate}"`,
    `summary:  "${yamlStr(post.summary)}"`,
    `image:    "${yamlStr(post.image)}"`,
    '---',
    '',
  ].join('\n');

  fs.writeFileSync(dest, frontmatter + (post.body || ''), 'utf8');
  console.log(`[migrate] created: ${filename}`);
  created++;
});

console.log(`\n[migrate] Done — ${created} created, ${skipped} skipped.`);
console.log(
  '[migrate] Next step: run "node build.js" to verify posts.json is correct,',
);
console.log('          then commit everything and push to GitHub.');
