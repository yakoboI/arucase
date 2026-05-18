/**
 * Permanently remove all students in a class (level + stream + year [+ term])
 * and related per-student records. Runs in a single DB transaction.
 *
 * Does NOT delete class configuration: subjects, subject_teachers, fees_announcements.
 */
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('../config/cloudinary');
const { parseClassScope } = require('./classScope');

async function tableHasColumn(client, tableName, columnName) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  );
  return r.rows.length > 0;
}

async function deleteByClass(client, table, { levelValues, streams, yearNum, termValues, termColumn }) {
  const params = [levelValues, streams, yearNum];
  let sql = `DELETE FROM ${table} WHERE level = ANY($1::text[]) AND stream = ANY($2::text[]) AND year = $3`;
  if (termValues && termColumn) {
    sql += ` AND ${termColumn} = ANY($4::text[])`;
    params.push(termValues);
  }
  sql += ' RETURNING id';
  const result = await client.query(sql, params);
  return result.rowCount || 0;
}

async function deleteScores(client, scope) {
  const hasTerm = await tableHasColumn(client, 'individual_scores', 'term');
  const params = [scope.levelValues, scope.streams, scope.yearNum];
  let sql = `DELETE FROM individual_scores
    WHERE level = ANY($1::text[]) AND stream = ANY($2::text[]) AND year = $3`;
  if (scope.termValues && hasTerm) {
    sql += ' AND term = ANY($4::text[])';
    params.push(scope.termValues);
  }
  const result = await client.query(sql, params);
  return result.rowCount || 0;
}

async function deleteStudents(client, scope) {
  const params = [scope.levelValues, scope.streams, scope.yearNum];
  let sql = `DELETE FROM students
    WHERE level = ANY($1::text[]) AND stream = ANY($2::text[]) AND year = $3`;
  if (scope.termValues) {
    sql += ' AND term = ANY($4::text[])';
    params.push(scope.termValues);
  }
  sql += ' RETURNING adm_no';
  const result = await client.query(sql, params);
  return {
    count: result.rowCount || 0,
    admNos: result.rows.map((r) => r.adm_no),
  };
}

async function deleteByAdmNos(client, table, admNos, extraSql = '', extraParams = []) {
  if (!admNos.length) return 0;
  const result = await client.query(
    `DELETE FROM ${table} WHERE adm_no = ANY($1::text[])${extraSql}`,
    [admNos, ...extraParams]
  );
  return result.rowCount || 0;
}

async function collectPhotosForClass(client, scope) {
  const result = await client.query(
    `SELECT photo_filename, cloudinary_public_id FROM student_photos
     WHERE level = ANY($1::text[]) AND stream = ANY($2::text[]) AND year = $3`,
    [scope.levelValues, scope.streams, scope.yearNum]
  );
  return result.rows;
}

async function destroyCloudinaryAsset(row) {
  try {
    if (row.cloudinary_public_id) {
      await cloudinary.uploader.destroy(row.cloudinary_public_id);
      return;
    }
    const filename = row.photo_filename || '';
    if (filename.startsWith('http')) {
      const publicId = filename.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`student-photos/${publicId}`);
    }
  } catch (err) {
    console.warn('[purgeStudentsByClass] Cloudinary delete failed:', err.message);
  }
}

async function destroyLocalPhoto(filename) {
  if (!filename || filename.startsWith('http')) return;
  try {
    const filePath = path.join(__dirname, '..', 'static', 'uploads', 'photos', filename);
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('[purgeStudentsByClass] Local photo delete failed:', err.message);
    }
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {{ level: string, stream: string, year: number|string, term?: string }} scopeInput
 */
async function purgeStudentsByClass(client, scopeInput) {
  const scope = parseClassScope(scopeInput);
  const deleted = {
    students: 0,
    individual_scores: 0,
    student_photos: 0,
    student_parishes: 0,
    comments: 0,
    monthly_results: 0,
    tabia_mwenendo: 0,
    individual_debt: 0,
    promotion_exclusions: 0,
    promotion_sessions: 0,
    student_history: 0,
    student_pass_ids: 0,
    score_change_audit: 0,
  };

  const photosToDestroy = await collectPhotosForClass(client, scope);

  deleted.individual_scores = await deleteScores(client, scope);

  const auditTable = await client.query(
    `SELECT to_regclass('public.score_change_audit') AS reg`
  );
  if (auditTable.rows[0]?.reg) {
    deleted.score_change_audit = await deleteByClass(client, 'score_change_audit', {
      ...scope,
      termColumn: null,
    });
  }
  deleted.student_photos = await deleteByClass(client, 'student_photos', {
    ...scope,
    termColumn: null,
  });
  deleted.student_parishes = await deleteByClass(client, 'student_parishes', {
    ...scope,
    termColumn: null,
  });
  deleted.comments = await deleteByClass(client, 'comments', {
    ...scope,
    termColumn: 'term',
  });
  deleted.monthly_results = await deleteByClass(client, 'monthly_results', {
    ...scope,
    termColumn: null,
  });
  deleted.tabia_mwenendo = await deleteByClass(client, 'tabia_mwenendo', {
    ...scope,
    termColumn: 'term',
  });
  deleted.individual_debt = await deleteByClass(client, 'individual_debt', {
    ...scope,
    termColumn: null,
  });

  deleted.promotion_exclusions = (
    await client.query(
      `DELETE FROM promotion_exclusions
       WHERE level = ANY($1::text[]) AND stream = ANY($2::text[]) AND year = $3`,
      [scope.levelValues, scope.streams, scope.yearNum]
    )
  ).rowCount;

  deleted.promotion_sessions = (
    await client.query(
      `DELETE FROM promotion_sessions
       WHERE from_level = ANY($1::text[]) AND from_stream = ANY($2::text[]) AND from_year = $3`,
      [scope.levelValues, scope.streams, scope.yearNum]
    )
  ).rowCount;

  deleted.student_history = (
    await client.query(
      `DELETE FROM student_history
       WHERE current_level = ANY($1::text[]) AND current_stream = ANY($2::text[]) AND current_year = $3`,
      [scope.levelValues, scope.streams, scope.yearNum]
    )
  ).rowCount;

  const studentResult = await deleteStudents(client, scope);
  deleted.students = studentResult.count;

  if (studentResult.admNos.length > 0) {
    deleted.student_pass_ids = await deleteByAdmNos(client, 'student_pass_ids', studentResult.admNos);
  }

  for (const photo of photosToDestroy) {
    await destroyCloudinaryAsset(photo);
    await destroyLocalPhoto(photo.photo_filename);
  }

  return {
    scope: {
      level: scope.primaryLevel,
      stream: scope.streams.join('/'),
      year: scope.yearNum,
      term: scope.termValues ? scope.termValues[0] : null,
      label: scope.label,
    },
    deleted,
    admNos: studentResult.admNos,
  };
}

module.exports = { purgeStudentsByClass, parseClassScope };
