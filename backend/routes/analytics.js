/**
 * Analytics Routes
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const { normalizeStream } = require('../utils/streamNormalizer');
const { sendError } = require('../utils/safeError');
const { calculateGrade } = require('../utils/calculations');

// Month ordering CASE statement for SQL queries (reused across multiple queries)
const MONTH_ORDER_CASE = `
  CASE month
    WHEN 'Jrb1' THEN 1
    WHEN 'Robo' THEN 2
    WHEN 'Jrb2' THEN 3
    WHEN 'Nusu' THEN 4
    WHEN 'Muh' THEN 5
    WHEN 'February' THEN 1
    WHEN 'March' THEN 2
    WHEN 'April' THEN 3
    WHEN 'May' THEN 4
    WHEN 'August' THEN 5
    WHEN 'September' THEN 6
    WHEN 'October' THEN 7
    WHEN 'November' THEN 8
    ELSE 9
  END`;

router.use(requireAuth);

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get student counts by form
    const studentsResult = await query(`
      SELECT 
        level,
        COUNT(*) as total
      FROM students
      WHERE status != 'ARCHIVED'
      GROUP BY level
      ORDER BY level
    `);

    const formCounts = {};
    studentsResult.rows.forEach(row => {
      formCounts[row.level] = parseInt(row.total);
    });

    // Get average scores by form
    const scoresResult = await query(`
      SELECT 
        level,
        AVG(score) as avg_score,
        COUNT(*) as score_count
      FROM individual_scores
      WHERE score IS NOT NULL AND score > 0
      GROUP BY level
      ORDER BY level
    `);

    const formAverages = {};
    scoresResult.rows.forEach(row => {
      formAverages[row.level] = {
        average: parseFloat(row.avg_score) || 0,
        count: parseInt(row.score_count) || 0,
      };
    });

    // Get subject counts by form
    const subjectsResult = await query(`
      SELECT 
        level,
        COUNT(DISTINCT subject_code) as subject_count
      FROM subjects
      GROUP BY level
      ORDER BY level
    `);

    const formSubjects = {};
    subjectsResult.rows.forEach(row => {
      formSubjects[row.level] = parseInt(row.subject_count) || 0;
    });

    res.json({
      form_counts: formCounts,
      form_averages: formAverages,
      form_subjects: formSubjects,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Search students
router.get('/search-students', async (req, res) => {
  try {
    let { q, form } = req.query;
    
    if (!q || q.length < 3) {
      return res.json({ students: [] });
    }

    // Normalize search query - trim and prepare for ILIKE
    const searchQuery = `%${q.trim()}%`;
    
    // Normalize form to uppercase for matching
    if (form) {
      form = form.trim().toUpperCase();
    }
    
    let sql = `
      SELECT DISTINCT
        adm_no,
        first_name,
        middle_name,
        surname,
        level,
        stream,
        year,
        CASE 
          WHEN middle_name IS NULL OR middle_name = '' THEN
            TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(surname, '')))
          ELSE
            TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(middle_name, ''), ' ', COALESCE(surname, '')))
        END as name
      FROM students
      WHERE (
        adm_no ILIKE $1 OR
        first_name ILIKE $1 OR
        COALESCE(middle_name, '') ILIKE $1 OR
        surname ILIKE $1 OR
        CASE 
          WHEN middle_name IS NULL OR middle_name = '' THEN
            TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(surname, '')))
          ELSE
            TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(middle_name, ''), ' ', COALESCE(surname, '')))
        END ILIKE $1
      )
      AND status != 'ARCHIVED'
    `;
    
    const params = [searchQuery];
    let paramCount = 2;
    
    if (form) {
      sql += ` AND UPPER(TRIM(level)) = $${paramCount}`;
      params.push(form);
      paramCount++;
    }
    
    sql += ' ORDER BY first_name, middle_name, surname, adm_no LIMIT 20';
    
    const result = await query(sql, params);
    
    res.json({ students: result.rows });
  } catch (error) {
    console.error('[ANALYTICS SEARCH] Error:', error);
    return sendError(res, error, 500);
  }
});

// Get student performance data
router.get('/student/:admNo/performance', async (req, res) => {
  try {
    const { admNo } = req.params;
    let { form, stream, year, term } = req.query;
    
    // Normalize stream: NA -> A
    if (stream) {
      stream = normalizeStream(stream);
    }
    
    // Normalize form to uppercase
    if (form) {
      form = form.trim().toUpperCase();
    }
    
    // For FORM V/VI, handle academic year logic
    // If year is an end year (e.g., 2026), also check for start year (e.g., 2025)
    const isFormVOrVI = form && (form === 'FORM V' || form === 'FORM VI');
    const isFormIV = form && /^FORM\s+(I|II|III|IV)$/.test(form);
    let yearNum = year ? parseInt(year) : null;
    
    // First, try to find the student with the given year
    // For FORM I-IV, check both stream 'A' and 'NA' (students may have either)
    let studentQuery = 'SELECT * FROM students WHERE adm_no = $1 AND level = $2';
    const studentParams = [admNo, form];
    let paramCount = 3;
    
    // Handle stream: For FORM I-IV, check both 'A' and 'NA'
    if (isFormIV && (stream === 'A' || stream === 'NA')) {
      studentQuery += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
      studentParams.push('A', 'NA');
      paramCount += 2;
    } else {
      studentQuery += ` AND stream = $${paramCount}`;
      studentParams.push(stream);
      paramCount++;
    }
    
    if (year && !isNaN(yearNum) && yearNum > 0) {
      if (isFormVOrVI && yearNum > 2025) {
        // Check if this is an end year - if so, also check for start year
        // Example: year 2026 could be end year of 2025-2026 academic year
        const previousYearAcademicYear = yearNum - 1;
        studentQuery += ` AND (year = $${paramCount} OR year = $${paramCount + 1})`;
        studentParams.push(yearNum, previousYearAcademicYear);
        paramCount += 2;
      } else {
        studentQuery += ` AND year = $${paramCount}`;
        studentParams.push(yearNum);
        paramCount++;
      }
    }
    
    studentQuery += ' ORDER BY year DESC LIMIT 1';
    
    // Get student info
    let studentResult = await query(studentQuery, studentParams);
    
    // If not found and it's FORM V/VI, try without year filter
    if (studentResult.rows.length === 0 && isFormVOrVI) {
      studentQuery = 'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 ORDER BY year DESC LIMIT 1';
      studentResult = await query(studentQuery, [admNo, form, stream]);
    }
    
    // If not found and it's FORM I-IV, try without stream filter (in case stream mismatch)
    if (studentResult.rows.length === 0 && isFormIV) {
      studentQuery = 'SELECT * FROM students WHERE adm_no = $1 AND level = $2 ORDER BY year DESC LIMIT 1';
      studentResult = await query(studentQuery, [admNo, form]);
    }
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    const studentYear = student.year;
    
    // Get all scores across all years for continuous time series
    // For FORM I-IV, check both stream 'A' and 'NA' (scores may be stored with either)
    // For FORM V/VI, get scores from both academic year years if applicable
    let scoresQuery = `SELECT 
        subject_code,
        month,
        year,
        score
      FROM individual_scores
      WHERE adm_no = $1 AND level = $2`;
    const scoresParams = [admNo, form];
    let scoresParamCount = 3;
    
    // Handle stream: For FORM I-IV, check both 'A' and 'NA'
    if (isFormIV && (stream === 'A' || stream === 'NA')) {
      scoresQuery += ` AND (stream = $${scoresParamCount} OR stream = $${scoresParamCount + 1})`;
      scoresParams.push('A', 'NA');
      scoresParamCount += 2;
    } else {
      scoresQuery += ` AND stream = $${scoresParamCount}`;
      scoresParams.push(stream);
      scoresParamCount++;
    }
    
    // Use calendar year directly for all forms (no expansion logic)
    if (year && !isNaN(yearNum) && yearNum > 0) {
      scoresQuery += ` AND year = $${scoresParamCount}`;
      scoresParams.push(yearNum);
      scoresParamCount++;
    }
    if (term && term.trim()) {
      scoresQuery += ` AND term = $${scoresParamCount}`;
      scoresParams.push(term.trim());
      scoresParamCount++;
    }
    // If no year filter, get all scores
    
    scoresQuery += ` ORDER BY year, ${MONTH_ORDER_CASE}, subject_code`;
    
    const scoresResult = await query(scoresQuery, scoresParams);
    
    // Organize scores by subject and month
    const scoresBySubject = {};
    const scoresByMonth = {};
    
    scoresResult.rows.forEach(row => {
      const monthYear = `${row.month} ${row.year}`;
      
      if (!scoresBySubject[row.subject_code]) {
        scoresBySubject[row.subject_code] = {};
      }
      scoresBySubject[row.subject_code][monthYear] = parseFloat(row.score);
      
      if (!scoresByMonth[monthYear]) {
        scoresByMonth[monthYear] = {};
      }
      scoresByMonth[monthYear][row.subject_code] = parseFloat(row.score);
    });
    
    // Calculate averages
    const subjectAverages = {};
    Object.keys(scoresBySubject).forEach(subjectCode => {
      const subjectScores = Object.values(scoresBySubject[subjectCode]);
      const avg = subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length;
      subjectAverages[subjectCode] = avg;
    });
    
    res.json({
      student,
      scores_by_subject: scoresBySubject,
      scores_by_month: scoresByMonth,
      subject_averages: subjectAverages,
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get class performance data
router.get('/class/performance', async (req, res) => {
  try {
    let { form, stream, year } = req.query;
    
    if (!form || !stream) {
      return res.status(400).json({ message: 'form and stream are required' });
    }
    
    // Normalize form to uppercase
    form = form.trim().toUpperCase();
    
    // Normalize stream: NA -> A
    stream = normalizeStream(stream);
    
    // For FORM I-IV, check both stream 'A' and 'NA' (data may be stored with either)
    const isFormIV = /^FORM\s+(I|II|III|IV)$/.test(form);
    const streamCondition = isFormIV && (stream === 'A' || stream === 'NA')
      ? 'AND (stream = $2 OR stream = $3)'
      : 'AND stream = $2';
    const streamParams = isFormIV && (stream === 'A' || stream === 'NA')
      ? [form, 'A', 'NA']
      : [form, stream];
    const yearParamIndex = streamParams.length + 1;
    
    // First, get list of registered students for this class/year to filter scores
    let registeredStudentsSql = `SELECT DISTINCT adm_no FROM students WHERE level = $1 ${streamCondition}`;
    const registeredStudentsParams = [...streamParams];
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        registeredStudentsSql += ` AND year = $${yearParamIndex}`;
        registeredStudentsParams.push(yearNum);
      }
    }
    
    const registeredStudentsResult = await query(registeredStudentsSql, registeredStudentsParams);
    const registeredAdmNos = registeredStudentsResult.rows.map(row => row.adm_no);
    
    if (registeredAdmNos.length === 0) {
      return res.json({
        monthly_averages: [],
        subject_averages: [],
        grade_distribution: [],
      });
    }
    
    // Build parameters for individual_scores queries
    const monthlyParams = [...streamParams];
    let yearFilter = '';
    let admNoParamIndex = streamParams.length + 1;
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        yearFilter = `AND individual_scores.year = $${admNoParamIndex}`;
        monthlyParams.push(yearNum);
        admNoParamIndex++;
      }
    }
    
    // Add registered adm_nos array
    monthlyParams.push(registeredAdmNos);
    
    // Get monthly averages - only from registered students in the class
    const monthlyResult = await query(
      `SELECT 
        individual_scores.month,
        individual_scores.year,
        AVG(individual_scores.score) as avg_score,
        COUNT(DISTINCT individual_scores.adm_no) as student_count
      FROM individual_scores
      WHERE individual_scores.level = $1 ${streamCondition} ${yearFilter}
        AND individual_scores.adm_no = ANY($${admNoParamIndex}::text[])
      GROUP BY individual_scores.month, individual_scores.year
      ORDER BY individual_scores.year, 
        CASE individual_scores.month
          WHEN 'February' THEN 1
          WHEN 'March' THEN 2
          WHEN 'April' THEN 3
          WHEN 'May' THEN 4
          WHEN 'August' THEN 5
          WHEN 'September' THEN 6
          WHEN 'October' THEN 7
          WHEN 'November' THEN 8
          WHEN 'January' THEN 9
          WHEN 'Jrb1' THEN 1
          WHEN 'Robo' THEN 2
          WHEN 'Jrb2' THEN 3
          WHEN 'Nusu' THEN 4
          WHEN 'Muh' THEN 5
          ELSE 10
        END`,
      monthlyParams
    );
    
    // Get subject averages - only from registered students in the class
    let subjectSql = `SELECT 
        individual_scores.subject_code,
        AVG(individual_scores.score) as avg_score,
        COUNT(DISTINCT individual_scores.adm_no) as student_count
      FROM individual_scores
      WHERE individual_scores.level = $1 ${streamCondition} ${yearFilter}
        AND individual_scores.adm_no = ANY($${admNoParamIndex}::text[])`;
    
    subjectSql += ' GROUP BY individual_scores.subject_code ORDER BY individual_scores.subject_code';
    
    const subjectResult = await query(subjectSql, monthlyParams);
    
    // For grade distribution: Calculate average of monthly results for each registered student, then convert to grade
    // monthly_results.stream is normalized (A for both A and NA in FORM I-IV)
    const gradeStreamCondition = isFormIV && (stream === 'A' || stream === 'NA')
      ? 'AND monthly_results.stream = $2'  // Use normalized stream 'A'
      : 'AND monthly_results.stream = $2';
    const gradeStreamParams = isFormIV && (stream === 'A' || stream === 'NA')
      ? [form, 'A']  // Use normalized stream
      : [form, stream];
    
    let gradeYearFilter = '';
    let gradeYearParamIndex = gradeStreamParams.length + 1;
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        gradeYearFilter = `AND monthly_results.year = $${gradeYearParamIndex}`;
        gradeStreamParams.push(yearNum);
        gradeYearParamIndex++;
      }
    }
    
    // Get all monthly_results averages for registered students
    // Calculate student_index for registered students (0-based, matching how monthly_results stores it)
    let studentIndexSql = `SELECT 
        adm_no,
        ROW_NUMBER() OVER (ORDER BY adm_no) - 1 as student_index
      FROM students
      WHERE level = $1 ${streamCondition}`;
    const studentIndexParams = [...streamParams];
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        studentIndexSql += ` AND year = $${yearParamIndex}`;
        studentIndexParams.push(yearNum);
      }
    }
    
    const studentIndexResult = await query(studentIndexSql, studentIndexParams);
    const registeredStudentIndexesSet = new Set(
      studentIndexResult.rows.map(row => row.student_index)
    );
    
    let gradeResult = { rows: [] };
    
    if (registeredStudentIndexesSet.size > 0) {
      // Get average of monthly results for each registered student
      // Build parameters array
      const studentAveragesParams = [...gradeStreamParams];
      const studentIndexArrayParamIndex = studentAveragesParams.length + 1;
      studentAveragesParams.push(Array.from(registeredStudentIndexesSet));
      
      const studentAveragesSql = `SELECT 
          monthly_results.student_index,
          AVG(monthly_results.average) as avg_average
        FROM monthly_results
        WHERE monthly_results.level = $1 ${gradeStreamCondition} ${gradeYearFilter}
          AND monthly_results.average IS NOT NULL
          AND CAST(monthly_results.student_index AS INTEGER) = ANY($${studentIndexArrayParamIndex}::int[])
        GROUP BY monthly_results.student_index`;
      
      const studentAveragesResult = await query(studentAveragesSql, studentAveragesParams);
      
      // Calculate grade for each student based on their average of monthly averages
      const gradeCountMap = new Map();
      
      studentAveragesResult.rows.forEach(row => {
        if (row.avg_average !== null && row.avg_average !== undefined) {
          const average = parseFloat(row.avg_average);
          const grade = calculateGrade(average, form);
          gradeCountMap.set(grade, (gradeCountMap.get(grade) || 0) + 1);
        }
      });
      
      gradeResult = {
        rows: Array.from(gradeCountMap.entries()).map(([grade, count]) => ({
          grade,
          count
        })).sort((a, b) => {
          // Sort grades: A, B, C, D, E, S, F (for A-Level) or A, B, C, D, F (for O-Level)
          const gradeOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'S': 6, 'F': 7 };
          return (gradeOrder[a.grade] || 99) - (gradeOrder[b.grade] || 99);
        })
      };
    }
    
    res.json({
      monthly_averages: monthlyResult.rows.map(row => ({
        month: row.month,
        year: parseInt(row.year),
        monthYear: `${row.month} ${row.year}`,
        average: parseFloat(row.avg_score) || 0,
        student_count: parseInt(row.student_count) || 0,
      })),
      subject_averages: subjectResult.rows.map(row => ({
        subject_code: row.subject_code,
        average: parseFloat(row.avg_score) || 0,
        student_count: parseInt(row.student_count) || 0,
      })),
      grade_distribution: gradeResult.rows.map(row => ({
        grade: row.grade,
        count: parseInt(row.count) || 0,
      })),
    });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Get subject performance data
router.get('/subject/performance', async (req, res) => {
  try {
    let { form, stream, year, subject_code } = req.query;
    
    if (!form || !subject_code) {
      return res.status(400).json({ message: 'form and subject_code are required' });
    }
    
    // Normalize form to uppercase
    form = form.trim().toUpperCase();
    
    // Decode subject_code in case it's URL encoded (e.g., A%2FCHE -> A/CHE)
    subject_code = decodeURIComponent(subject_code);
        
    // Determine if Form V/VI
    const isFormVOrVI = form.includes('FORM V') || form.includes('FORM VI');
        
    let sql = `
      SELECT 
        month,
        year,
        AVG(score) as avg_score,
        COUNT(*) as student_count
      FROM individual_scores
      WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND subject_code = $2
    `;
        
    const params = [form, subject_code];
    
    if (stream && stream !== 'NA') {
      if (isFormVOrVI) {
        // Form V/VI: use stream as-is
        sql += ' AND stream = $3';
        params.push(stream);
      } else {
        // Form I-IV: check both 'A' and 'NA' for legacy data
        sql += ' AND stream IN ($3, $4)';
        params.push('A', 'NA');
      }
    }
    
    // Don't filter by year to show continuous time series across all years
    // if (year) {
    //   sql += stream ? ' AND year = $4' : ' AND year = $3';
    //   params.push(parseInt(year));
    // }
    
    sql += ` GROUP BY month, year ORDER BY year, ${MONTH_ORDER_CASE}`;
    
    const monthlyResult = await query(sql, params);
    
    // Get score distribution
    const distributionParams = [form, subject_code];
    let distributionSql = `
      SELECT 
        CASE
          WHEN score >= 85 THEN 'A'
          WHEN score >= 70 THEN 'B'
          WHEN score >= 50 THEN 'C'
          WHEN score >= 40 THEN 'D'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
      FROM individual_scores
      WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND subject_code = $2`;
    
    if (stream && stream !== 'NA') {
      if (isFormVOrVI) {
        // Form V/VI: use stream as-is
        distributionSql += ' AND stream = $3';
        distributionParams.push(stream);
      } else {
        // Form I-IV: check both 'A' and 'NA' for legacy data
        distributionSql += ' AND stream IN ($3, $4)';
        distributionParams.push('A', 'NA');
      }
    }
    
    if (year) {
      // Calculate correct parameter index based on stream handling
      let paramIndex;
      if (stream && stream !== 'NA') {
        if (isFormVOrVI) {
          paramIndex = 4; // Form V/VI: stream is $3, year is $4
        } else {
          paramIndex = 5; // Form I-IV: stream IN ($3, $4), year is $5
        }
      } else {
        paramIndex = 3; // No stream filter, year is $3
      }
      distributionSql += ` AND year = $${paramIndex}`;
      distributionParams.push(parseInt(year));
    }
    
    distributionSql += ' GROUP BY grade ORDER BY grade';
    
    const distributionResult = await query(distributionSql, distributionParams);
    
    res.json({
      monthly_averages: monthlyResult.rows.map(row => ({
        month: row.month,
        year: parseInt(row.year),
        monthYear: `${row.month} ${row.year}`,
        average: parseFloat(row.avg_score) || 0,
        student_count: parseInt(row.student_count) || 0,
      })),
      grade_distribution: distributionResult.rows.map(row => ({
        grade: row.grade,
        count: parseInt(row.count) || 0,
      })),
    });
  } catch (error) {
    console.error('[SUBJECT PERFORMANCE] Error:', error);
    console.error('[SUBJECT PERFORMANCE] Error stack:', error.stack);
    return sendError(res, error, 500);
  }
});

// Get all forms averages - monthly breakdown (optimized)
router.get('/all-forms-averages', async (req, res) => {
  try {
    const forms = ['FORM I', 'FORM II', 'FORM III', 'FORM IV', 'FORM V', 'FORM VI'];
    const formsData = {};
    
    // Process each form in parallel for better performance
    const formPromises = forms.map(async (form) => {
      try {
        // Get all monthly averages in a single optimized query
        // This combines the monthly_results lookup with fallback calculation
        const monthlyData = await query(`
          WITH monthly_results_data AS (
            SELECT 
              year,
              month,
              AVG(average) as class_average,
              COUNT(*) as student_count,
              COUNT(DISTINCT stream) as stream_count,
              'monthly_results' as source
            FROM monthly_results
            WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
              AND average IS NOT NULL 
              AND average > 0
            GROUP BY year, month
          ),
          individual_data AS (
            SELECT 
              year,
              month,
              AVG(score) as class_average,
              COUNT(DISTINCT adm_no) as student_count,
              1 as stream_count,
              'individual' as source
            FROM individual_scores
            WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
              AND score IS NOT NULL 
              AND score >= 0
            GROUP BY year, month
            HAVING COUNT(*) > 0 AND AVG(score) > 0
          ),
          combined AS (
            SELECT * FROM monthly_results_data
            UNION ALL
            SELECT * FROM individual_data
            WHERE (year, month) NOT IN (SELECT year, month FROM monthly_results_data)
          )
          SELECT 
            year,
            month,
            MAX(class_average) as class_average,
            MAX(student_count) as student_count,
            MAX(stream_count) as stream_count
          FROM combined
          GROUP BY year, month
          ORDER BY year, ${MONTH_ORDER_CASE}
        `, [form]);
        
        const finalMonthlyData = monthlyData.rows.map(row => ({
          year: parseInt(row.year),
          month: row.month,
          monthYear: `${row.month} ${row.year}`,
          class_average: parseFloat(row.class_average) || 0,
          student_count: parseInt(row.student_count) || 0,
          stream_count: parseInt(row.stream_count) || 0,
        }));
        
        return { form, data: finalMonthlyData };
      } catch (formError) {
        console.error(`[ALL FORMS AVERAGES] Error processing form ${form}:`, formError);
        return { form, data: [] };
      }
    });
    
    const monthlyResults = await Promise.all(formPromises);
    monthlyResults.forEach(({ form, data }) => {
      formsData[form] = data;
    });
    
    // Get subject-level averages for each form and month (parallel processing)
    const subjectPromises = forms.map(async (form) => {
      try {
        const subjectAverages = await query(`
          SELECT 
            year,
            month,
            subject_code,
            AVG(score) as avg_score,
            COUNT(DISTINCT adm_no) as student_count,
            COUNT(*) as score_count
          FROM individual_scores
          WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
            AND score IS NOT NULL 
            AND score > 0
          GROUP BY year, month, subject_code
          HAVING COUNT(*) > 0 AND AVG(score) > 0
          ORDER BY year, ${MONTH_ORDER_CASE}, subject_code
        `, [form]);
        
        // Organize by month/year, then by subject
        const subjectDataByMonth = {};
        if (subjectAverages?.rows?.length) {
          subjectAverages.rows.forEach(row => {
            if (row?.month && row?.year && row?.subject_code) {
              const monthYear = `${row.month} ${row.year}`;
              if (!subjectDataByMonth[monthYear]) {
                subjectDataByMonth[monthYear] = {
                  month: row.month,
                  year: parseInt(row.year) || 0,
                  monthYear: monthYear,
                  subjects: {}
                };
              }
              subjectDataByMonth[monthYear].subjects[row.subject_code] = {
                subject_code: row.subject_code,
                average: parseFloat(row.avg_score) || 0,
                student_count: parseInt(row.student_count) || 0,
                score_count: parseInt(row.score_count) || 0,
              };
            }
          });
        }
        
        return { form, data: Object.values(subjectDataByMonth) };
      } catch (subjectError) {
        console.error(`[ALL FORMS AVERAGES] Error fetching subjects for ${form}:`, subjectError);
        return { form, data: [] };
      }
    });
    
    const subjectResults = await Promise.all(subjectPromises);
    const subjectAveragesData = {};
    subjectResults.forEach(({ form, data }) => {
      subjectAveragesData[form] = data;
    });
    
    // Get distinct student counts for each form (parallel processing)
    const studentCountPromises = forms.map(async (form) => {
      try {
        const distinctStudents = await query(`
          SELECT COUNT(DISTINCT adm_no) as total_students
          FROM individual_scores
          WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
            AND score IS NOT NULL 
            AND score >= 0
        `, [form]);
        
        const count = distinctStudents.rows.length > 0 && distinctStudents.rows[0]
          ? parseInt(distinctStudents.rows[0].total_students) || 0 
          : 0;
        return { form, count };
      } catch (error) {
        console.error(`[ALL FORMS AVERAGES] Error getting distinct students for ${form}:`, error);
        return { form, count: 0 };
      }
    });
    
    const studentCountResults = await Promise.all(studentCountPromises);
    const distinctStudentCounts = {};
    studentCountResults.forEach(({ form, count }) => {
      distinctStudentCounts[form] = count;
    });
    
    // Convert to array format matching Python version
    const formsArray = forms.map(form => ({
      level: form,
      averages: formsData[form] || [],
      subject_averages: subjectAveragesData[form] || [],
      distinct_student_count: distinctStudentCounts[form] || 0
    }));
    
    res.json({ forms: formsArray });
  } catch (error) {
    console.error('[ALL FORMS AVERAGES] Error:', error);
    console.error('[ALL FORMS AVERAGES] Error stack:', error.stack);
    return sendError(res, error, 500);
  }
});

// Get subjects for form
router.get('/subjects/:form', async (req, res) => {
  try {
    const { form } = req.params;
    const { stream, year } = req.query;
    
    // Normalize form to uppercase
    const normalizedForm = form.trim().toUpperCase();
    
    let sql = `
      SELECT DISTINCT subject_code
      FROM individual_scores
      WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
    `;
    
    const params = [normalizedForm];
    
    // For Form V/VI, don't filter by stream if not provided or if stream is 'NA'
    // For Form I-IV, normalize NA -> A and check both 'A' and 'NA' for legacy data
    if (stream && stream !== 'NA') {
      const normalizedFormUpper = normalizedForm.toUpperCase();
      if (normalizedFormUpper.includes('FORM V') || normalizedFormUpper.includes('FORM VI')) {
        // Form V/VI streams: use as-is
        sql += ' AND stream = $2';
        params.push(stream);
      } else {
        // Form I-IV: normalize NA -> A and check both 'A' and 'NA' for legacy data
        const normalizedStream = normalizeStream(stream);
        sql += ' AND stream IN ($2, $3)';
        params.push('A', 'NA');
      }
    }
    
    if (year) {
      // For Form I-IV with stream, we already added 2 params ('A' and 'NA'), so year is param 4
      // For Form V/VI with stream, stream is param 2, so year is param 3
      // For no stream, year is param 2
      let paramIndex;
      if (stream && stream !== 'NA') {
        const normalizedFormUpper = normalizedForm.toUpperCase();
        if (normalizedFormUpper.includes('FORM V') || normalizedFormUpper.includes('FORM VI')) {
          paramIndex = 3; // Form V/VI: stream is $2, year is $3
        } else {
          paramIndex = 4; // Form I-IV: stream IN ($2, $3), year is $4
        }
      } else {
        paramIndex = 2; // No stream filter, year is $2
      }
      sql += ` AND year = $${paramIndex}`;
      params.push(parseInt(year));
    }
    
    sql += ' ORDER BY subject_code';
    
    const result = await query(sql, params);
    
    res.json({
      subjects: result.rows.map(row => row.subject_code),
    });
  } catch (error) {
    console.error('[SUBJECTS] Error:', error);
    return sendError(res, error, 500);
  }
});

// Get who-and-when analytics - categorize students by performance trends
router.get('/who-and-when', async (req, res) => {
  try {
    let { form, stream, year } = req.query;
    
    if (!form) {
      return res.status(400).json({ message: 'form is required' });
    }
    
    // Normalize form to uppercase
    form = form.trim().toUpperCase();
    
    // Normalize stream: NA -> A (only for Form I-IV)
    let normalizedStream = null;
    if (stream && stream !== 'NA') {
      const isFormVOrVI = form.includes('FORM V') || form.includes('FORM VI');
      if (!isFormVOrVI) {
        normalizedStream = normalizeStream(stream);
      } else {
        normalizedStream = stream; // Form V/VI: use as-is
      }
    }
    
    // Get all students for the form/stream/year
    // For FORM I-IV: when stream is 'A', match both 'A' and 'NA' students
    const isFormIV = form.includes('FORM I') || form.includes('FORM II') || form.includes('FORM III') || form.includes('FORM IV');
    let studentsSql = `
      SELECT DISTINCT s.adm_no, s.first_name, s.middle_name, s.surname, s.stream, s.year
      FROM students s
      WHERE UPPER(TRIM(s.level)) = UPPER(TRIM($1))
    `;
    const studentsParams = [form];
    
    if (normalizedStream) {
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        // Match both 'A' and 'NA' for FORM I-IV
        studentsSql += ' AND (s.stream = $2 OR s.stream = $3)';
        studentsParams.push('A', 'NA');
      } else {
        studentsSql += ' AND s.stream = $2';
        studentsParams.push(normalizedStream);
      }
    }
    
    if (year) {
      const paramIndex = studentsParams.length + 1;
      studentsSql += ` AND s.year = $${paramIndex}`;
      studentsParams.push(parseInt(year));
    }
    
    studentsSql += ' ORDER BY s.adm_no';
    
    const studentsResult = await query(studentsSql, studentsParams);
    
    if (studentsResult.rows.length === 0) {
      return res.json({
        categories: {
          highPerformers: [],
          strugglingStudents: [],
          improvingStudents: [],
          decliningStudents: [],
          inconsistentPerformers: []
        }
      });
    }
    
    // Get performance data for each student
    const studentPerformanceMap = {};
    
    for (const student of studentsResult.rows) {
      const admNo = student.adm_no;
      const studentStream = student.stream;
      
      // Get all scores for this student across all months/years
      // Determine stream condition based on filter and form type
      let scoresStreamCondition = '';
      const scoresParams = [admNo, form];
      
      if (normalizedStream) {
        // Stream filter is provided
        if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
          // For FORM I-IV with stream 'A' or 'NA', match both in individual_scores
          scoresStreamCondition = ' AND (stream = $3 OR stream = $4)';
          scoresParams.push('A', 'NA');
        } else {
          scoresStreamCondition = ' AND stream = $3';
          scoresParams.push(normalizedStream);
        }
      } else {
        // No stream filter: use student's actual stream, but for FORM I-IV match both 'A' and 'NA'
        if (isFormIV && (studentStream === 'A' || studentStream === 'NA')) {
          scoresStreamCondition = ' AND (stream = $3 OR stream = $4)';
          scoresParams.push('A', 'NA');
        } else {
          scoresStreamCondition = ' AND stream = $3';
          scoresParams.push(studentStream);
        }
      }
      
      let scoresSql = `
        SELECT month, year, AVG(score) as avg_score, COUNT(*) as score_count
        FROM individual_scores
        WHERE adm_no = $1 AND level = $2${scoresStreamCondition}
      `;
      
      if (year) {
        const paramIndex = scoresParams.length + 1;
        scoresSql += ` AND year = $${paramIndex}`;
        scoresParams.push(parseInt(year));
      }
      
      scoresSql += `
        GROUP BY month, year
        ORDER BY year, ${MONTH_ORDER_CASE}
      `;
      
      const scoresResult = await query(scoresSql, scoresParams);
      
      const monthlyAverages = scoresResult.rows.map(row => ({
        month: row.month,
        year: parseInt(row.year),
        average: parseFloat(row.avg_score) || 0,
        scoreCount: parseInt(row.score_count) || 0
      }));
      
      // Calculate overall statistics
      const allScores = monthlyAverages.map(m => m.average);
      const overallAverage = allScores.length > 0 
        ? allScores.reduce((sum, val) => sum + val, 0) / allScores.length 
        : 0;
      
      // Calculate variance (for inconsistent performers)
      const variance = allScores.length > 1
        ? allScores.reduce((sum, val) => sum + Math.pow(val - overallAverage, 2), 0) / allScores.length
        : 0;
      const standardDeviation = Math.sqrt(variance);
      
      // Calculate trend (improving/declining)
      let trend = 'stable';
      if (monthlyAverages.length >= 2) {
        const firstHalf = monthlyAverages.slice(0, Math.ceil(monthlyAverages.length / 2));
        const secondHalf = monthlyAverages.slice(Math.ceil(monthlyAverages.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.average, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.average, 0) / secondHalf.length;
        
        const change = secondHalfAvg - firstHalfAvg;
        if (change > 5) {
          trend = 'improving';
        } else if (change < -5) {
          trend = 'declining';
        }
      }
      
      studentPerformanceMap[admNo] = {
        student: {
          admNo: student.adm_no,
          firstName: student.first_name,
          middleName: student.middle_name,
          surname: student.surname,
          stream: student.stream,
          year: student.year
        },
        monthlyAverages,
        overallAverage,
        standardDeviation,
        trend,
        scoreCount: monthlyAverages.reduce((sum, m) => sum + m.scoreCount, 0)
      };
    }
    
    // Categorize students
    const categories = {
      highPerformers: [],
      strugglingStudents: [],
      improvingStudents: [],
      decliningStudents: [],
      inconsistentPerformers: []
    };
    
    Object.values(studentPerformanceMap).forEach(performance => {
      const { overallAverage, standardDeviation, trend, monthlyAverages } = performance;
      
      // High Performers: average >= 75
      if (overallAverage >= 75 && monthlyAverages.length >= 2) {
        categories.highPerformers.push(performance);
      }
      
      // Struggling Students: average < 50
      if (overallAverage < 50 && monthlyAverages.length >= 2) {
        categories.strugglingStudents.push(performance);
      }
      
      // Improving Students: upward trend
      if (trend === 'improving' && monthlyAverages.length >= 2) {
        categories.improvingStudents.push(performance);
      }
      
      // Declining Students: downward trend
      if (trend === 'declining' && monthlyAverages.length >= 2) {
        categories.decliningStudents.push(performance);
      }
      
      // Inconsistent Performers: high variance (std dev > 15)
      if (standardDeviation > 15 && monthlyAverages.length >= 3) {
        categories.inconsistentPerformers.push(performance);
      }
    });
    
    // Sort each category by overall average (descending for high performers, ascending for struggling)
    categories.highPerformers.sort((a, b) => b.overallAverage - a.overallAverage);
    categories.strugglingStudents.sort((a, b) => a.overallAverage - b.overallAverage);
    categories.improvingStudents.sort((a, b) => {
      const aChange = a.monthlyAverages.length >= 2 
        ? a.monthlyAverages[a.monthlyAverages.length - 1].average - a.monthlyAverages[0].average
        : 0;
      const bChange = b.monthlyAverages.length >= 2
        ? b.monthlyAverages[b.monthlyAverages.length - 1].average - b.monthlyAverages[0].average
        : 0;
      return bChange - aChange;
    });
    categories.decliningStudents.sort((a, b) => {
      const aChange = a.monthlyAverages.length >= 2
        ? a.monthlyAverages[a.monthlyAverages.length - 1].average - a.monthlyAverages[0].average
        : 0;
      const bChange = b.monthlyAverages.length >= 2
        ? b.monthlyAverages[b.monthlyAverages.length - 1].average - b.monthlyAverages[0].average
        : 0;
      return aChange - bChange;
    });
    categories.inconsistentPerformers.sort((a, b) => b.standardDeviation - a.standardDeviation);
    
    res.json({
      categories,
      totalStudents: studentsResult.rows.length,
      form,
      stream: normalizedStream || 'all',
      year: year || 'all'
    });
  } catch (error) {
    console.error('[WHO-AND-WHEN] Error:', error);
    console.error('[WHO-AND-WHEN] Error stack:', error.stack);
    return sendError(res, error, 500);
  }
});

// Get solutions/recommendations based on analytics
router.get('/solutions', async (req, res) => {
  try {
    let { form, stream, year } = req.query;
    
    if (!form) {
      return res.status(400).json({ message: 'form is required' });
    }
    
    // Normalize form to uppercase
    form = form.trim().toUpperCase();
    
    // Normalize stream: NA -> A (only for Form I-IV)
    let normalizedStream = null;
    if (stream && stream !== 'NA') {
      const isFormVOrVI = form.includes('FORM V') || form.includes('FORM VI');
      if (!isFormVOrVI) {
        normalizedStream = normalizeStream(stream);
      } else {
        normalizedStream = stream; // Form V/VI: use as-is
      }
    }
    
    // For FORM I-IV: when stream is 'A', match both 'A' and 'NA' in individual_scores
    const isFormIV = form.includes('FORM I') || form.includes('FORM II') || form.includes('FORM III') || form.includes('FORM IV');
    
    const recommendations = {
      subjectSpecific: [],
      classLevel: [],
      studentLevel: [],
      teachingStrategies: [],
      resourceAllocation: []
    };
    
    // 1. Subject-specific recommendations
    let subjectSql = `
      SELECT 
        subject_code,
        AVG(score) as avg_score,
        COUNT(*) as score_count,
        COUNT(DISTINCT adm_no) as student_count
      FROM individual_scores
      WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
    `;
    const subjectParams = [form];
    
    if (normalizedStream) {
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        // For FORM I-IV with stream 'A' or 'NA', match both in individual_scores
        subjectSql += ' AND (stream = $2 OR stream = $3)';
        subjectParams.push('A', 'NA');
      } else {
        subjectSql += ' AND stream = $2';
        subjectParams.push(normalizedStream);
      }
    }
    
    if (year) {
      const paramIndex = subjectParams.length + 1;
      subjectSql += ` AND year = $${paramIndex}`;
      subjectParams.push(parseInt(year));
    }
    
    subjectSql += ' GROUP BY subject_code ORDER BY avg_score ASC';
    
    const subjectResult = await query(subjectSql, subjectParams);
    
    // Identify struggling subjects (average < 60)
    const strugglingSubjects = subjectResult.rows.filter(row => parseFloat(row.avg_score) < 60);
    strugglingSubjects.forEach(subject => {
      recommendations.subjectSpecific.push({
        type: 'struggling_subject',
        priority: 'high',
        title: `Low Performance in ${subject.subject_code}`,
        description: `Average score is ${parseFloat(subject.avg_score).toFixed(1)}%, which is below the 60% threshold.`,
        details: {
          subject: subject.subject_code,
          average: parseFloat(subject.avg_score),
          studentCount: parseInt(subject.student_count),
          scoreCount: parseInt(subject.score_count)
        },
        actions: [
          `Review teaching methods for ${subject.subject_code}`,
          `Provide additional support materials for ${subject.subject_code}`,
          `Consider remedial classes for struggling students in ${subject.subject_code}`,
          `Analyze common mistakes in ${subject.subject_code} assessments`
        ]
      });
    });
    
    // Identify subjects with declining trends
    for (const subject of subjectResult.rows) {
      const subjectCode = subject.subject_code;
      let trendSql = `
        SELECT month, year, AVG(score) as avg_score
        FROM individual_scores
        WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND subject_code = $2
      `;
      const trendParams = [form, subjectCode];
      
      if (normalizedStream) {
        if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
          // For FORM I-IV with stream 'A' or 'NA', match both in individual_scores
          trendSql += ' AND (stream = $3 OR stream = $4)';
          trendParams.push('A', 'NA');
        } else {
          trendSql += ' AND stream = $3';
          trendParams.push(normalizedStream);
        }
      }
      
      if (year) {
        const paramIndex = trendParams.length + 1;
        trendSql += ` AND year = $${paramIndex}`;
        trendParams.push(parseInt(year));
      }
      
      trendSql += `
        GROUP BY month, year
        ORDER BY year, ${MONTH_ORDER_CASE}
      `;
      
      const trendResult = await query(trendSql, trendParams);
      
      if (trendResult.rows.length >= 2) {
        const firstHalf = trendResult.rows.slice(0, Math.ceil(trendResult.rows.length / 2));
        const secondHalf = trendResult.rows.slice(Math.ceil(trendResult.rows.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, r) => sum + parseFloat(r.avg_score), 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, r) => sum + parseFloat(r.avg_score), 0) / secondHalf.length;
        
        if (secondHalfAvg < firstHalfAvg - 5) {
          recommendations.subjectSpecific.push({
            type: 'declining_subject',
            priority: 'medium',
            title: `Declining Performance in ${subjectCode}`,
            description: `Performance has decreased from ${firstHalfAvg.toFixed(1)}% to ${secondHalfAvg.toFixed(1)}% over time.`,
            details: {
              subject: subjectCode,
              previousAverage: firstHalfAvg,
              currentAverage: secondHalfAvg,
              change: secondHalfAvg - firstHalfAvg
            },
            actions: [
              `Investigate causes of decline in ${subjectCode}`,
              `Review recent curriculum changes or teaching staff`,
              `Implement intervention strategies for ${subjectCode}`,
              `Monitor ${subjectCode} performance closely`
            ]
          });
        }
      }
    }
    
    // 2. Class-level recommendations
    let classSql = `
      SELECT 
        month,
        year,
        AVG(score) as avg_score,
        COUNT(DISTINCT adm_no) as student_count
      FROM individual_scores
      WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
    `;
    const classParams = [form];
    
    if (normalizedStream) {
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        // For FORM I-IV with stream 'A' or 'NA', match both in individual_scores
        classSql += ' AND (stream = $2 OR stream = $3)';
        classParams.push('A', 'NA');
      } else {
        classSql += ' AND stream = $2';
        classParams.push(normalizedStream);
      }
    }
    
    if (year) {
      const paramIndex = classParams.length + 1;
      classSql += ` AND year = $${paramIndex}`;
      classParams.push(parseInt(year));
    }
    
    classSql += `
      GROUP BY month, year
      ORDER BY year, ${MONTH_ORDER_CASE}
    `;
    
    const classResult = await query(classSql, classParams);
    
    if (classResult.rows.length > 0) {
      const allAverages = classResult.rows.map(r => parseFloat(r.avg_score));
      const overallAverage = allAverages.reduce((sum, val) => sum + val, 0) / allAverages.length;
      
      // Low overall performance
      if (overallAverage < 60) {
        recommendations.classLevel.push({
          type: 'low_overall_performance',
          priority: 'high',
          title: 'Low Overall Class Performance',
          description: `Class average is ${overallAverage.toFixed(1)}%, which is below the 60% threshold.`,
          details: {
            average: overallAverage,
            studentCount: Math.max(...classResult.rows.map(r => parseInt(r.student_count)))
          },
          actions: [
            'Review overall teaching strategies',
            'Implement comprehensive support programs',
            'Consider additional teaching resources',
            'Schedule parent-teacher meetings',
            'Analyze curriculum alignment'
          ]
        });
      }
      
      // Declining class trend
      if (classResult.rows.length >= 2) {
        const firstHalf = classResult.rows.slice(0, Math.ceil(classResult.rows.length / 2));
        const secondHalf = classResult.rows.slice(Math.ceil(classResult.rows.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, r) => sum + parseFloat(r.avg_score), 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, r) => sum + parseFloat(r.avg_score), 0) / secondHalf.length;
        
        if (secondHalfAvg < firstHalfAvg - 5) {
          recommendations.classLevel.push({
            type: 'declining_class_trend',
            priority: 'high',
            title: 'Declining Class Performance Trend',
            description: `Class performance has decreased from ${firstHalfAvg.toFixed(1)}% to ${secondHalfAvg.toFixed(1)}% over time.`,
            details: {
              previousAverage: firstHalfAvg,
              currentAverage: secondHalfAvg,
              change: secondHalfAvg - firstHalfAvg
            },
            actions: [
              'Investigate root causes of decline',
              'Review recent changes in teaching staff or curriculum',
              'Implement immediate intervention measures',
              'Increase monitoring and support',
              'Consider external support or resources'
            ]
          });
        }
      }
    }
    
    // 3. Student-level recommendations (based on who-and-when categories)
    // Get struggling students count
    let strugglingSql = `
      SELECT adm_no, AVG(score) as avg_score
      FROM individual_scores
      WHERE UPPER(TRIM(level)) = UPPER(TRIM($1))
    `;
    const strugglingParams = [form];
    
    if (normalizedStream) {
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        // For FORM I-IV with stream 'A' or 'NA', match both in individual_scores
        strugglingSql += ' AND (stream = $2 OR stream = $3)';
        strugglingParams.push('A', 'NA');
      } else {
        strugglingSql += ' AND stream = $2';
        strugglingParams.push(normalizedStream);
      }
    }
    
    if (year) {
      const paramIndex = strugglingParams.length + 1;
      strugglingSql += ` AND year = $${paramIndex}`;
      strugglingParams.push(parseInt(year));
    }
    
    strugglingSql += `
      GROUP BY adm_no
      HAVING AVG(score) < 50
    `;
    
    const strugglingResult = await query(strugglingSql, strugglingParams);
    const strugglingCount = strugglingResult.rows.length;
    
    if (strugglingCount > 0) {
      recommendations.studentLevel.push({
        type: 'struggling_students',
        priority: 'high',
        title: `${strugglingCount} Struggling Students Identified`,
        description: `${strugglingCount} student(s) have an average score below 50%.`,
        details: {
          studentCount: strugglingCount
        },
        actions: [
          'Provide individualized support plans',
          'Schedule one-on-one tutoring sessions',
          'Identify specific learning gaps',
          'Engage parents/guardians',
          'Consider peer mentoring programs'
        ]
      });
    }
    
    // 4. Teaching strategy recommendations
    if (strugglingSubjects.length > 0) {
      recommendations.teachingStrategies.push({
        type: 'differentiated_instruction',
        priority: 'medium',
        title: 'Implement Differentiated Instruction',
        description: `Multiple subjects are struggling. Consider differentiated teaching approaches.`,
        details: {
          strugglingSubjectCount: strugglingSubjects.length
        },
        actions: [
          'Use varied teaching methods (visual, auditory, kinesthetic)',
          'Implement group work and collaborative learning',
          'Provide multiple assessment formats',
          'Offer flexible learning paths',
          'Use technology-enhanced learning tools'
        ]
      });
    }
    
    if (classResult.rows.length > 0) {
      const allAverages = classResult.rows.map(r => parseFloat(r.avg_score));
      const overallAverage = allAverages.reduce((sum, val) => sum + val, 0) / allAverages.length;
      
      if (overallAverage < 65) {
        recommendations.teachingStrategies.push({
          type: 'active_learning',
          priority: 'medium',
          title: 'Promote Active Learning Strategies',
          description: `Class average is ${overallAverage.toFixed(1)}%. Active learning can improve engagement and performance.`,
          details: {
            currentAverage: overallAverage
          },
          actions: [
            'Implement problem-based learning',
            'Use case studies and real-world examples',
            'Encourage student presentations',
            'Facilitate discussions and debates',
            'Integrate hands-on activities'
          ]
        });
      }
    }
    
    // 5. Resource allocation recommendations
    if (strugglingSubjects.length > 0) {
      recommendations.resourceAllocation.push({
        type: 'subject_support',
        priority: 'high',
        title: 'Allocate Additional Resources to Struggling Subjects',
        description: `${strugglingSubjects.length} subject(s) need additional support.`,
        details: {
          subjects: strugglingSubjects.map(s => s.subject_code),
          count: strugglingSubjects.length
        },
        actions: [
          'Assign experienced teachers to struggling subjects',
          'Provide additional teaching materials',
          'Allocate more class time if needed',
          'Invest in subject-specific resources',
          'Consider external tutors or specialists'
        ]
      });
    }
    
    if (strugglingCount > 0) {
      recommendations.resourceAllocation.push({
        type: 'student_support',
        priority: 'high',
        title: 'Increase Student Support Resources',
        description: `${strugglingCount} student(s) require additional support.`,
        details: {
          studentCount: strugglingCount
        },
        actions: [
          'Establish a learning support center',
          'Hire additional support staff',
          'Allocate budget for tutoring programs',
          'Provide learning materials and resources',
          'Create peer support programs'
        ]
      });
    }
    
    // Sort recommendations by priority
    const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
    Object.keys(recommendations).forEach(key => {
      recommendations[key].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    });
    
    res.json({
      recommendations,
      summary: {
        totalRecommendations: 
          recommendations.subjectSpecific.length +
          recommendations.classLevel.length +
          recommendations.studentLevel.length +
          recommendations.teachingStrategies.length +
          recommendations.resourceAllocation.length,
        highPriority: [
          ...recommendations.subjectSpecific,
          ...recommendations.classLevel,
          ...recommendations.studentLevel,
          ...recommendations.teachingStrategies,
          ...recommendations.resourceAllocation
        ].filter(r => r.priority === 'high').length
      },
      form,
      stream: normalizedStream || 'all',
      year: year || 'all'
    });
  } catch (error) {
    console.error('[SOLUTIONS] Error:', error);
    console.error('[SOLUTIONS] Error stack:', error.stack);
    return sendError(res, error, 500);
  }
});

module.exports = router;
