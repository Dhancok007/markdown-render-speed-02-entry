import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from './parse.js';

const inputPath = '/input/cases.json';
const resultPath = '/output/html.json';

async function loadCases(path) {
  const text = await readFile(path, 'utf8');
  return JSON.parse(text);
}

async function saveResults(path, rendered) {
  await mkdir('/output', { recursive: true });
  await writeFile(path, JSON.stringify(rendered));
}

const cases = await loadCases(inputPath);
const rendered = cases.map(entry => parse(entry.markdown));
await saveResults(resultPath, rendered);
