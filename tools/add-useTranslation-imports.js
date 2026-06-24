const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
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
  const src = fs.readFileSync(file,'utf8');
  if(!src.includes('useTranslation')) continue;
  if(src.includes("from \"@/lib/i18n\"") || src.includes("from '@/lib/i18n'")) continue;
  // find last import line
  const lines = src.split('\n');
  let insertAt = -1;
  for(let i=0;i<lines.length;i++){
    if(/^import\s.+from\s.+;?$/.test(lines[i].trim())) insertAt = i;
  }
  if(insertAt === -1) continue;
  lines.splice(insertAt+1,0,'import { useTranslation } from "@/lib/i18n";');
  fs.writeFileSync(file, lines.join('\n'),'utf8');
  console.log('Added import to', file);
  updated++;
}
console.log('Files updated:', updated);
