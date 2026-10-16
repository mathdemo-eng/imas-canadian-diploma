// Turns the single-file preview build into an Artifact page: the Artifact host adds
// its own <!doctype>, <html>, <head> and <body>, so we keep only what goes inside them.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('dist-artifact/index.html', 'utf8');
const head = src.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? '';
const body = src.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? '';

const keep = [];
const title = head.match(/<title>[\s\S]*?<\/title>/i)?.[0];
if (title) keep.push(title);
keep.push('<meta name="claude:viewport-fit-sides" content="cover">');
for (const m of head.matchAll(/<style[\s\S]*?<\/style>/gi)) keep.push(m[0]);
for (const m of head.matchAll(/<script[\s\S]*?<\/script>/gi)) keep.push(m[0]);

const out = `${keep.join('\n')}\n${body.trim()}\n`;
writeFileSync('dist-artifact/canadian-diploma.html', out);
console.log(`Artifact page written: dist-artifact/canadian-diploma.html (${(out.length / 1024).toFixed(0)} KB)`);
