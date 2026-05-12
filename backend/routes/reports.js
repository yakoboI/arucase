/**
 * Reports Routes - Full Functionality with PDF Generation
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const { generateIndividualReportPDF, generateBulkReportPDF } = require('../utils/pdfGenerator');
const { normalizeStream } = require('../utils/streamNormalizer');
const {
  dedupeCommentRowsByTypePreferA,
  dedupeTabiaRowsByCriterionPreferA
} = require('../utils/reportCommentDedupe');
const { sendError } = require('../utils/safeError');
const {
  calculateGrade,
  getSwahiliRemarks,
  calculateOLevelDivisionPoint,
  calculateALevelDivisionPoint,
  getOLevelDivision,
  getALevelDivision,
  calculateWeightedTotal,
  calculateOverallAverage
} = require('../utils/calculations');

// All report routes require authentication
router.use(requireAuth);

// Get individual student report data
router.get('/individual/:form/:stream/:year/:term/:admNo', async (req, res) => {
  try {
    const { form, stream, year, term, admNo } = req.params;

    // Normalize stream: NA -> A
    const normalizedStream = normalizeStream(stream);

    // Normalize term to match database format
    const normalizeTerm = (termParam) => {
      if (!termParam) return 'Term I';
      const t = termParam.trim();
      if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) return 'First Term';
      if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) return 'Second Term';
      if (/^First\s+Term$/i.test(t)) return 'First Term';
      if (/^Second\s+Term$/i.test(t)) return 'Second Term';
      return t;
    };

    const normalizedTerm = normalizeTerm(term);

    // Get student data - check both normalized stream (A) and original stream (NA) 
    // This handles cases where DB might have either value
    // For FORM I-IV, both NA and A refer to the same class
    const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream, stream];
    const uniqueStreams = [...new Set(streamsToCheck)]; // Remove duplicates
    
    let studentResult;
    if (uniqueStreams.length === 1) {
      // Single stream value
      studentResult = await query(
        'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
        [admNo, form, uniqueStreams[0], parseInt(year)]
      );
    } else {
      // Check both streams
      studentResult = await query(
        'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
        [admNo, form, uniqueStreams[0], uniqueStreams[1], parseInt(year)]
      );
    }
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ 
        message: `Student not found: ${admNo} in ${form} (checked streams: ${uniqueStreams.join(', ')}) ${year}`,
        details: { admNo, form, stream, normalizedStream, checkedStreams: uniqueStreams, year, term }
      });
    }
    
    const student = studentResult.rows[0];
    
    // Get subjects - use the stream from the found student (might be NA or A)
    const actualStream = student.stream;
    // Check both actual stream and normalized stream for subjects (FORM I-IV can have either)
    const subjectStreams = actualStream === 'NA' || normalizedStream === 'A' ? ['A', 'NA'] : [actualStream];
    const uniqueSubjectStreams = [...new Set(subjectStreams)];
    
    let subjectsResult;
    if (uniqueSubjectStreams.length === 1) {
      subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
        [form, uniqueSubjectStreams[0], parseInt(year)]
      );
    } else {
      subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
        [form, uniqueSubjectStreams[0], uniqueSubjectStreams[1], parseInt(year)]
      );
    }

    const formCode = form.replace('FORM ', '').trim();
    const isFormVOrVI = ['V', 'VI', '5', '6'].includes(formCode);
    // Get months based on term
    // Form V/VI: Academic year July-June. Term I (Jul-Dec): Aug-Nov, Term II (Jan-Jun): Feb-May
    // Form I-IV: Term I: Feb-May, Term II: Aug-Nov
    const getMonthsForTerm = (termParam) => {
      if (isFormVOrVI) {
        return (termParam === 'Term I' || termParam === 'Term 1' || termParam === 'First Term')
          ? ['August', 'September', 'October', 'November']
          : ['February', 'March', 'April', 'May'];
      } else {
        return (termParam === 'Term I' || termParam === 'Term 1' || termParam === 'First Term')
          ? ['February', 'March', 'April', 'May']
          : ['August', 'September', 'October', 'November'];
      }
    };
    const months = getMonthsForTerm(normalizedTerm);
    
    // Get marks configuration from database (needed for calculations)
    let marksConfig = {
      month_weights: {
        February: 40.0,
        March: 0.0,
        April: 40.0,
        May: 20.0,
        August: 40.0,
        September: 0.0,
        October: 40.0,
        November: 20.0
      }
    };
    
    try {
      const marksConfigResult = await query('SELECT month, weight FROM marks_config');
      if (marksConfigResult.rows.length > 0) {
        const monthWeights = {};
        marksConfigResult.rows.forEach(row => {
          monthWeights[row.month] = parseFloat(row.weight);
        });
        marksConfig = { month_weights: monthWeights };
      }
    } catch (e) {
      // Use default weights if table doesn't exist
    }
    
    // Get individual scores for this student using individual_scores table
    // Check both actual stream and normalized stream for backward compatibility
    const monthlyResult = await query(
      'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND month = ANY($6::text[])',
      [admNo, form, actualStream, normalizedStream, parseInt(year), months]
    );
    
    // Deduplicate monthly results to match unique subjects and remove duplicates
    const uniqueSubjectCodes = new Set(uniqueSubjects.map(s => s.subject_code));
    
    // First filter by subject codes, then remove duplicates by subject_code + month combination
    const filteredBySubject = monthlyResult.rows.filter(row => 
      uniqueSubjectCodes.has(row.subject_code)
    );
    
    // Sort to prefer NA stream over A stream for consistency
    const sortedByPreference = filteredBySubject.sort((a, b) => {
      // Prefer NA over A for consistency with subject deduplication
      if (a.subject_code === b.subject_code && a.month === b.month) {
        if (a.stream === 'NA' && b.stream !== 'NA') return -1;
        if (a.stream !== 'NA' && b.stream === 'NA') return 1;
      }
      return 0;
    });
    
    // Remove duplicates by keeping only one entry per subject_code + month combination
    const seen = new Set();
    const deduplicatedMonthlyResults = sortedByPreference.filter(row => {
      const key = `${row.subject_code}_${row.month}`;
      if (seen.has(key)) {
        console.log(`[DEBUG] Skipping duplicate monthly result: ${key} (stream: ${row.stream})`);
        return false; // Skip duplicate
      }
      seen.add(key);
      return true;
    });
    
    // Get all students in the same class for ranking (check both streams)
    // For Form V/VI, filter by term. For Form I-IV, include all students for the year.
    let allStudentsQuery = 'SELECT adm_no FROM students WHERE level = $1 AND stream IN ($2, $3) AND year = $4';
    let allStudentsParams = [form, actualStream, normalizedStream, parseInt(year)];

    if (isFormVOrVI) {
      allStudentsQuery += ' AND term = $5';
      allStudentsParams.push(normalizedTerm);
    }

    const allStudentsResult = await query(allStudentsQuery, allStudentsParams);

    // Get all individual scores for ranking calculation (check both streams)
    // For Form V/VI, filter by term. For Form I-IV, include all students for the year.
    let allMonthlyResultsQuery = 'SELECT * FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = ANY($5::text[])';
    let allMonthlyResultsParams = [form, actualStream, normalizedStream, parseInt(year), months];

    if (isFormVOrVI) {
      // For Form V/VI, we need to join with students table to filter by term
      allMonthlyResultsQuery = `
        SELECT i.* FROM individual_scores i
        INNER JOIN students s ON i.adm_no = s.adm_no
        WHERE i.level = $1 AND i.stream IN ($2, $3) AND i.year = $4 AND i.month = ANY($5::text[])
        AND s.term = $6
      `;
      allMonthlyResultsParams.push(normalizedTerm);
    }

    const allMonthlyResults = await query(allMonthlyResultsQuery, allMonthlyResultsParams);
    
    // Calculate rankings per subject
    const subjectRankings = {};
    
    subjectsResult.rows.forEach((subject) => {
      const subjectTotals = {};
      // Scores may be stored with either subject_code or subject_abbreviation
      const subjectCodesToMatch = [
        subject.subject_code,
        subject.subject_abbreviation
      ].filter(Boolean); // Remove null/undefined values
      
      // Calculate total for each student in this subject with weights
      allStudentsResult.rows.forEach((s) => {
        let total = 0;
        let validMonths = 0;
        months.forEach((month) => {
          const result = allMonthlyResults.rows.find(
            (r) => r.adm_no === s.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
          );
          if (result) {
            // Skip NULL/not registered scores
            if (result.score === null || result.score === undefined || result.score === '' || result.score === '-') {
              return;
            }
            const weight = marksConfig.month_weights[month] || 0;
            total += parseFloat(result.score) * (weight / 100);
            validMonths++;
          }
        });
        // Use average per valid month for fair ranking
        subjectTotals[s.adm_no] = validMonths > 0 ? total / validMonths : 0;
      });
      
      // Sort and rank
      const sorted = Object.entries(subjectTotals)
        .sort((a, b) => b[1] - a[1])
        .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
      
      subjectRankings[subject.subject_code] = {};
      sorted.forEach((item) => {
        subjectRankings[subject.subject_code][item.adm_no] = item.rank;
      });
    });
    
    // Calculate overall ranking with weights
    const overallTotals = {};
    allStudentsResult.rows.forEach((s) => {
      let grandTotal = 0;
      let validSubjects = 0;
      subjectsResult.rows.forEach((subject) => {
        let subjectTotal = 0;
        let validMonths = 0;
        // Scores may be stored with either subject_code or subject_abbreviation
        const subjectCodesToMatch = [
          subject.subject_code,
          subject.subject_abbreviation
        ].filter(Boolean); // Remove null/undefined values

        months.forEach((month) => {
          const result = allMonthlyResults.rows.find(
            (r) => r.adm_no === s.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
          );
          if (result) {
            // Skip NULL/not registered scores
            if (result.score === null || result.score === undefined || result.score === '' || result.score === '-') {
              return;
            }
            const weight = marksConfig.month_weights[month] || 0;
            subjectTotal += parseFloat(result.score) * (weight / 100);
            validMonths++;
          }
        });
        // Only count subjects with valid scores
        if (validMonths > 0) {
          grandTotal += subjectTotal / validMonths;
          validSubjects++;
        }
      });
      // Use average per subject for fair ranking
      overallTotals[s.adm_no] = validSubjects > 0 ? grandTotal / validSubjects : 0;
    });
    
    const sortedOverall = Object.entries(overallTotals)
      .sort((a, b) => {
        // Primary sort by total score (descending)
        const scoreDiff = b[1] - a[1];
        if (scoreDiff !== 0) return scoreDiff;
        // Tie-breaker: sort by admission number (ascending) for consistent ordering
        return String(a[0]).localeCompare(String(b[0]));
      })
      .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));

    const overallRank = sortedOverall.find((item) => item.adm_no === admNo)?.rank || '-';
    
    // Get student index for comments and photos (find position in sorted list by name)
    // Use database sorting to match /students API exactly (ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC)
    const isFormIToIV = /^FORM\s+(I|II|III|IV)$/i.test(form);

    // For FORM I-IV, PhotoManagement's /students query includes both streams A and NA.
    const studentIndexStudentsQuery = (isFormIToIV && normalizedStream === 'A')
      ? `SELECT adm_no, first_name, middle_name, surname
         FROM students
         WHERE level = $1 AND stream IN ($2, $3) AND year = $4
         ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`
      : `SELECT adm_no, first_name, middle_name, surname
         FROM students
         WHERE level = $1 AND stream = $2 AND year = $3
         ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`;

    // PhotoManagement does not pass `limit` to /students, so backend defaults to 500.
    // To keep student_index consistent with how uploads were stored, apply the same limit here.
    const studentIndexStudentsQueryWithLimit = `${studentIndexStudentsQuery} LIMIT 500`;

    const studentIndexStudentsParams = (isFormIToIV && normalizedStream === 'A')
      ? [form, 'A', 'NA', parseInt(year)]
      : [form, normalizedStream, parseInt(year)];

    const studentIndexStudentsResult = await query(
      studentIndexStudentsQueryWithLimit,
      studentIndexStudentsParams
    );

    // Database already sorted, no need for JavaScript sorting
    const studentIndexPos = studentIndexStudentsResult.rows.findIndex(
      (s) => String(s.adm_no) === String(admNo)
    );
    const studentIndex = (studentIndexPos >= 0 ? studentIndexPos : -1).toString();
    
    // Get comments using student_index — FORM I–IV: match bulk report + /comments/list (stream may be A or NA in DB)
    let commentsResult;
    if (isFormIToIV && normalizedStream === 'A') {
      const cr = await query(
        `SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
        [studentIndex, form, 'A', 'NA', parseInt(year), normalizedTerm]
      );
      commentsResult = { rows: dedupeCommentRowsByTypePreferA(cr.rows) };
    } else {
      commentsResult = await query(
        'SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
        [studentIndex, form, normalizedStream, parseInt(year), normalizedTerm]
      );
    }
    
    // Get tabia mwenendo using student_index (same A/NA rule as comments)
    let tabiaResult;
    if (isFormIToIV && normalizedStream === 'A') {
      const tr = await query(
        `SELECT * FROM tabia_mwenendo WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
        [studentIndex, form, 'A', 'NA', parseInt(year), normalizedTerm]
      );
      tabiaResult = { rows: dedupeTabiaRowsByCriterionPreferA(tr.rows) };
    } else {
      tabiaResult = await query(
        'SELECT * FROM tabia_mwenendo WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
        [studentIndex, form, normalizedStream, parseInt(year), normalizedTerm]
      );
    }
    
    // Get subject teacher signatures
    const subjectTeachersResult = await query(
      'SELECT subject_code, teacher_signature FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3',
      [form, normalizedStream, parseInt(year)]
    );
    
    const subjectTeacherSignatures = {};
    subjectTeachersResult.rows.forEach((row) => {
      subjectTeacherSignatures[row.subject_code] = row.teacher_signature || '';
    });
    
    // Get school logo and stamp
    const logoResult = await query('SELECT * FROM school_logo WHERE id = 1');
    const stampResult = await query('SELECT * FROM school_stamp WHERE id = 1');
    const authorityResult = await query('SELECT * FROM authority_data WHERE id = 1');
    
    // Get student parish from parishes table if exists
    let studentParish = 'Not specified';
    try {
      const parishResult = (isFormIToIV && normalizedStream === 'A')
        ? await query(
            `SELECT parish_name FROM student_parishes WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
             ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
            [studentIndex, form, 'A', 'NA', parseInt(year)]
          )
        : await query(
            'SELECT parish_name FROM student_parishes WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
            [studentIndex, form, normalizedStream, parseInt(year)]
          );
      if (parishResult.rows.length > 0 && parishResult.rows[0]) {
        studentParish = parishResult.rows[0].parish_name || student.parish || student.parish_name || 'Not specified';
      } else {
        studentParish = student.parish || student.parish_name || 'Not specified';
      }
    } catch (e) {
      studentParish = student.parish || student.parish_name || 'Not specified';
    }
    
    // Get student fees debt from individual_debt table
    let studentFeesDebt = '0.00';
    try {
      const debtResult = (isFormIToIV && normalizedStream === 'A')
        ? await query(
            `SELECT amount, description FROM individual_debt WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
             ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
            [studentIndex, form, 'A', 'NA', parseInt(year)]
          )
        : await query(
            'SELECT amount, description FROM individual_debt WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
            [studentIndex, form, normalizedStream, parseInt(year)]
          );
      const debt = debtResult.rows[0] || null;
      if (debt) {
        if (debt.amount && debt.description) {
          studentFeesDebt = `${parseFloat(debt.amount).toFixed(0)} - ${debt.description}`;
        } else if (debt.amount) {
          studentFeesDebt = parseFloat(debt.amount).toFixed(0);
        }
      }
    } catch (e) {
      studentFeesDebt = student.fees_debt || student.debt || '0.00';
    }
    
    // Get student photo
    // IMPORTANT: student_index must match photo management sorting (by name, not adm_no)
    let studentPhoto = null;
    let debugPhotoLookup = null;
    try {
      // Some deployments may have mixed stream values in student_photos for FORM I-IV.
      const photoStreamsToCheck = (isFormIToIV && normalizedStream === 'A') ? ['A', 'NA'] : [normalizedStream];

      const photoResult = (photoStreamsToCheck.length === 2)
        ? await query(
          'SELECT photo_filename FROM student_photos WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
          [studentIndex, form, photoStreamsToCheck[0], photoStreamsToCheck[1], parseInt(year)]
        )
        : await query(
          'SELECT photo_filename FROM student_photos WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
          [studentIndex, form, photoStreamsToCheck[0], parseInt(year)]
        );

      if (photoResult.rows.length > 0 && photoResult.rows[0] && photoResult.rows[0].photo_filename) {
        studentPhoto = photoResult.rows[0].photo_filename;
      }
    } catch (e) {
      console.error(`[REPORT] Error fetching photo for student ${admNo}:`, e.message);
      // Photo not found, use student.photo_filename if available
      studentPhoto = student.photo_filename || null;
    }
    
    // Get class fees announcements (if available) - filter by term
    let classFeesAnnouncements = {};
    try {
      // Try with term first (new format) - use case-insensitive matching for level
      let feesAnnouncementsResult;
      try {
        feesAnnouncementsResult = await query(
          `SELECT announcement_index, announcement_text FROM fees_announcements
           WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4 AND term = $5 ORDER BY announcement_index`,
          [form, normalizedStream, 'NA', parseInt(year), normalizedTerm]
        );
      } catch (e) {
        // If term column doesn't exist, fall back to old query (backward compatibility)
        if (e.message.includes('column') && e.message.includes('term')) {
          feesAnnouncementsResult = await query(
            `SELECT announcement_index, announcement_text FROM fees_announcements
             WHERE UPPER(TRIM(level)) = UPPER(TRIM($1)) AND stream IN ($2, $3) AND year = $4 ORDER BY announcement_index`,
            [form, normalizedStream, 'NA', parseInt(year)]
          );
        } else {
          throw e;
        }
      }
      
      feesAnnouncementsResult.rows.forEach((row) => {
        const index = row.announcement_index || (feesAnnouncementsResult.rows.indexOf(row) + 1).toString();
        classFeesAnnouncements[index.toString()] = row.announcement_text || '';
      });
    } catch (e) {
      // Fees announcements table doesn't exist or error occurred, use empty object
      classFeesAnnouncements = {};
    }
    
    
    // Calculate weighted totals per subject and build subjects data
    const subjectsData = {};
    let totalMarks = 0;
    
    subjectsResult.rows.forEach((subject) => {
      const monthScores = {};
      // Scores may be stored with either subject_code or subject_abbreviation
      // Try both to find matching scores
      const subjectCodesToMatch = [
        subject.subject_code,
        subject.subject_abbreviation
      ].filter(Boolean); // Remove null/undefined values
      
      months.forEach((month) => {
        const result = monthlyResult.rows.find(
          (r) => subjectCodesToMatch.includes(r.subject_code) && r.month === month
        );
        monthScores[month] = result ? parseFloat(result.score || 0) : 0;
      });
      
      const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
      const grade = calculateGrade(weightedTotal, form);
      
      subjectsData[subject.subject_code] = {
        grade: grade,
        weighted_total: weightedTotal,
        name: subject.subject_name || subject.subject_code
      };
      
      totalMarks += weightedTotal;
    });
    
    // Calculate overall average
    const average = calculateOverallAverage(subjectsData);
    const grade = calculateGrade(average, form);
    
    // Calculate division point and division
    const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
    let divisionPoint = null;
    let division = null;
    
    if (isForm5Or6) {
      // A-Level: Use 3 combination subjects
      divisionPoint = calculateALevelDivisionPoint(subjectsData, stream);
      division = getALevelDivision(divisionPoint);
    } else {
      // O-Level: Use 7 best subjects
      divisionPoint = calculateOLevelDivisionPoint(subjectsData);
      division = getOLevelDivision(divisionPoint);
    }
    
    res.json({
      student: {
        ...student,
        photo_path: studentPhoto,
        debug_photo_lookup: debugPhotoLookup
      },
      subjects: subjectsResult.rows,
      monthly_results: monthlyResult.rows,
      comments: commentsResult.rows,
      tabia_mwenendo: tabiaResult.rows,
      subject_rankings: subjectRankings,
      subject_teacher_signatures: subjectTeacherSignatures,
      overall_rank: overallRank,
      total_students: allStudentsResult.rows.length,
      marks_config: marksConfig,
      months: months,
      summary_data: {
        total_marks: totalMarks.toFixed(1),
        average: average.toFixed(1),
        grade: grade,
        division: division || '0',
        division_point: divisionPoint !== null ? divisionPoint.toString() : '0',
        position: overallRank.toString(),
        total_students: allStudentsResult.rows.length.toString()
      },
      school_logo: logoResult.rows.length > 0 ? logoResult.rows[0] : null,
      school_stamp: stampResult.rows.length > 0 ? stampResult.rows[0] : null,
      authority_data: authorityResult.rows.length > 0 ? authorityResult.rows[0] : null,
      student_parish: studentParish,
      student_fees_debt: studentFeesDebt,
      class_fees_announcements: classFeesAnnouncements
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return sendError(res, error, 500);
  }
});

// Generate individual report PDF using Puppeteer
router.get('/individual/:form/:stream/:year/:term/:admNo/pdf', async (req, res) => {
  const { form, stream, year, term, admNo } = req.params;
  
  // Decode URL-encoded parameters (declare outside try for error handler access)
  let decodedForm, decodedStream, decodedTerm;
  try {
    decodedForm = decodeURIComponent(form).trim();
    decodedStream = decodeURIComponent(stream || '').trim();
    decodedTerm = decodeURIComponent(term).trim();
  } catch (decodeError) {
    return res.status(400).json({ 
      message: 'Invalid URL parameters',
      error: decodeError.message 
    });
  }
  
  try {
    // Import Puppeteer PDF generator
    const { generateIndividualReportPDFWithPuppeteer } = require('../utils/puppeteerPdfGenerator');
    
    // Get auth token from request (already authenticated via requireAuth middleware)
    const authHeader = req.headers.authorization;
    const authToken = authHeader ? (authHeader.split(' ')[1] || authHeader) : null;
    
    // Get API URL (use request protocol and host, or env variable)
    const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    const pdfBuffer = await generateIndividualReportPDFWithPuppeteer(
      decodedForm, 
      decodedStream, // Pass original stream - API endpoint will normalize it
      parseInt(year), 
      decodedTerm, 
      admNo,
      apiUrl,
      authToken
    );
    
    // Validate PDF buffer
    if (!pdfBuffer) {
      throw new Error('PDF buffer is null or undefined');
    }
    
    // Ensure it's a Buffer
    let buffer;
    if (Buffer.isBuffer(pdfBuffer)) {
      buffer = pdfBuffer;
    } else if (pdfBuffer instanceof Uint8Array) {
      buffer = Buffer.from(pdfBuffer);
    } else {
      buffer = Buffer.from(pdfBuffer);
    }
    
    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    // Verify it's a valid PDF (starts with %PDF)
    const firstBytes = buffer.slice(0, 4);
    if (firstBytes[0] !== 0x25 || firstBytes[1] !== 0x50 || firstBytes[2] !== 0x44 || firstBytes[3] !== 0x46) {
      console.error('Invalid PDF buffer received. First bytes:', buffer.slice(0, 20).toString('hex'));
      throw new Error('Generated file is not a valid PDF');
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    const filename = `report_${admNo}_${year}_${decodedTerm.replace(/\s+/g, '_')}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the buffer using end() with binary encoding for better compatibility
    res.end(buffer, 'binary');
  } catch (error) {
    console.error('PDF Generation Route Error:', error);
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        form: decodedForm,
        stream: decodedStream,
        year,
        term: decodedTerm,
        admNo
      });
    }
    return sendError(res, error, 500);
  }
});

// Get bulk report data - OPTIMIZED for large classes
router.get('/bulk/:form/:year/:term', async (req, res) => {
  try {
    const startTime = Date.now();
    const { form, year, term } = req.params;
    let { stream } = req.query;

    const decodedForm = decodeURIComponent(String(form).replace(/\+/g, ' ')).trim();
    const decodedTerm = decodeURIComponent(String(term).replace(/\+/g, ' ')).trim();

    // Normalize term to match database format
    const normalizeTerm = (termParam) => {
      if (!termParam) return 'Term I';
      const t = termParam.trim();
      if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) return 'First Term';
      if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) return 'Second Term';
      if (/^First\s+Term$/i.test(t)) return 'First Term';
      if (/^Second\s+Term$/i.test(t)) return 'Second Term';
      return t;
    };

    const normalizedTerm = normalizeTerm(decodedTerm);

    // Normalize stream: NA -> A
    if (stream) {
      stream = normalizeStream(stream);
    } else {
      // For Form I-IV, default to 'A' (normalized from 'NA')
      const formCodeEarly = decodedForm.replace(/^FORM\s+/i, '').trim();
      const isForm5Or6Early = ['V', 'VI', '5', '6'].includes(formCodeEarly);
      if (!isForm5Or6Early) {
        stream = 'A'; // Normalized from 'NA'
      }
    }
    
    // Get months based on term
    const formCode = decodedForm.replace(/^FORM\s+/i, '').trim();
    const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
    // DB often still has stream 'NA' for O-Level while UI sends A — match both (same as individual report)
    const oLevelStreamAOrNA = !isForm5Or6 && stream === 'A';
    // Form V/VI: Academic year July-June. Term I (Jul-Dec): Aug-Nov, Term II (Jan-Jun): Feb-May
    // Form I-IV: Term I: Feb-May, Term II: Aug-Nov
    const getMonthsForTerm = (termParam) => {
      if (isForm5Or6) {
        return (termParam === 'Term I' || termParam === 'Term 1' || termParam === 'First Term')
          ? ['August', 'September', 'October', 'November']
          : ['February', 'March', 'April', 'May'];
      } else {
        return (termParam === 'Term I' || termParam === 'Term 1' || termParam === 'First Term')
          ? ['February', 'March', 'April', 'May']
          : ['August', 'September', 'October', 'November'];
      }
    };
    const months = getMonthsForTerm(normalizedTerm);

    // Get all students with term filtering only for Form V/VI
    let queryText = 'SELECT * FROM students WHERE level = $1 AND year = $2';
    const params = [decodedForm, parseInt(year)];
    let paramIndex = 3;

    // For Form V/VI, filter by term. For Form I-IV, show all students for the year
    if (isForm5Or6) {
      queryText += ` AND term = $${paramIndex}`;
      params.push(normalizedTerm);
      paramIndex++;
    }

    if (stream) {
      if (oLevelStreamAOrNA) {
        queryText += ` AND stream IN ($${paramIndex}, $${paramIndex + 1})`;
        params.push('A', 'NA');
        paramIndex += 2;
      } else {
        queryText += ` AND stream = $${paramIndex}`;
        params.push(stream);
        paramIndex++;
      }
    }
    
    queryText += ' ORDER BY first_name, middle_name, adm_no';
    
    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;
    
    if (students.length === 0) {
      return res.json({
        students: [],
        reports: [],
        subjects: [],
        total_students: 0
      });
    }
    
    // Get subjects
    let subjectsResult;
    if (stream) {
      if (oLevelStreamAOrNA) {
        subjectsResult = await query(
          'SELECT * FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
          [decodedForm, 'A', 'NA', parseInt(year)]
        );
      } else {
        subjectsResult = await query(
          'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
          [decodedForm, stream, parseInt(year)]
        );
      }
    } else {
      subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND year = $2 ORDER BY subject_code',
        [decodedForm, parseInt(year)]
      );
    }
    // If both A and NA had subject rows, keep one row per subject_code
    const subjectsByCode = new Map();
    subjectsResult.rows.forEach((s) => {
      const key = s.subject_code || s.subject_abbreviation;
      if (key && !subjectsByCode.has(key)) subjectsByCode.set(key, s);
    });
    const subjects = Array.from(subjectsByCode.values());
    
    // OPTIMIZATION: Load ALL scores for ALL students in ONE batch query
    const allScoresLookup = {}; // {adm_no: {subject_code: {month: score}}}
    const batchStart = Date.now();
    
    let scoresResult;
    if (stream) {
      if (oLevelStreamAOrNA) {
        scoresResult = await query(
          `SELECT adm_no, subject_code, month, score FROM individual_scores 
           WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND term = $5 AND month = ANY($6::text[])
           ORDER BY adm_no, subject_code, month`,
          [decodedForm, 'A', 'NA', parseInt(year), term, months]
        );
      } else {
        scoresResult = await query(
          `SELECT adm_no, subject_code, month, score FROM individual_scores 
           WHERE level = $1 AND stream = $2 AND year = $3 AND term = $4 AND month = ANY($5::text[])
           ORDER BY adm_no, subject_code, month`,
          [decodedForm, stream, parseInt(year), term, months]
        );
      }
    } else {
      scoresResult = await query(
        `SELECT adm_no, subject_code, month, score FROM individual_scores 
         WHERE level = $1 AND year = $2 AND term = $3 AND month = ANY($4::text[])
         ORDER BY adm_no, subject_code, month`,
        [decodedForm, parseInt(year), term, months]
      );
    }
    
    // Build lookup dictionary
    scoresResult.rows.forEach((row) => {
      const admNo = row.adm_no;
      const subjectCode = row.subject_code;
      const month = row.month;
      // Skip NULL/not registered scores
      if (row.score === null || row.score === undefined || row.score === '' || row.score === '-') {
        return;
      }
      const score = parseFloat(row.score);

      if (!allScoresLookup[admNo]) {
        allScoresLookup[admNo] = {};
      }
      if (!allScoresLookup[admNo][subjectCode]) {
        allScoresLookup[admNo][subjectCode] = {};
      }
      allScoresLookup[admNo][subjectCode][month] = score;
    });
    
    // OPTIMIZATION: Load ALL comments in ONE batch query
    const allCommentsLookup = {}; // {student_index: {comment_type: value}}
    const commentTypes = ['sala', 'huduma', 'tabia', 'michezo', 'mwalimu_taaluma', 'mkuu_shule', 'taaluma'];
    
    // Get student indices (sorted adm_no list)
    const sortedAdmNos = students.map(s => s.adm_no).sort();
    const admNoToIndex = {};
    sortedAdmNos.forEach((admNo, idx) => {
      admNoToIndex[admNo] = (idx + 1).toString();
    });
    
    let commentsResult;
    try {
      if (stream) {
        if (oLevelStreamAOrNA) {
          commentsResult = await query(
            `SELECT student_index, comment_type, comment_text FROM comments 
             WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND term = $5 
             AND comment_type = ANY($6::text[])
             ORDER BY student_index, comment_type`,
            [decodedForm, 'A', 'NA', parseInt(year), term, commentTypes]
          );
        } else {
          commentsResult = await query(
            `SELECT student_index, comment_type, comment_text FROM comments 
             WHERE level = $1 AND stream = $2 AND year = $3 AND term = $4 
             AND comment_type = ANY($5::text[])
             ORDER BY student_index, comment_type`,
            [decodedForm, stream, parseInt(year), term, commentTypes]
          );
        }
      } else {
        commentsResult = await query(
          `SELECT student_index, comment_type, comment_text FROM comments 
           WHERE level = $1 AND year = $2 AND term = $3 
           AND comment_type = ANY($4::text[])
           ORDER BY student_index, comment_type`,
          [decodedForm, parseInt(year), term, commentTypes]
        );
      }
      
      commentsResult.rows.forEach((row) => {
        const studentIndex = row.student_index;
        const commentType = row.comment_type;
        const commentText = row.comment_text || '';
        
        if (!allCommentsLookup[studentIndex]) {
          allCommentsLookup[studentIndex] = {};
        }
        allCommentsLookup[studentIndex][commentType] = commentText;
      });
    } catch (e) {
      // Comments table not available, continue without comments
    }
    
    // Get marks configuration
    let marksConfig = {
      month_weights: {
        February: 40.0, March: 0.0, April: 40.0, May: 20.0,
        August: 40.0, September: 0.0, October: 40.0, November: 20.0,
        January: 40.0
      }
    };
    
    try {
      const marksConfigResult = await query('SELECT month, weight FROM marks_config');
      if (marksConfigResult.rows.length > 0) {
        const monthWeights = {};
        marksConfigResult.rows.forEach(row => {
          monthWeights[row.month] = parseFloat(row.weight);
        });
        marksConfig = { month_weights: monthWeights };
      }
    } catch (e) {
      // Marks config not available, use defaults
    }
    
    // Process each student's report data
    const studentReports = [];
    const processStart = Date.now();
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const studentIndex = admNoToIndex[student.adm_no] || (i + 1).toString();
      
      // Get student's scores
      const studentScores = allScoresLookup[student.adm_no] || {};
      
      // Calculate subject data
      const subjectsData = {};
      let totalMarks = 0;
      
      subjects.forEach((subject) => {
        const subjectCodesToMatch = [
          subject.subject_code,
          subject.subject_abbreviation
        ].filter(Boolean);
        
        const monthScores = {};
        months.forEach((month) => {
          let score = 0;
          for (const code of subjectCodesToMatch) {
            if (studentScores[code] && studentScores[code][month] !== undefined) {
              score = studentScores[code][month];
              break;
            }
          }
          monthScores[month] = score;
        });
        
        const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
        const grade = calculateGrade(weightedTotal, decodedForm);
        
        subjectsData[subject.subject_code] = {
          grade: grade,
          weighted_total: weightedTotal,
          name: subject.subject_name || subject.subject_code
        };
        
        totalMarks += weightedTotal;
      });
      
      // Calculate overall average
      const average = calculateOverallAverage(subjectsData);
      const overallGrade = calculateGrade(average, decodedForm);
      
      // Get comments for this student
      const studentComments = allCommentsLookup[studentIndex] || {};
      
      // Build report data
      studentReports.push({
        student: {
          ...student,
          student_index: studentIndex
        },
        subjects_data: subjectsData,
        monthly_results: Object.keys(studentScores).flatMap(subjectCode => 
          Object.keys(studentScores[subjectCode] || {}).map(month => ({
            adm_no: student.adm_no,
            subject_code: subjectCode,
            month: month,
            score: studentScores[subjectCode][month]
          }))
        ),
        comments: studentComments,
        summary_data: {
          total_marks: totalMarks.toFixed(1),
          average: average.toFixed(1),
          grade: overallGrade
        }
      });
      
    }
    
    res.json({
      students: students,
      reports: studentReports,
      subjects: subjects,
      total_students: students.length,
      months: months,
      marks_config: marksConfig
    });
  } catch (error) {
    console.error('[BULK REPORT] Error:', error);
    return sendError(res, error, 500);
  }
});

// Generate bulk report PDF - Uses batch generation with Puppeteer
router.get('/bulk/:form/:year/:term/pdf', async (req, res) => {
  // Temporarily bypass auth for debugging
  // requireAuth middleware is still applied at the router level
  try {
    const { form, year, term } = req.params;
    let { stream, batchSize } = req.query;

    const decodedForm = decodeURIComponent(String(form).replace(/\+/g, ' ')).trim();
    const decodedTerm = decodeURIComponent(String(term).replace(/\+/g, ' ')).trim();
    
    
    // Normalize term to match database format
    const normalizeTerm = (termParam) => {
      if (!termParam) return 'Term I';
      const t = termParam.trim();
      if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t)) return 'First Term';
      if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t)) return 'Second Term';
      if (/^First\s+Term$/i.test(t)) return 'First Term';
      if (/^Second\s+Term$/i.test(t)) return 'Second Term';
      return t;
    };

    const normalizedTerm = normalizeTerm(decodedTerm);

    // Normalize stream: NA -> A
    if (stream) {
      stream = normalizeStream(stream);
    } else {
      const formCodePdf = decodedForm.replace(/^FORM\s+/i, '').trim();
      const isForm5Or6Pdf = ['V', 'VI', '5', '6'].includes(formCodePdf);
      if (!isForm5Or6Pdf) {
        stream = 'A';
      }
    }
    
    const formCodePdf2 = decodedForm.replace(/^FORM\s+/i, '').trim();
    const isForm5Or6Pdf2 = ['V', 'VI', '5', '6'].includes(formCodePdf2);
    const oLevelStreamAOrNAPdf = !isForm5Or6Pdf2 && stream === 'A';
    
    // Get all students with term filtering only for Form V/VI (O-Level: match stream A and NA — same as bulk JSON API)
    let queryText = 'SELECT * FROM students WHERE level = $1 AND year = $2';
    const params = [decodedForm, parseInt(year)];
    let paramIndex = 3;

    // For Form V/VI, filter by term. For Form I-IV, show all students for the year
    if (isForm5Or6Pdf2) {
      queryText += ` AND term = $${paramIndex}`;
      params.push(normalizedTerm);
      paramIndex++;
    }

    if (stream) {
      if (oLevelStreamAOrNAPdf) {
        queryText += ` AND stream IN ($${paramIndex}, $${paramIndex + 1})`;
        params.push('A', 'NA');
        paramIndex += 2;
      } else {
        queryText += ` AND stream = $${paramIndex}`;
        params.push(stream);
        paramIndex++;
      }
    }
    
    queryText += ' ORDER BY first_name, middle_name, adm_no';
    
    const studentsResult = await query(queryText, params);
    const students = studentsResult.rows;
    
    if (students.length === 0) {
      return res.status(404).json({ message: 'No students found for this class' });
    }
    
    // Get auth token from request headers
    const authHeader = req.headers.authorization;
    const authToken = authHeader ? (authHeader.split(' ')[1] || authHeader) : null;
    
    // Get API URL
    const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    // Import batch generator (now uses Python-style approach: one HTML, one PDF)
    const { generateBulkReportPDFWithBatches } = require('../utils/bulkPdfGenerator');
    
    // Generate PDF using Python-style approach: Generate ONE HTML with all reports, then convert to PDF
    const pdfBuffer = await generateBulkReportPDFWithBatches(
      decodedForm,
      stream,
      parseInt(year),
      term,
      students,
      apiUrl,
      authToken
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bulk_report_${decodedForm}_${year}_${term}${stream ? '_' + stream : ''}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[BULK PDF] Error:', error);
    console.error('[BULK PDF] Error stack:', error.stack);
    console.error('[BULK PDF] Error details:', {
      form: decodedForm,
      stream: stream,
      year: year,
      term: term,
      studentsCount: students ? students.length : 'undefined'
    });
    return sendError(res, error, 500);
  }
});

// Export report as CSV
router.get('/individual/:form/:stream/:year/:term/:admNo/csv', async (req, res) => {
  try {
    const { form, stream, year, term, admNo } = req.params;
    
    // Get report data (same as PDF endpoint)
    const reportData = await getReportData(form, stream, parseInt(year), term, admNo);
    
    // Generate CSV
    let csv = 'Student Report\n';
    csv += `Admission Number,${reportData.student.adm_no}\n`;
    csv += `Name,${reportData.student.first_name} ${reportData.student.middle_name || ''} ${reportData.student.surname}\n`;
    csv += `Class,${form} ${stream}\n`;
    csv += `Year,${year}\n`;
    csv += `Term,${term}\n\n`;
    csv += 'Subject,Score\n';
    
    reportData.scores.forEach(score => {
      const subject = reportData.subjects.find(s => s.subject_code === score.subject_code);
      csv += `${subject ? subject.subject_name : score.subject_code},${score.score}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report_${admNo}_${year}_${term}.csv"`);
    res.send(csv);
  } catch (error) {
    return sendError(res, error, 500);
  }
});

// Helper function to get report data
async function getReportData(form, stream, year, term, admNo) {
  // Normalize stream: NA -> A
  const normalizedStream = normalizeStream(stream);
  
  const studentResult = await query(
    'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
    [admNo, form, normalizedStream, year]
  );
  
  const scoresResult = await query(
    'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
    [admNo, form, normalizedStream, year]
  );
  
  const subjectsResult = await query(
    'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3',
    [form, normalizedStream, year]
  );
  
  return {
    student: studentResult.rows[0],
    scores: scoresResult.rows,
    subjects: subjectsResult.rows
  };
}

module.exports = router;
