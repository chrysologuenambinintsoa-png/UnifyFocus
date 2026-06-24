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
const offenders = [];
for(const file of files){
  const src = fs.readFileSync(file,'utf8');
  if(src.includes('useTranslation')){
    const hasImport = /from \"@\/lib\/i18n\"|from '\/lib\/i18n'/.test(src) || /from "\.\.\/lib\/i18n"/.test(src);
    if(!hasImport){
      offenders.push(file);
    }
  }
}
console.log('Files using useTranslation but missing import:', offenders.length);
for(const f of offenders) console.log('-', f);
