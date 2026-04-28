/**
 * Visitor Statistics Utility
 */
const { query } = require('../config/database');
const TZ = 'Africa/Dar_es_Salaam';

function getTzDateParts(timeZone = TZ) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parseInt(parts.find((p) => p.type === 'year')?.value || `${now.getFullYear()}`, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || `${now.getMonth() + 1}`, 10);
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || `${now.getDate()}`, 10);
  return { year, month, day };
}

function getWeekNumberFromYmd(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return { isoYear, weekNo };
}

function getVisitorStatKeys(timeZone = TZ) {
  const { year, month, day } = getTzDateParts(timeZone);
  const today = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const { isoYear, weekNo } = getWeekNumberFromYmd(year, month, day);
  const week = `${isoYear}-W${weekNo}`;
  return { today, week };
}

const updateVisitorStats = async () => {
  try {
    const { today, week } = getVisitorStatKeys();
    
    // Update total
    await query(
      `INSERT INTO visitor_stats (stat_type, stat_key, stat_value)
       VALUES ('total', 'total_visits', 1)
       ON CONFLICT (stat_type, stat_key)
       DO UPDATE SET stat_value = visitor_stats.stat_value + 1`
    );
    
    // Update daily
    await query(
      `INSERT INTO visitor_stats (stat_type, stat_key, stat_value)
       VALUES ('daily', $1, 1)
       ON CONFLICT (stat_type, stat_key)
       DO UPDATE SET stat_value = visitor_stats.stat_value + 1`,
      [today]
    );
    
    // Update weekly
    await query(
      `INSERT INTO visitor_stats (stat_type, stat_key, stat_value)
       VALUES ('weekly', $1, 1)
       ON CONFLICT (stat_type, stat_key)
       DO UPDATE SET stat_value = visitor_stats.stat_value + 1`,
      [week]
    );
  } catch (error) {
    console.error('Error updating visitor stats:', error);
    throw error;
  }
};

module.exports = {
  updateVisitorStats,
  getVisitorStatKeys,
};

