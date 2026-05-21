/**
 * Comments & Assessment, tabia mwenendo, parish, debt, and fees announcements
 * for individual / bulk PDF reports. Matches /reports/individual and Comments UI
 * (name-sorted, 0-based student_index).
 */
const { query } = require('../config/database');
const {
  dedupeCommentRowsByTypePreferA,
  dedupeTabiaRowsByCriterionPreferA,
} = require('./reportCommentDedupe');

const FORM_I_TO_IV = /^FORM\s+(I|II|III|IV)$/i;

/**
 * SQL + params for name-ordered class list (same as PhotoManagement / Comments UI).
 * @returns {{ sql: string, params: unknown[] }}
 */
function getStudentIndexListQuery(form, normalizedStream, yearNum) {
  const isFormIToIV = FORM_I_TO_IV.test(form);
  if (isFormIToIV && normalizedStream === 'A') {
    return {
      sql: `SELECT adm_no, first_name, middle_name, surname
            FROM students
            WHERE level = $1 AND stream IN ($2, $3) AND year = $4
            ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
            LIMIT 500`,
      params: [form, 'A', 'NA', yearNum],
    };
  }
  return {
    sql: `SELECT adm_no, first_name, middle_name, surname
          FROM students
          WHERE level = $1 AND stream = $2 AND year = $3
          ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
          LIMIT 500`,
    params: [form, normalizedStream, yearNum],
  };
}

/**
 * Resolve 0-based student_index string for an adm_no (Comments & Assessment key).
 * @param {string} admNo
 * @param {{ adm_no: string }[]} orderedRows
 * @returns {string} index or '-1' if not in list
 */
function studentIndexForAdmNo(admNo, orderedRows) {
  const pos = orderedRows.findIndex((s) => String(s.adm_no) === String(admNo));
  return (pos >= 0 ? pos : -1).toString();
}

/**
 * Build adm_no → student_index map (0-based) for bulk JSON summaries.
 * @returns {Promise<Record<string, string>>}
 */
async function buildAdmNoToStudentIndexMap(form, normalizedStream, yearNum) {
  const { sql, params } = getStudentIndexListQuery(form, normalizedStream, yearNum);
  const result = await query(sql, params);
  const map = {};
  result.rows.forEach((row, idx) => {
    map[row.adm_no] = idx.toString();
  });
  return map;
}

/**
 * Load assessment-related fields for one student report.
 * @param {{
 *   studentIndex: string,
 *   student: object,
 *   form: string,
 *   normalizedStream: string,
 *   yearNum: number,
 *   normalizedTerm: string,
 * }} ctx
 */
async function loadReportStudentExtras({
  studentIndex,
  student,
  form,
  normalizedStream,
  yearNum,
  normalizedTerm,
}) {
  const isFormIToIV = FORM_I_TO_IV.test(form);
  const invalidIndex = studentIndex === '-1' || studentIndex === '';

  let comments = [];
  let tabia_mwenendo = [];

  if (!invalidIndex) {
    if (isFormIToIV && normalizedStream === 'A') {
      const cr = await query(
        `SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
        [studentIndex, form, 'A', 'NA', yearNum, normalizedTerm]
      );
      comments = dedupeCommentRowsByTypePreferA(cr.rows);

      const tr = await query(
        `SELECT * FROM tabia_mwenendo WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
        [studentIndex, form, 'A', 'NA', yearNum, normalizedTerm]
      );
      tabia_mwenendo = dedupeTabiaRowsByCriterionPreferA(tr.rows);
    } else {
      const cr = await query(
        'SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
        [studentIndex, form, normalizedStream, yearNum, normalizedTerm]
      );
      comments = cr.rows;

      const tr = await query(
        'SELECT * FROM tabia_mwenendo WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
        [studentIndex, form, normalizedStream, yearNum, normalizedTerm]
      );
      tabia_mwenendo = tr.rows;
    }
  }

  let student_parish = 'Not specified';
  try {
    if (!invalidIndex) {
      const parishResult = (isFormIToIV && normalizedStream === 'A')
        ? await query(
          `SELECT parish_name FROM student_parishes WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
           ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
          [studentIndex, form, 'A', 'NA', yearNum]
        )
        : await query(
          'SELECT parish_name FROM student_parishes WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
          [studentIndex, form, normalizedStream, yearNum]
        );
      if (parishResult.rows.length > 0 && parishResult.rows[0]) {
        student_parish =
          parishResult.rows[0].parish_name ||
          student.parish ||
          student.parish_name ||
          'Not specified';
      } else {
        student_parish = student.parish || student.parish_name || 'Not specified';
      }
    } else {
      student_parish = student.parish || student.parish_name || 'Not specified';
    }
  } catch {
    student_parish = student.parish || student.parish_name || 'Not specified';
  }

  let student_fees_debt = '0.00';
  try {
    if (!invalidIndex) {
      const debtResult = (isFormIToIV && normalizedStream === 'A')
        ? await query(
          `SELECT amount, description FROM individual_debt WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
           ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
          [studentIndex, form, 'A', 'NA', yearNum]
        )
        : await query(
          'SELECT amount, description FROM individual_debt WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
          [studentIndex, form, normalizedStream, yearNum]
        );
      const debt = debtResult.rows[0] || null;
      if (debt) {
        if (debt.amount && debt.description) {
          student_fees_debt = `${parseFloat(debt.amount).toFixed(0)} - ${debt.description}`;
        } else if (debt.amount) {
          student_fees_debt = parseFloat(debt.amount).toFixed(0);
        }
      }
    }
  } catch {
    student_fees_debt = student.fees_debt || student.debt || '0.00';
  }

  let class_fees_announcements = {};
  try {
    let feesAnnouncementsResult;
    try {
      feesAnnouncementsResult = await query(
        `SELECT announcement_index, announcement_text FROM fees_announcements
         WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4 AND term = $5
         ORDER BY announcement_index`,
        [form, normalizedStream, 'NA', yearNum, normalizedTerm]
      );
    } catch (e) {
      if (e.message && e.message.includes('column') && e.message.includes('term')) {
        feesAnnouncementsResult = await query(
          `SELECT announcement_index, announcement_text FROM fees_announcements
           WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4
           ORDER BY announcement_index`,
          [form, normalizedStream, 'NA', yearNum]
        );
      } else {
        throw e;
      }
    }
    feesAnnouncementsResult.rows.forEach((row) => {
      const index =
        row.announcement_index ||
        (feesAnnouncementsResult.rows.indexOf(row) + 1).toString();
      class_fees_announcements[index.toString()] = row.announcement_text || '';
    });
  } catch {
    class_fees_announcements = {};
  }

  return {
    comments,
    tabia_mwenendo,
    student_parish,
    student_fees_debt,
    class_fees_announcements,
  };
}

module.exports = {
  FORM_I_TO_IV,
  getStudentIndexListQuery,
  studentIndexForAdmNo,
  buildAdmNoToStudentIndexMap,
  loadReportStudentExtras,
};
