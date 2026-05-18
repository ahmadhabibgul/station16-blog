#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// build.js
// Aggregates _posts/*.md  →  posts.json
//
// Triggered automatically by Netlify on every push.
// Run locally with:  node build.js
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '_posts');
const OUTPUT = path.join(__dirname, 'posts.json');

// ── Month lookup (avoids timezone shifts from new Date()) ────────────────────
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Convert a value from gray-matter's `data.date` to "Month D, YYYY".
 * gray-matter parses YAML date scalars (YYYY-MM-DD) as UTC-midnight Date objects.
 * Using UTC getters avoids the date shifting one day back in western timezones.
 */
function formatDate(raw) {
  if (raw instanceof Date) {
    return `${MONTHS[raw.getUTCMonth()]} ${raw.getUTCDate()}, ${raw.getUTCFullYear()}`;
  }
  // String: "YYYY-MM-DD" or "YYYY-MM-DDT00:00:00.000Z"
  const iso = String(raw).split('T')[0];
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/**
 * "2026-05-18-my-post-title.md" → "my-post-title"
 * Strips the YYYY-MM-DD- date prefix and .md extension.
 */
function fileToSlug(filename) {
  return filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/**
 * Returns "YYYY-MM-DD" from the filename for chronological sorting.
 */
function fileDateKey(filename) {
  const m = filename.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '0000-00-00';
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(POSTS_DIR)) {
  console.warn('[build] _posts/ not found — writing empty posts.json');
  fs.writeFileSync(OUTPUT, '[]', 'utf8');
  process.exit(0);
}

const files = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.md'))
  .sort((a, b) => fileDateKey(b).localeCompare(fileDateKey(a))); // newest first

if (files.length === 0) {
  console.warn(
    '[build] No .md files found in _posts/ — writing empty posts.json',
  );
  fs.writeFileSync(OUTPUT, '[]', 'utf8');
  process.exit(0);
}

const posts = files.map((filename) => {
  const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
  const { data, content } = matter(raw);

  return {
    id: fileToSlug(filename),
    title: data.title || '',
    category: (data.category || '').toUpperCase(),
    date: data.date ? formatDate(data.date) : '',
    summary: data.summary || '',
    image: data.image || '',
    body: content.trim(),
  };
});

fs.writeFileSync(OUTPUT, JSON.stringify(posts, null, 2), 'utf8');
console.log(`[build] ✓ posts.json written — ${posts.length} post(s)`);
