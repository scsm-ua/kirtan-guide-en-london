/**
 * CLI: list songs whose `verses[].text` lines contain "(" or ")".
 *
 * Usage:
 *     node scripts/find-verse-parentheses.js
 *
 * Reads `json/songs/*.json` (read-only) and prints each match as
 * a markdown link to the song file plus `[verse <number>]: <line>` entries,
 * followed by a summary. Songs that have
 * `meta["verse parentheses"]` set are annotated with its value.
 */

const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(__dirname, '..', 'json', 'songs');
const PAREN_RE = /[()]/;

const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json')).sort();

const MD_DIR = path.join(__dirname, '..', 'songs');

const withFlag = [];
const withoutFlag = [];

for (const file of files) {
    const slug = path.basename(file, '.json');
    const json = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));

    const hits = [];
    (json.verses || []).forEach((verse, index) => {
        for (const line of verse.text || []) {
            if (PAREN_RE.test(line)) {
                hits.push({ number: verse.number ?? `#${index + 1}`, line });
            }
        }
    });

    if (hits.length === 0) continue;

    const flag = json.meta?.['verse parentheses'];
    (flag ? withFlag : withoutFlag).push({ slug, flag, hits });
}

function printGroup(title, group) {
    const bar = '='.repeat(80);
    console.log(`\n${bar}\n  ${title} (${group.length} song(s))\n${bar}\n`);
    for (const { slug, flag, hits } of group) {
        // Markdown link with a cwd-relative path, navigable from md preview and the terminal.
        const rel = path.relative(process.cwd(), path.join(MD_DIR, `${slug}.md`));
        console.log(`[${rel}](${rel})`);
        flag && console.log(`- [verse parentheses: ${flag}]`);
        for (const { number, line } of hits) {
            console.log(`    [verse ${number}]: ${line}`);
        }
    }
}

printGroup('WITH "verse parentheses"', withFlag);
printGroup('WITHOUT "verse parentheses"', withoutFlag);

const all = [...withFlag, ...withoutFlag];
const lineCount = all.reduce((n, s) => n + s.hits.length, 0);
console.log(`\n${all.length} song(s), ${lineCount} line(s) with parentheses.`);
