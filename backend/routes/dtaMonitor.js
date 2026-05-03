/**
 * DTA Monitor Routes - Score Change Audit Trail
 */
const express = require('express');
const router = express.Router();
const { query, withTransaction } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendError } = require('../utils/safeError');

// Get all score changes with filters
router.get('/changes', requireAuth, async (req, res) => {
  try {
    const {
      student_adm_no,
      level,
      stream,
      year,
      month,
      subject_code,
      changed_by,
      date_from,
      date_to,
      change_count_min,
      page = 1,
      limit = 50
    } = req.query;

    let queryText = `
      SELECT 
        id,
        student_adm_no,
        student_name,
        level,
        stream,
        year,
        month,
        subject_code,
        subject_name,
        initial_score,
        current_score,
        change_count,
        change_history,
        last_changed_by,
        last_changed_at,
        created_at,
        updated_at
      FROM score_change_audit
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (student_adm_no) {
      queryText += ` AND student_adm_no = $${paramCount++}`;
      params.push(student_adm_no);
    }

    if (level) {
      queryText += ` AND level = $${paramCount++}`;
      params.push(level.toUpperCase());
    }

    if (stream) {
      queryText += ` AND stream = $${paramCount++}`;
      params.push(stream);
    }

    if (year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(parseInt(year));
    }

    if (month) {
      queryText += ` AND month = $${paramCount++}`;
      params.push(month);
    }

    if (subject_code) {
      queryText += ` AND subject_code = $${paramCount++}`;
      params.push(subject_code);
    }

    if (changed_by) {
      queryText += ` AND last_changed_by = $${paramCount++}`;
      params.push(changed_by);
    }

    if (date_from) {
      queryText += ` AND last_changed_at >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      queryText += ` AND last_changed_at <= $${paramCount++}`;
      params.push(date_to);
    }

    if (change_count_min) {
      queryText += ` AND change_count >= $${paramCount++}`;
      params.push(parseInt(change_count_min));
    }

    // Order by most recent changes first
    queryText += ` ORDER BY last_changed_at DESC NULLS LAST, created_at DESC`;

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryText += ` LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), offset);

    const result = await query(queryText, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM score_change_audit WHERE 1=1`;
    let countParams = [];
    let countParamCount = 1;

    if (student_adm_no) {
      countQuery += ` AND student_adm_no = $${countParamCount++}`;
      countParams.push(student_adm_no);
    }
    if (level) {
      countQuery += ` AND level = $${countParamCount++}`;
      countParams.push(level.toUpperCase());
    }
    if (stream) {
      countQuery += ` AND stream = $${countParamCount++}`;
      countParams.push(stream);
    }
    if (year) {
      countQuery += ` AND year = $${countParamCount++}`;
      countParams.push(parseInt(year));
    }
    if (month) {
      countQuery += ` AND month = $${countParamCount++}`;
      countParams.push(month);
    }
    if (subject_code) {
      countQuery += ` AND subject_code = $${countParamCount++}`;
      countParams.push(subject_code);
    }
    if (changed_by) {
      countQuery += ` AND last_changed_by = $${countParamCount++}`;
      countParams.push(changed_by);
    }
    if (date_from) {
      countQuery += ` AND last_changed_at >= $${countParamCount++}`;
      countParams.push(date_from);
    }
    if (date_to) {
      countQuery += ` AND last_changed_at <= $${countParamCount++}`;
      countParams.push(date_to);
    }
    if (change_count_min) {
      countQuery += ` AND change_count >= $${countParamCount++}`;
      countParams.push(parseInt(change_count_min));
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      changes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching DTA Monitor changes:', error);
    return sendError(res, error, 500);
  }
});

// Get specific change record details
router.get('/changes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM score_change_audit WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Change record not found' });
    }

    res.json({ change: result.rows[0] });
  } catch (error) {
    console.error('Error fetching DTA Monitor change details:', error);
    return sendError(res, error, 500);
  }
});

// Get statistics
router.get('/statistics', requireAuth, async (req, res) => {
  try {
    // Total changes
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM score_change_audit WHERE change_count > 0`
    );

    // Most changed subject
    const subjectResult = await query(`
      SELECT subject_name, COUNT(*) as count
      FROM score_change_audit
      WHERE change_count > 0
      GROUP BY subject_name
      ORDER BY count DESC
      LIMIT 5
    `);

    // Most active user
    const userResult = await query(`
      SELECT last_changed_by, COUNT(*) as count
      FROM score_change_audit
      WHERE change_count > 0 AND last_changed_by IS NOT NULL
      GROUP BY last_changed_by
      ORDER BY count DESC
      LIMIT 5
    `);

    // Today's changes
    const todayResult = await query(`
      SELECT COUNT(*) as total
      FROM score_change_audit
      WHERE DATE(last_changed_at) = CURRENT_DATE
    `);

    // Changes by level
    const levelResult = await query(`
      SELECT level, COUNT(*) as count
      FROM score_change_audit
      WHERE change_count > 0
      GROUP BY level
      ORDER BY count DESC
    `);

    res.json({
      totalChanges: parseInt(totalResult.rows[0].total),
      mostChangedSubjects: subjectResult.rows,
      mostActiveUsers: userResult.rows,
      todayChanges: parseInt(todayResult.rows[0].total),
      changesByLevel: levelResult.rows
    });
  } catch (error) {
    console.error('Error fetching DTA Monitor statistics:', error);
    return sendError(res, error, 500);
  }
});

// Clear all DTA Monitor records (Admin only)
router.delete('/clear', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
    let deleteQuery = 'DELETE FROM score_change_audit';
    const params = [];
    let paramIndex = 1;
    
    // Add date filtering if provided
    if (date_from || date_to) {
      const conditions = [];
      
      if (date_from) {
        conditions.push(`last_changed_at >= $${paramIndex}`);
        params.push(date_from);
        paramIndex++;
      }
      
      if (date_to) {
        conditions.push(`last_changed_at <= $${paramIndex}`);
        params.push(date_to + ' 23:59:59');
        paramIndex++;
      }
      
      deleteQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = await query(deleteQuery, params);
    
    res.json({
      message: 'DTA Monitor records cleared successfully',
      deletedCount: result.rowCount
    });
  } catch (error) {
    console.error('Error clearing DTA Monitor records:', error);
    return sendError(res, error, 500);
  }
});

module.exports = router;
