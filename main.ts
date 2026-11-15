import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from './parse.js';

const cases = JSON.parse(await readFile('/input/cases.json', 'utf8'));
const html = cases.map(({ markdown }) => parse(markdown));
await mkdir('/output', { recursive: true });
await writeFile('/output/html.json', JSON.stringify(html));
