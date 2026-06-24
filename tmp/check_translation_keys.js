const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'src');
function walk(dir) {
  let res = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) res = res.concat(walk(p));
    else if (p.endsWith('.tsx')) res.push(p);
  }
  return res;
}

const files = walk(root);
const regex = /t\("(auto\.k_[^"\)]+)"\)/g;
const keys = new Set();
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content))) {
    keys.add(match[1]);
  }
}

const localePath = path.join(__dirname, '..', 'src', 'locales', 'fr.json');
const fr = JSON.parse(fs.readFileSync(localePath, 'utf8'));
const auto = fr.auto || {};
const missing = [];
for (const key of Array.from(keys).sort()) {
  const parts = key.split('.').slice(1);
  let value = auto;
  for (const part of parts) {
    if (typeof value === 'object' && value && Object.prototype.hasOwnProperty.call(value, part)) {
      value = value[part];
    } else {
      value = undefined;
      break;
    }
  }
  if (value === undefined) missing.push(key);
}

console.log('used keys', keys.size);
console.log('missing keys', missing.length);
missing.slice(0, 100).forEach((k) => console.log(k));
