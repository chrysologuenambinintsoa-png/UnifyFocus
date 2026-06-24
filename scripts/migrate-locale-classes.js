#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'src', 'locales');
const outFile = path.join(__dirname, '..', 'src', 'styles', 'classMap.ts');

function isClassLike(value) {
  if (typeof value !== 'string') return false;
  // heuristics: must contain at least one space and a dash (tailwind-like)
  return /\s/.test(value) && /-/.test(value);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function collectKeys() {
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  const keys = new Map();

  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('k_') && isClassLike(v)) {
        if (!keys.has(k)) keys.set(k, v);
      }
      if (v && typeof v === 'object') traverse(v);
    }
  }

  for (const f of files) {
    const p = path.join(localesDir, f);
    const data = readJson(p);
    traverse(data);
  }

  // If no keys found (locales already cleared), try reading existing classMap.ts
  if (!keys.size && fs.existsSync(outFile)) {
    const content = fs.readFileSync(outFile, 'utf8');
    const re = /\s*"(k_[^\"]+)":\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(content))) {
      keys.set(m[1], m[2]);
    }
  }

  return keys;
}

function generateClassMap(keys) {
  const entries = Array.from(keys.entries())
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n');

  const content = `// Generated class map — run \"npm run migrate:locale-classes\" to regenerate\nexport const classMap = {\n${entries}\n} as Record<string, string>\n`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, 'utf8');
  console.log('Wrote', outFile);
}

function patchSourceFiles(keys) {
  const srcDir = path.join(__dirname, '..', 'src');
  const walk = dir => {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
      const p = path.join(dir, item);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) results.push(...walk(p));
      else if (/\.(tsx?|jsx?)$/.test(p)) results.push(p);
    }
    return results;
  };

  const files = walk(srcDir);
  const keyList = Array.from(keys.keys());
  // match t('k_xxx') or t("k_xxx") or t('auto.k_xxx')
  const safeKeys = keyList.map(k=>k.replace(/[-\\^$*+?.()|[\]{}]/g,'\\$&'));
  const keyRegex = new RegExp(`t\\(\\s*['\"](?:auto\\.)?(${safeKeys.join('|')})['\"]\\s*\\)`, 'g');

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (!keyList.some(k => content.includes(k))) continue;

    const original = content;
    let replaced = false;
    content = content.replace(keyRegex, (m, p1) => {
      replaced = true;
      return `classMap[${JSON.stringify(p1)}]`;
    });

    if (replaced) {
      // ensure import exists (check original content before replacements)
      if (!/import\s+\{\s*classMap\s*\}\s+from\s+['\"]/.test(original)) {
        const importLine = `import { classMap } from '@/styles/classMap';\n`;
        // insert after "use client" if present
        if (/^("use client"|'use client');?\s*\n/.test(content)) {
          content = content.replace(/^("use client"|'use client');?\s*\n/, match => match + importLine);
        } else {
          content = importLine + content;
        }
      }
      fs.writeFileSync(file, content, 'utf8');
      console.log('Patched', file);
    }
  }

  // Second pass: ensure files that already contain `classMap[` have the import
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('classMap[') && !/import\s+\{\s*classMap\s*\}\s+from\s+['\"]/.test(content)) {
      const importLine = `import { classMap } from '@/styles/classMap';\n`;
      if (/^("use client"|'use client');?\s*\n/.test(content)) {
        content = content.replace(/^("use client"|'use client');?\s*\n/, match => match + importLine);
      } else {
        content = importLine + content;
      }
      fs.writeFileSync(file, content, 'utf8');
      console.log('Inserted import in', file);
    }
  }

  // Third pass: ensure "use client" stays at top if present -- move import after it
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const importRe = /import\s+\{\s*classMap\s*\}\s+from\s+['\"]@\/styles\/classMap['\"];?\s*\n/;
    const useClientRe = /(?:"use client"|'use client');?\s*\n/;
    const importMatch = content.match(importRe);
    const useClientMatch = content.match(useClientRe);
    if (importMatch && useClientMatch) {
      const importIndex = content.indexOf(importMatch[0]);
      const useClientIndex = content.indexOf(useClientMatch[0]);
      if (importIndex < useClientIndex) {
        // remove import and re-insert after use client
        content = content.replace(importRe, '');
        content = content.replace(useClientRe, match => match + importMatch[0]);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed directive order in', file);
      }
    }
  }
}

function updateLocales(keys) {
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const p = path.join(localesDir, f);
    const data = readJson(p);
    let changed = false;

    function traverseAndPatch(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj)) {
        if (k && k.startsWith('k_') && keys.has(k) && typeof v === 'string' && v.length > 0) {
          obj[k] = '';
          changed = true;
        } else if (v && typeof v === 'object') {
          traverseAndPatch(v);
        }
      }
    }

    traverseAndPatch(data);

    if (changed) {
      writeJson(p, data);
      console.log('Updated locale', p);
    }
  }
}

function main() {
  const keys = collectKeys();
  if (!keys.size) {
    console.log('No class-like keys found.');
    return;
  }
  generateClassMap(keys);
  patchSourceFiles(keys);
  updateLocales(keys);
  console.log('Migration complete. Review changes and run your dev server.');
}

main();
