/**
 * CLI: list songs that have inline verses (verses with `text` but no `number`),
 * ignoring the first verse of each song and verses with a `text` line wrapped
 * entirely in parentheses.
 *
 * Usage:
 *     node scripts/find-inline-verses.js
 *
 * Reads `json/songs/*.json` (read-only) and prints each match as
 * `[verse #<index>]: <first line>`, followed by a summary. Songs without any
 * numbered verses form their own group; the rest are grouped by whether
 * `meta.styles.verses.inline.bold` is `false`.
 */

const fs = require('fs');
const path = require('path');

const SONGS_DIR = path.join(__dirname, '..', 'json', 'songs');
const MD_DIR = path.join(__dirname, '..', 'songs');
const PAREN_RE = /^\(.*\)$/;

const files = fs.readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json')).sort();

const noNumbers = [];
const withStyle = [];
const withoutStyle = [];

for (const file of files) {
    const slug = path.basename(file, '.json');
    const json = JSON.parse(fs.readFileSync(path.join(SONGS_DIR, file), 'utf8'));

    const verses = json.verses || [];
    const hits = [];
    verses.forEach((verse, index) => {
        // The first verse is usually an intro/epigraph, so it is not reported.
        if (index === 0 || verse.number || !verse.text?.length) return;
        if (verse.text.some((line) => PAREN_RE.test(line.trim()))) return;
        hits.push({ index: index + 1, line: verse.text[0] });
    });

    if (hits.length === 0) continue;

    const notBold = json.meta?.styles?.verses?.inline?.bold === false;
    const entry = { slug, notBold, hits };
    if (!verses.some((v) => v.number)) noNumbers.push(entry);
    else (notBold ? withStyle : withoutStyle).push(entry);
}

function printGroup(title, group) {
    const bar = '='.repeat(80);
    console.log(`\n${bar}\n  ${title} (${group.length} song(s))\n${bar}\n`);
    for (const { slug, notBold, hits } of group) {
        // Path relative to cwd stays Cmd+Click-able in the VS Code terminal.
        console.log(path.relative(process.cwd(), path.join(MD_DIR, `${slug}.md`)));
        notBold && console.log('- [inline bold: false]');
        for (const { index, line } of hits) {
            console.log(`    [verse #${index}]: ${line}`);
        }
    }
}

printGroup('NO NUMBERED VERSES', noNumbers);
printGroup('WITH styles.verses.inline.bold: false', withStyle);
printGroup('WITHOUT styles.verses.inline.bold: false', withoutStyle);

const all = [...noNumbers, ...withStyle, ...withoutStyle];
const verseCount = all.reduce((n, s) => n + s.hits.length, 0);
console.log(`\n${all.length} song(s), ${verseCount} inline verse(s).`);
