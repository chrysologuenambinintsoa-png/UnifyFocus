#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const classMapFile = path.join(__dirname, '..', 'src', 'styles', 'classMap.ts');
const localesDir = path.join(__dirname, '..', 'src', 'locales');

function readClassMap() {
  const content = fs.readFileSync(classMapFile, 'utf8');
  const obj = {};
  const re = /"(k_[^\"]+)":\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(content))) {
    obj[m[1]] = m[2];
  }
  return obj;
}

function isCssLike(v) {
  if (!v) return false;
  // heuristics: contains tailwind tokens or css-like patterns
  return /\b(min-|bg-|from-|to-|grid|flex|rounded|animate-|blur|px-|py-|mx-|my-|w-|h-|translate-|overflow|backdrop|shadow|ring-|border-|text-|items-|justify-|gap-|gap-|max-w|min-h|object-|absolute|relative)\b|\[|\]|\//i.test(v);
}

function readJson(p) { return JSON.parse(fs.readFileSync(p,'utf8')); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function restore() {
  const classMap = readClassMap();
  const textKeys = {};
  const cssKeys = {};
  for (const [k,v] of Object.entries(classMap)) {
    if (isCssLike(v)) cssKeys[k]=v;
    else textKeys[k]=v;
  }

  // For each locale, insert textKeys under 'auto' if missing or empty
  const files = fs.readdirSync(localesDir).filter(f=>f.endsWith('.json'));
  for (const f of files) {
    const p = path.join(localesDir, f);
    const data = readJson(p);
    if (!data.auto) data.auto = {};
    let changed = false;
    for (const [k,v] of Object.entries(textKeys)) {
      if (!data.auto.hasOwnProperty(k) || !data.auto[k]) {
        data.auto[k] = v;
        changed = true;
      }
    }
    if (changed) {
      writeJson(p, data);
      console.log('Updated locale', f);
    }
  }

  // rewrite classMap.ts with only cssKeys
  const entries = Object.entries(cssKeys).map(([k,v])=>`  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  const out = `// Generated class map — run "npm run migrate:locale-classes" to regenerate\nexport const classMap = {\n${entries.join(',\n')}\n} as Record<string, string>\n`;
  fs.writeFileSync(classMapFile, out, 'utf8');
  console.log('Rewrote', classMapFile, 'kept', entries.length, 'css keys, moved', Object.keys(textKeys).length, 'text keys to locales');
}

restore();
