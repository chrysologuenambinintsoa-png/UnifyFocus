const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir){
  let files = [];
  for(const name of fs.readdirSync(dir)){
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if(stat.isDirectory()){
      if(name === 'node_modules' || name === '.next' || name === '.git') continue;
      files = files.concat(walk(full));
    } else {
      if(['.tsx', '.ts', '.jsx', '.js'].includes(path.extname(name))) files.push(full);
    }
  }
  return files;
}

const files = walk(SRC);
let updated = 0;
for(const file of files){
  let src = fs.readFileSync(file,'utf8');
  if(!src.includes('t("auto.')) continue;
  let changed = false;

  // Ensure import exists
  if(!/from "@\/lib\/i18n"/.test(src)){
    if(src.startsWith('"use client"')){
      src = src.replace(/("use client";\n)/, `$1import { useTranslation } from "@/lib/i18n";\n`);
    } else {
      // insert after first import block
      src = src.replace(/(import[\s\S]*?;\n)/, `$1import { useTranslation } from "@/lib/i18n";\n`);
    }
    changed = true;
  }

  // For each function or arrow function, if function contains t("auto.") and doesn't have useTranslation, insert const { t } = useTranslation();
  const lines = src.split('\n');
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(/t\(\"auto\./.test(line)){
      // walk upwards to find enclosing function start (line with 'function' or '=>' )
      let j = i;
      while(j>=0 && !/^(\s*)(function\s+\w+|const\s+\w+\s*=\s*\(|const\s+\w+\s*=\s*\(.*\)\s*=>|export\s+default\s+function)/.test(lines[j])) j--;
      if(j>=0){
        // find next line with opening brace '{'
        let k = j;
        while(k<lines.length && !/\{\s*$/.test(lines[k])) k++;
        if(k<lines.length){
          // check if next non-empty line already has const { t }
          const next = (lines[k+1]||'').trim();
          if(!/const \{\s*t\s*\}/.test(next)){
            lines.splice(k+1,0,'  const { t } = useTranslation();');
            changed = true;
          }
        }
      }
    }
  }

  if(changed){
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
    updated++;
    console.log('Fixed', file);
  }
}
console.log('Files fixed:', updated);
