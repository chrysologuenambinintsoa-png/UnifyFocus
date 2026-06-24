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
  if(!src.includes('const { t } = useTranslation();')) continue;
  const lines = src.split('\n');
  let changed = false;
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    if(line.trim() === 'const { t } = useTranslation();'){
      // check if this line is within parameter destructure (previous non-empty line contains '({' )
      let prev = i-1;
      while(prev>=0 && lines[prev].trim() === '') prev--;
      if(prev>=0 && lines[prev].includes('({')){
        // remove this line
        lines.splice(i,1);
        changed = true;
        // now find the function opening closing line (search forward for ")" followed by { or "):"")
        let j = prev+1;
        let inserted = false;
        while(j<lines.length && j < prev + 50){
          if(/\)\s*\{|\)\s*:\s*/.test(lines[j])){
            // insert after this line
            lines.splice(j+1,0,'  const { t } = useTranslation();');
            inserted = true;
            break;
          }
          j++;
        }
        if(!inserted){
          // fallback: insert after prev+5
          lines.splice(prev+5,0,'  const { t } = useTranslation();');
        }
      }
    }
  }
  if(changed){
    fs.writeFileSync(file, lines.join('\n'),'utf8');
    updated++;
    console.log('Moved hook in', file);
  }
}
console.log('Files updated:', updated);
