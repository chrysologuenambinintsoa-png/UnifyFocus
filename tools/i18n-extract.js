const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = [
  path.join(SRC, 'locales', 'fr.json'),
  path.join(SRC, 'locales', 'en.json'),
  path.join(SRC, 'locales', 'de.json'),
  path.join(SRC, 'locales', 'es.json'),
];

const exts = ['.tsx', '.ts', '.jsx', '.js'];

function walk(dir){
  let files = [];
  for(const name of fs.readdirSync(dir)){
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if(stat.isDirectory()){
      if(name === 'node_modules' || name === '.next' || name === '.git') continue;
      files = files.concat(walk(full));
    } else {
      if(exts.includes(path.extname(name))) files.push(full);
    }
  }
  return files;
}

function loadLocales(){
  const data = {};
  for(const p of LOCALES){
    if(!fs.existsSync(p)) continue;
    try{ data[p] = JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ data[p] = {}; }
  }
  return data;
}

function saveLocales(data){
  for(const p of LOCALES){
    if(!fs.existsSync(p)) continue;
    const json = JSON.stringify(data[p], null, 2) + '\n';
    fs.writeFileSync(p, json, 'utf8');
  }
}

function ensureAutoRoot(obj){
  if(!obj.auto) obj.auto = {};
}

function sanitizeKey(text, idx){
  let s = text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0,40);
  if(!s) s = 'key';
  return `k_${s}_${idx}`;
}

(function main(){
  const files = walk(SRC);
  const locales = loadLocales();
  for(const p of LOCALES) ensureAutoRoot(locales[p]);

  const map = new Map();
  let counter = 1;

  for(const file of files){
    let src = fs.readFileSync(file,'utf8');
    let original = src;
    let changed = false;

    // find JSX text nodes: >text< but avoid ~= tags containing only whitespace
    src = src.replace(/>([^<>\n]{2,}?)</g, (m, g1) => {
      const text = g1.trim();
      if(!text) return m;
      // skip if contains < or > or curly braces
      if(/[{}<>]/.test(text)) return m;
      // skip if looks like code (contains = or : or / or % and no spaces)
      if(!/\s/.test(text)) return m;

      let key = map.get(text);
      if(!key){
        key = `auto.${sanitizeKey(text, counter++)}`;
        map.set(text, key);
        for(const p of LOCALES){ locales[p].auto[key.split('.').pop()] = text; }
      }
      changed = true;
      return `>{t(\"${key}\")}<`;
    });

    // find attribute strings: attr="text" where text has spaces
    src = src.replace(/=\"([^\"]{2,}?)\"/g, (m,g1) => {
      const text = g1.trim();
      if(!text) return m;
      if(!/\s/.test(text)) return m; // only replace texts with spaces
      if(/^[0-9\-/:]+$/.test(text)) return m; // skip dates/urls
      if(/\{t\(/.test(m)) return m;
      let key = map.get(text);
      if(!key){
        key = `auto.${sanitizeKey(text, counter++)}`;
        map.set(text, key);
        for(const p of LOCALES){ locales[p].auto[key.split('.').pop()] = text; }
      }
      changed = true;
      return `={t(\"${key}\")}`;
    });

    if(changed){
      // ensure import exists
      if(!/useTranslation\(|from "@\/lib\/i18n"/.test(src)){
        // add import at top after "use client" or first import
        src = src.replace(/("use client";\n)/, `$1import { useTranslation } from "@/lib/i18n";\n`);
      }
      // ensure call to get t exists (const { t } = useTranslation();) somewhere in component
      if(!/const \{ t \} = useTranslation\(\)/.test(src)){
        // insert after first hooks declarations (naive): after first useState occurrence
        src = src.replace(/(const \[.*?\] = useState\([\s\S]*?\);)/, `$1\n  const { t } = useTranslation();`);
      }

      fs.writeFileSync(file, src, 'utf8');
      console.log('Updated', file);
    }
  }

  saveLocales(locales);
  console.log('Extraction complete. Keys generated:', map.size);
})();
