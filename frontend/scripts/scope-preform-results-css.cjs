const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/admin/PreFormOneResults.css');
const SCOPE = '.preform-one-results-page-container ';
const SCOPE_TRIM = SCOPE.trim();

function findClosingBrace(s, openPos) {
  let depth = 0;
  for (let j = openPos; j < s.length; j++) {
    if (s[j] === '{') depth++;
    else if (s[j] === '}') {
      depth--;
      if (depth === 0) return j;
    }
  }
  throw new Error('no closing brace');
}

function scopeRuleSelectors(selectorPart) {
  const trimmed = selectorPart.trim();
  if (!trimmed) return selectorPart;
  if (trimmed.startsWith('@')) return selectorPart;
  return selectorPart
    .split(',')
    .map((s) => {
      const t = s.trim();
      if (!t) return '';
      if (t === SCOPE_TRIM || t.startsWith(`${SCOPE_TRIM} `)) return t;
      return SCOPE + t;
    })
    .filter(Boolean)
    .join(', ');
}

function processCss(input) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const atIdx = input.indexOf('@', i);
    const openIdx = input.indexOf('{', i);
    if (openIdx === -1) {
      out += input.slice(i);
      break;
    }
    if (atIdx !== -1 && atIdx < openIdx) {
      out += input.slice(i, atIdx);
      const semi = input.indexOf(';', atIdx);
      const brace = input.indexOf('{', atIdx);
      if (brace !== -1 && (semi === -1 || brace < semi)) {
        const endBrace = findClosingBrace(input, brace);
        const atRule = input.slice(atIdx, brace + 1);
        const inner = input.slice(brace + 1, endBrace);
        const nameMatch = atRule.match(/@[a-z-]+/i);
        const name = nameMatch ? nameMatch[0].toLowerCase() : '';
        if (name === '@keyframes') {
          out += input.slice(atIdx, endBrace + 1);
        } else {
          out += atRule + processCss(inner) + '}';
        }
        i = endBrace + 1;
        continue;
      }
      if (semi !== -1) {
        out += input.slice(atIdx, semi + 1);
        i = semi + 1;
        continue;
      }
    }
    const sel = input.slice(i, openIdx);
    const close = findClosingBrace(input, openIdx);
    const body = input.slice(openIdx + 1, close);
    const scopedSel = scopeRuleSelectors(sel);
    if (scopedSel.trim()) {
      out += scopedSel + '{' + processCss(body) + '}';
    } else {
      out += '{' + processCss(body) + '}';
    }
    i = close + 1;
  }
  return out;
}

let css = fs.readFileSync(filePath, 'utf8');
css = css.replace(/\/\*[\s\S]*?\*\//g, '\n');

let processed = processCss(css);

processed = processed.replace(/@keyframes\s+spin\s*\{/g, '@keyframes preform-one-results-spin {');
processed = processed.replace(/animation:\s*spin\s+/g, 'animation: preform-one-results-spin ');

fs.writeFileSync(filePath, processed);
console.log('Scoped PreFormOneResults.css (comments stripped; selectors prefixed).');
