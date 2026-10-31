/**
 * CLI: list songs where an entry of `meta.alt_first_lines` is contained in
 * `meta.first_line` or vice versa.
 *
 * Usage:
 *     node scripts/find-duplicate-alt-first-lines.js
 *
 * Reads `json/songs/*.json` (read-only). Lines are compared after
 * normalization (lowercase, diacritics stripped, punctuation/hyphens collapsed
 * to single spaces). Each match is tagged `[exact]`, `[alt ⊂ first]` or
 * `[first ⊂ alt]`; `(normalized)` marks matches not found on the raw strings.
 */

const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(__dirname, '..', 'json', 'songs');
const MD_DIR = path.join(__dirname, '..', 'songs');

const normalize = (s) =>
    s
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();

function relation(first, alt) {
    if (!first || !alt) return null;
    if (first === alt) return 'exact';
    if (first.includes(alt)) return 'alt ⊂ first';
    if (alt.includes(first)) return 'first ⊂ alt';
    return null;
}

const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json')).sort();

const results = [];

for (const file of files) {
    const slug = path.basename(file, '.json');
    const json = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));

    const first = json.meta?.first_line;
    const alts = [].concat(json.meta?.alt_first_lines || []);
    if (!first || alts.length === 0) continue;

    const normFirst = normalize(first);
    const hits = [];
    for (const alt of alts) {
        const raw = relation(first.trim(), alt.trim());
        const kind = raw || relation(normFirst, normalize(alt));
        if (kind) hits.push({ alt, kind, normalized: !raw });
    }

    if (hits.length) results.push({ slug, first, hits });
}

const bar = '='.repeat(80);
console.log(`\n${bar}\n  ALT FIRST LINES OVERLAPPING first_line (${results.length} song(s))\n${bar}\n`);
for (const { slug, first, hits } of results) {
    // Path relative to cwd stays Cmd+Click-able in the VS Code terminal.
    console.log(path.relative(process.cwd(), path.join(MD_DIR, `${slug}.md`)));
    console.log(`    first_line: ${first}`);
    for (const { alt, kind, normalized } of hits) {
        console.log(`    [${kind}]${normalized ? ' (normalized)' : ''}: ${alt}`);
    }
}

const hitCount = results.reduce((n, s) => n + s.hits.length, 0);
console.log(`\n${results.length} song(s), ${hitCount} overlapping alt first line(s).`);

