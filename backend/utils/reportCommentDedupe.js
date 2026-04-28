/**
 * When loading comments/tabia for FORM I–IV with stream IN (A, NA), prefer row on stream A if duplicates exist.
 */

function dedupeCommentRowsByTypePreferA(rows) {
  const byType = new Map();
  for (const row of rows) {
    const key = row.comment_type;
    const prev = byType.get(key);
    if (!prev || (prev.stream === 'NA' && row.stream === 'A')) {
      byType.set(key, row);
    }
  }
  return Array.from(byType.values());
}

function dedupeTabiaRowsByCriterionPreferA(rows) {
  const byCrit = new Map();
  for (const row of rows) {
    const key = row.criterion;
    const prev = byCrit.get(key);
    if (!prev || (prev.stream === 'NA' && row.stream === 'A')) {
      byCrit.set(key, row);
    }
  }
  return Array.from(byCrit.values());
}

module.exports = {
  dedupeCommentRowsByTypePreferA,
  dedupeTabiaRowsByCriterionPreferA
};
