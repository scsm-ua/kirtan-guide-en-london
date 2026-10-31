/**
 * CLI: list songs where an entry of `meta.alt_first_lines` is contained in
 * `meta.first_line` or vice versa, and where two alt first lines of the same
 * song contain one another.
 *
 * Usage:
 *     node scripts/find-duplicate-alt-first-lines.js
 *
 * Reads `json/songs/*.json` (read-only). Lines are compared after
 * normalization (lowercase, diacritics stripped, punctuation/hyphens collapsed
 * to single spaces). Each match is tagged `[exact]`, `[A ⊂ B]` or `[B ⊂ A]`;
 * `(normalized)` marks matches not found on the raw strings.
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

function relation(a, b, nameA, nameB) {
    if (!a || !b) return null;
    if (a === b) return 'exact';
    if (a.includes(b)) return `${nameB} ⊂ ${nameA}`;
    if (b.includes(a)) return `${nameA} ⊂ ${nameB}`;
    return null;
}

function compare(a, b, nameA, nameB) {
    const raw = relation(a.trim(), b.trim(), nameA, nameB);
    const kind = raw || relation(normalize(a), normalize(b), nameA, nameB);
    return kind && { kind, normalized: !raw };
}

const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json')).sort();

const results = [];
const altResults = [];

for (const file of files) {
    const slug = path.basename(file, '.json');
    const json = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));

    const first = json.meta?.first_line;
    const alts = [].concat(json.meta?.alt_first_lines || []);
    if (alts.length === 0) continue;

    if (first) {
        const hits = [];
        for (const alt of alts) {
            const match = compare(first, alt, 'first', 'alt');
            if (match) hits.push({ alt, ...match });
        }
        if (hits.length) results.push({ slug, first, hits });
    }

    const altHits = [];
    for (let i = 0; i < alts.length; i++) {
        for (let j = i + 1; j < alts.length; j++) {
            const match = compare(alts[i], alts[j], `#${i + 1}`, `#${j + 1}`);
            if (match) altHits.push({ a: alts[i], b: alts[j], i: i + 1, j: j + 1, ...match });
        }
    }
    if (altHits.length) altResults.push({ slug, altHits });
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

console.log(`\n${bar}\n  ALT FIRST LINES OVERLAPPING EACH OTHER (${altResults.length} song(s))\n${bar}\n`);
for (const { slug, altHits } of altResults) {
    console.log(path.relative(process.cwd(), path.join(MD_DIR, `${slug}.md`)));
    for (const { a, b, i, j, kind, normalized } of altHits) {
        console.log(`    [${kind}]${normalized ? ' (normalized)' : ''}:`);
        console.log(`        #${i}: ${a}`);
        console.log(`        #${j}: ${b}`);
    }
}

const hitCount = results.reduce((n, s) => n + s.hits.length, 0);
const altHitCount = altResults.reduce((n, s) => n + s.altHits.length, 0);
console.log(`\n${results.length} song(s), ${hitCount} alt first line(s) overlapping first_line.`);
console.log(`${altResults.length} song(s), ${altHitCount} overlapping alt pair(s).`);

