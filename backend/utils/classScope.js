/**
 * Shared level/stream/term matching for class-scoped DB operations.
 */
const { normalizeStream } = require('./streamNormalizer');

function getTermMatchValues(term) {
  const t = term != null ? String(term).trim() : '';
  if (t.length > 50) throw new Error('Invalid term value: too long');
  const variants = [t];
  if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t) || /^First\s+Term$/i.test(t)) {
    variants.push('Term I', 'Term 1', 'First Term');
  } else if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t) || /^Second\s+Term$/i.test(t)) {
    variants.push('Term II', 'Term 2', 'Second Term');
  } else if (/^Term\s+III$/i.test(t) || /^Term\s+3$/i.test(t)) {
    variants.push('Term III', 'Term 3');
  } else if (/^Term\s+IV$/i.test(t) || /^Term\s+4$/i.test(t)) {
    variants.push('Term IV', 'Term 4');
  }
  return [...new Set(variants)];
}

function getLevelMatchValues(level) {
  const L = level != null ? String(level).trim().toUpperCase() : '';
  if (L.length > 50) throw new Error('Invalid level value: too long');
  const variants = [L];
  if (/^FORM\s+I$/.test(L)) variants.push('FORM I', 'FORM 1');
  else if (/^FORM\s+II$/.test(L)) variants.push('FORM II', 'FORM 2');
  else if (/^FORM\s+III$/.test(L)) variants.push('FORM III', 'FORM 3');
  else if (/^FORM\s+IV$/.test(L)) variants.push('FORM IV', 'FORM 4');
  else if (/^FORM\s+V$/.test(L)) variants.push('FORM V', 'FORM 5');
  else if (/^FORM\s+VI$/.test(L)) variants.push('FORM VI', 'FORM 6');
  return [...new Set(variants)];
}

/**
 * @returns {{ levelValues: string[], streams: string[], yearNum: number, termValues: string[]|null, label: string }}
 */
function parseClassScope({ level, stream, year, term }) {
  if (!level || !String(level).trim()) throw new Error('level is required');
  if (!stream || !String(stream).trim()) throw new Error('stream is required');
  const yearNum = parseInt(year, 10);
  if (!Number.isFinite(yearNum) || yearNum <= 0) throw new Error('year is required');

  const levelValues = getLevelMatchValues(level);
  const normalizedStream = normalizeStream(String(stream).trim());
  const primaryLevel = levelValues[0];
  const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(primaryLevel);
  const streams =
    isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')
      ? ['A', 'NA']
      : [normalizedStream];

  const termValues =
    term != null && String(term).trim() !== '' ? getTermMatchValues(term) : null;

  const termLabel = termValues ? termValues[0] : 'all terms';
  const label = `${primaryLevel} ${streams.join('/')} ${yearNum} (${termLabel})`;

  return { levelValues, streams, yearNum, termValues, label, primaryLevel };
}

module.exports = {
  getTermMatchValues,
  getLevelMatchValues,
  parseClassScope,
  normalizeStream,
};
