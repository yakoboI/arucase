/**
 * Bulk PDF Generator - Generates ONE HTML document with all individual reports
 * Then converts the entire HTML to PDF using Puppeteer (like Python version)
 * This is much more efficient than generating individual PDFs and merging them
 */
const puppeteer = require('puppeteer');
const axios = require('axios');
const { generateReportHTML } = require('./htmlReportRenderer');
const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');
const { normalizeStream } = require('./streamNormalizer');
const { HEAD_FONT_LINKS, FONT_STACK } = require('./reportPdfFontSnippets');
const {
  calculateGrade,
  calculateOLevelDivisionPoint,
  calculateALevelDivisionPoint,
  getOLevelDivision,
  getALevelDivision,
  calculateWeightedTotal,
  calculateOverallAverage
} = require('./calculations');

/** Must match htmlReportRenderer.js (single-report HTML slice for bulk merge). */
const REPORT_INNER_START = '<!-- __ARUCASE_REPORT_INNER_START__ -->';
const REPORT_INNER_END = '<!-- __ARUCASE_REPORT_INNER_END__ -->';

function publicOriginFromApiUrl(apiUrl) {
  const u = (apiUrl || '').trim().replace(/\/api\/?$/i, '').replace(/\/$/, '');
  return u || 'http://localhost:5000';
}

function toAbsoluteAssetUrl(src, origin) {
  if (!src || /^data:/i.test(String(src).trim())) return null;
  const t = String(src).trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `https:${t}`;
  const o = origin.replace(/\/$/, '');
  if (t.startsWith('/')) return `${o}${t}`;
  return `${o}/${t}`;
}

/**
 * Fetch every <img src="..."> (except data:) and replace with data: URIs so Chromium
 * paints logo/photo/stamp on every sheet (large print docs often drop repeated remote images).
 */
async function inlineBulkReportImages(html, origin, authToken) {
  const srcSet = new Set();
  const re = /<img\b[^>]*?\bsrc="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!m[1].startsWith('data:')) srcSet.add(m[1]);
  }
  if (srcSet.size === 0) return html;

  const headers = { Accept: 'image/*,*/*' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const srcToData = new Map();
  const urls = [...srcSet];
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (srcAttr) => {
        const absolute = toAbsoluteAssetUrl(srcAttr, origin);
        if (!absolute) return;
        try {
          const res = await axios.get(absolute, {
            responseType: 'arraybuffer',
            headers,
            timeout: 60000,
            maxContentLength: 10 * 1024 * 1024,
            maxBodyLength: 10 * 1024 * 1024,
            validateStatus: (s) => s === 200
          });
          const ct = (res.headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
          const mime = /^image\//i.test(ct) ? ct : 'image/jpeg';
          const b64 = Buffer.from(res.data).toString('base64');
          srcToData.set(srcAttr, `data:${mime};base64,${b64}`);
        } catch (e) {
          console.warn('[BULK PDF] Could not inline image:', absolute, e.message);
        }
      })
    );
  }

  let out = html;
  for (const [orig, dataUri] of srcToData) {
    const safe = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`src="${safe}"`, 'g'), () => `src="${dataUri}"`);
  }
  console.log(`[BULK PDF] Inlined ${srcToData.size}/${srcSet.size} distinct image src values into HTML`);
  return out;
}

/**
 * Read CSS file content
 */
async function getCSSContent() {
  try {
    // For bulk reports, we need both IndividualReportDetail.css (for report content) 
    // and BulkReport.css (for the bulk report interface styling)
    const individualReportCSSPath = path.join(__dirname, '../../frontend/src/pages/reports/IndividualReportDetail.css');
    const bulkReportCSSPath = path.join(__dirname, '../../frontend/src/pages/reports/BulkReport.css');
    
    const individualReportCSS = await fs.readFile(individualReportCSSPath, 'utf-8');
    const bulkReportCSS = await fs.readFile(bulkReportCSSPath, 'utf-8');
    
    // Combine both CSS files - bulk report styling first, then individual report styling
    return `${bulkReportCSS}\n\n${individualReportCSS}`;
  } catch (e) {
    console.log('Could not read CSS files, using minimal styles');
    return `
      * { box-sizing: border-box; }
      body { font-family: 'Tinos', 'Times New Roman', 'Liberation Serif', 'Times', serif; margin: 0; padding: 0; }
      .report-container { max-width: 194mm; margin: 0 auto; padding: 3px; }
      .bulk-report-page { padding: 1rem; }
      .excel-card { background: white; border-radius: 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .excel-card-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 1.25rem; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
      th, td { border: 1px solid #000; padding: 4px 5px; font-size: 10px; }
      th { background: #fff; font-weight: bold; }
    `;
  }
}

/** Logo, stamp, and signing authority — same rows as /reports/individual (fetch once per bulk job). */
async function fetchSchoolBranding() {
  const [logoResult, stampResult, authorityResult] = await Promise.all([
    query('SELECT * FROM school_logo WHERE id = 1'),
    query('SELECT * FROM school_stamp WHERE id = 1'),
    query('SELECT * FROM authority_data WHERE id = 1')
  ]);
  return {
    school_logo: logoResult.rows.length > 0 ? logoResult.rows[0] : null,
    school_stamp: stampResult.rows.length > 0 ? stampResult.rows[0] : null,
    authority_data: authorityResult.rows.length > 0 ? authorityResult.rows[0] : null
  };
}

/**
 * Get report data directly from database (internal function to avoid HTTP requests)
 */
async function getReportDataInternal(form, stream, year, term, admNo, branding) {
  // This function replicates the logic from the individual report endpoint
  // but bypasses authentication and HTTP requests
  
  const normalizedStream = normalizeStream(stream);
  const yearNum = parseInt(year, 10);
  
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
  const formCode = form.replace('FORM ', '').trim();
  const isFormVOrVI = ['V', 'VI', '5', '6'].includes(formCode);
  
  // Get months based on term
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
  
  // Get student data
  const streamsToCheck = normalizedStream === 'A' ? ['A', 'NA'] : [normalizedStream, stream];
  const uniqueStreams = [...new Set(streamsToCheck)];
  
  let studentResult;
  if (uniqueStreams.length === 1) {
    studentResult = await query(
      'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
      [admNo, form, uniqueStreams[0], yearNum]
    );
  } else {
    studentResult = await query(
      'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
      [admNo, form, uniqueStreams[0], uniqueStreams[1], yearNum]
    );
  }
  
  if (studentResult.rows.length === 0) {
    throw new Error(`Student not found: ${admNo} in ${form} ${year}`);
  }
  
  const student = studentResult.rows[0];
  const actualStream = student.stream;
  
  // Get subjects
  const subjectStreams = actualStream === 'NA' || normalizedStream === 'A' ? ['A', 'NA'] : [actualStream];
  const uniqueSubjectStreams = [...new Set(subjectStreams)];
  
  let subjectsResult;
  if (uniqueSubjectStreams.length === 1) {
    subjectsResult = await query(
      'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
      [form, uniqueSubjectStreams[0], yearNum]
    );
  } else {
    subjectsResult = await query(
      'SELECT * FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
      [form, uniqueSubjectStreams[0], uniqueSubjectStreams[1], yearNum]
    );
  }

  const uniqueSubjectCodes = new Set(
    subjectsResult.rows
      .map((s) => s.subject_code)
      .filter((c) => c != null && String(c).trim() !== '')
  );

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
      marksConfigResult.rows.forEach((row) => {
        monthWeights[row.month] = parseFloat(row.weight);
      });
      marksConfig = { month_weights: monthWeights };
    }
  } catch (e) {
    /* keep defaults if table missing */
  }

  // Get individual scores (same query as /reports/individual)
  const monthlyResult = await query(
    'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND month = ANY($6::text[])',
    [admNo, form, actualStream, normalizedStream, yearNum, months]
  );

  const filteredBySubject = monthlyResult.rows.filter((row) => uniqueSubjectCodes.has(row.subject_code));
  const sortedByPreference = filteredBySubject.sort((a, b) => {
    if (a.subject_code === b.subject_code && a.month === b.month) {
      if (a.stream === 'NA' && b.stream !== 'NA') return -1;
      if (a.stream !== 'NA' && b.stream === 'NA') return 1;
    }
    return 0;
  });
  const seenMonthKey = new Set();
  const deduplicatedMonthlyResults = sortedByPreference.filter((row) => {
    const key = `${row.subject_code}_${row.month}`;
    if (seenMonthKey.has(key)) return false;
    seenMonthKey.add(key);
    return true;
  });

  let allStudentsQuery = 'SELECT adm_no FROM students WHERE level = $1 AND stream IN ($2, $3) AND year = $4';
  let allStudentsParams = [form, actualStream, normalizedStream, yearNum];
  if (isFormVOrVI) {
    allStudentsQuery += ' AND term = $5';
    allStudentsParams.push(normalizedTerm);
  }
  const allStudentsResult = await query(allStudentsQuery, allStudentsParams);

  let allMonthlyResultsQuery =
    'SELECT * FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = ANY($5::text[])';
  let allMonthlyResultsParams = [form, actualStream, normalizedStream, yearNum, months];
  if (isFormVOrVI) {
    allMonthlyResultsQuery = `
      SELECT i.* FROM individual_scores i
      INNER JOIN students s ON i.adm_no = s.adm_no
      WHERE i.level = $1 AND i.stream IN ($2, $3) AND i.year = $4 AND i.month = ANY($5::text[])
      AND s.term = $6
    `;
    allMonthlyResultsParams.push(normalizedTerm);
  }
  const allMonthlyResults = await query(allMonthlyResultsQuery, allMonthlyResultsParams);

  const subjectRankings = {};
  subjectsResult.rows.forEach((subject) => {
    const subjectTotals = {};
    const subjectCodesToMatch = [subject.subject_code, subject.subject_abbreviation].filter(Boolean);
    allStudentsResult.rows.forEach((srow) => {
      let total = 0;
      let validMonths = 0;
      months.forEach((month) => {
        const result = allMonthlyResults.rows.find(
          (r) => r.adm_no === srow.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
        );
        if (result) {
          if (result.score === null || result.score === undefined || result.score === '' || result.score === '-') {
            return;
          }
          const weight = marksConfig.month_weights[month] || 0;
          total += parseFloat(result.score) * (weight / 100);
          validMonths++;
        }
      });
      subjectTotals[srow.adm_no] = validMonths > 0 ? total / validMonths : 0;
    });
    const sorted = Object.entries(subjectTotals)
      .sort((a, b) => b[1] - a[1])
      .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
    subjectRankings[subject.subject_code] = {};
    sorted.forEach((item) => {
      subjectRankings[subject.subject_code][item.adm_no] = item.rank;
    });
  });

  const overallTotals = {};
  allStudentsResult.rows.forEach((srow) => {
    let grandTotal = 0;
    let validSubjects = 0;
    subjectsResult.rows.forEach((subject) => {
      const subjectCodesToMatch = [subject.subject_code, subject.subject_abbreviation].filter(Boolean);
      let subjectTotal = 0;
      let validMonths = 0;
      months.forEach((month) => {
        const result = allMonthlyResults.rows.find(
          (r) => r.adm_no === srow.adm_no && subjectCodesToMatch.includes(r.subject_code) && r.month === month
        );
        if (result) {
          if (result.score === null || result.score === undefined || result.score === '' || result.score === '-') {
            return;
          }
          const weight = marksConfig.month_weights[month] || 0;
          subjectTotal += parseFloat(result.score) * (weight / 100);
          validMonths++;
        }
      });
      if (validMonths > 0) {
        grandTotal += subjectTotal / validMonths;
        validSubjects++;
      }
    });
    overallTotals[srow.adm_no] = validSubjects > 0 ? grandTotal / validSubjects : 0;
  });

  const sortedOverall = Object.entries(overallTotals)
    .sort((a, b) => {
      const scoreDiff = b[1] - a[1];
      if (scoreDiff !== 0) return scoreDiff;
      return String(a[0]).localeCompare(String(b[0]));
    })
    .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));

  const overallRank = sortedOverall.find((item) => item.adm_no === admNo)?.rank || '-';

  const subjectsData = {};
  let totalMarks = 0;
  subjectsResult.rows.forEach((subject) => {
    const monthScores = {};
    const subjectCodesToMatch = [subject.subject_code, subject.subject_abbreviation].filter(Boolean);
    months.forEach((month) => {
      const result = monthlyResult.rows.find(
        (r) => subjectCodesToMatch.includes(r.subject_code) && r.month === month
      );
      monthScores[month] = result ? parseFloat(result.score || 0) : 0;
    });
    const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
    const grade = calculateGrade(weightedTotal, form);
    subjectsData[subject.subject_code] = {
      grade,
      weighted_total: weightedTotal,
      name: subject.subject_name || subject.subject_code
    };
    totalMarks += weightedTotal;
  });

  const average = calculateOverallAverage(subjectsData);
  const overallGrade = calculateGrade(average, form);
  const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
  let divisionPoint = null;
  let division = null;
  if (isForm5Or6) {
    divisionPoint = calculateALevelDivisionPoint(subjectsData, stream);
    division = getALevelDivision(divisionPoint);
  } else {
    divisionPoint = calculateOLevelDivisionPoint(subjectsData);
    division = getOLevelDivision(divisionPoint);
  }

  // Student index for photos (must match Individual report route / PhotoManagement ordering)
  const isFormIToIV = /^FORM\s+(I|II|III|IV)$/i.test(form);
  const studentIndexStudentsQuery = (isFormIToIV && normalizedStream === 'A')
    ? `SELECT adm_no, first_name, middle_name, surname
       FROM students
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4
       ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`
    : `SELECT adm_no, first_name, middle_name, surname
       FROM students
       WHERE level = $1 AND stream = $2 AND year = $3
       ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`;
  const studentIndexStudentsQueryWithLimit = `${studentIndexStudentsQuery} LIMIT 500`;
  const studentIndexStudentsParams = (isFormIToIV && normalizedStream === 'A')
    ? [form, 'A', 'NA', yearNum]
    : [form, normalizedStream, yearNum];
  const studentIndexStudentsResult = await query(studentIndexStudentsQueryWithLimit, studentIndexStudentsParams);
  const studentIndexPos = studentIndexStudentsResult.rows.findIndex(
    (s) => String(s.adm_no) === String(admNo)
  );
  const studentIndex = (studentIndexPos >= 0 ? studentIndexPos : -1).toString();

  let studentPhoto = null;
  try {
    const photoStreamsToCheck = (isFormIToIV && normalizedStream === 'A') ? ['A', 'NA'] : [normalizedStream];
    const photoResult = (photoStreamsToCheck.length === 2)
      ? await query(
        'SELECT photo_filename FROM student_photos WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
        [studentIndex, form, photoStreamsToCheck[0], photoStreamsToCheck[1], yearNum]
      )
      : await query(
        'SELECT photo_filename FROM student_photos WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
        [studentIndex, form, photoStreamsToCheck[0], yearNum]
      );
    if (photoResult.rows.length > 0 && photoResult.rows[0]?.photo_filename) {
      studentPhoto = photoResult.rows[0].photo_filename;
    }
  } catch (e) {
    studentPhoto = student.photo_filename || null;
  }

  const subjectTeachersResult = await query(
    'SELECT subject_code, teacher_signature FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3',
    [form, normalizedStream, yearNum]
  );
  const subjectTeacherSignatures = {};
  subjectTeachersResult.rows.forEach((row) => {
    subjectTeacherSignatures[row.subject_code] = row.teacher_signature || '';
  });

  // Get basic report data (simplified for bulk PDF) + assets required by htmlReportRenderer
  return {
    student: {
      ...student,
      photo_path: studentPhoto
    },
    subjects: subjectsResult.rows,
    monthly_results: deduplicatedMonthlyResults,
    months,
    form,
    term: normalizedTerm,
    year,
    marks_config: marksConfig,
    subject_rankings: subjectRankings,
    overall_rank: overallRank,
    total_students: allStudentsResult.rows.length,
    summary_data: {
      total_marks: totalMarks.toFixed(1),
      average: average.toFixed(1),
      grade: overallGrade,
      division: division || '0',
      division_point: divisionPoint !== null ? divisionPoint.toString() : '0',
      position: overallRank.toString(),
      total_students: allStudentsResult.rows.length.toString()
    },
    school_logo: branding.school_logo,
    school_stamp: branding.school_stamp,
    authority_data: branding.authority_data,
    subject_teacher_signatures: subjectTeacherSignatures
  };
}

/**
 * Generate HTML for a single report (extract just the report-container content)
 */
async function generateSingleReportHTML(reportData, apiUrl = 'http://localhost:5000') {
  const fullHTML = await generateReportHTML(reportData, apiUrl);
  const s = fullHTML.indexOf(REPORT_INNER_START);
  const e = fullHTML.indexOf(REPORT_INNER_END);
  if (s !== -1 && e !== -1 && e > s) {
    return fullHTML.slice(s + REPORT_INNER_START.length, e).trim();
  }
  // Fallback: walk nested <div> until outer report-container closes
  const openNeedle = '<div class="report-container">';
  const start = fullHTML.indexOf(openNeedle);
  if (start !== -1) {
    let pos = start + openNeedle.length;
    let depth = 1;
    while (pos < fullHTML.length && depth > 0) {
      const rest = fullHTML.slice(pos);
      const closeRel = rest.indexOf('</div>');
      if (closeRel === -1) break;
      const beforeClose = rest.slice(0, closeRel);
      const divOpen = /<div\b/i.exec(beforeClose);
      if (divOpen) {
        depth += 1;
        const tagStartPos = pos + divOpen.index;
        const gt = fullHTML.indexOf('>', tagStartPos);
        if (gt === -1) break;
        pos = gt + 1;
        continue;
      }
      depth -= 1;
      if (depth === 0) {
        return fullHTML.slice(start + openNeedle.length, pos + closeRel).trim();
      }
      pos += closeRel + 6;
    }
  }
  const bodyMatch = fullHTML.match(/<body>([\s\S]*?)<\/body>/);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1].trim();
  }
  console.warn('[BULK PDF] Could not extract report inner markup, using full HTML');
  return fullHTML;
}

/**
 * Generate bulk PDF by creating ONE HTML document with all reports, then converting to PDF
 * This matches the Python version's approach - much more efficient!
 * @param {string} form - Form level (e.g., 'FORM I')
 * @param {string} stream - Stream (e.g., 'NA', 'A', 'PCB')
 * @param {number} year - Year (e.g., 2025)
 * @param {string} term - Term (e.g., 'Term I', 'Term II')
 * @param {Array} students - Array of student objects with adm_no
 * @param {string} apiUrl - Backend API URL
 * @param {string} authToken - Auth token for API requests
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateBulkReportPDFWithBatches(
  form,
  stream,
  year,
  term,
  students,
  apiUrl = process.env.API_URL || 'http://localhost:5000',
  authToken = null
) {
  console.log(`[BULK PDF] Starting bulk PDF generation for ${students.length} students`);
  console.log(`[BULK PDF] Using Python-style approach: Generate ONE HTML with all reports, then convert to PDF`);
  
  const startTime = Date.now();
  let browser = null;
  
  try {
    // Step 1: Generate HTML for all individual reports
    console.log(`[BULK PDF] Step 1: Generating HTML for all ${students.length} reports...`);
    const htmlStartTime = Date.now();
    const reportHTMLs = [];
    const errors = [];
    
    // Encode parameters for URL
    const encodedForm = encodeURIComponent(form);
    const encodedStream = encodeURIComponent(stream || 'NA');
    const encodedTerm = encodeURIComponent(term);
    
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const branding = await fetchSchoolBranding();
    
    // Fetch report data for all students and generate HTML
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const admNo = student.adm_no || student.admNo;
      const studentStream = student.stream || stream;
      
      try {
        // Get report data directly from database (no HTTP requests)
        const reportData = await getReportDataInternal(form, studentStream, year, term, admNo, branding);
        
        // Generate HTML for this report (just the container content)
        const reportHTML = await generateSingleReportHTML({
          ...reportData,
          form,
          term,
          year
        }, apiUrl);
        
        reportHTMLs.push(reportHTML);
        
        // Log progress every 10 students
        if ((i + 1) % 10 === 0) {
          console.log(`[BULK PDF] Generated HTML for ${i + 1}/${students.length} students`);
        }
      } catch (error) {
        console.error(`[BULK PDF] Error generating HTML for student ${admNo}:`, error.message);
        errors.push({ admNo, error: error.message });
      }
    }
    
    if (reportHTMLs.length === 0) {
      throw new Error('No reports were generated successfully. All students failed.');
    }
    
    const htmlTime = Date.now() - htmlStartTime;
    console.log(`[BULK PDF] HTML generation completed in ${htmlTime}ms (${reportHTMLs.length}/${students.length} reports)`);
    if (errors.length > 0) {
      console.warn(`[BULK PDF] ${errors.length} students failed:`, errors.map(e => e.admNo).join(', '));
    }
    
    // Step 2: Combine all report HTMLs into one document
    console.log(`[BULK PDF] Step 2: Combining ${reportHTMLs.length} reports into one HTML document...`);
    const cssContent = await getCSSContent();
    
    const combinedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulk Student Report - ${form} ${year} ${term}</title>
  ${HEAD_FONT_LINKS}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    ${cssContent}
    /* Bulk multi-sheet: do not give every sheet min-height:100vh (breaks logo/photo after first student in Chrome PDF) */
    .bulk-report-page > .bulk-reports-list .excel-card-body > .report-container {
      min-height: 0 !important;
      overflow: visible !important;
      overflow-x: visible !important;
    }
    .bulk-report-page .report-header {
      display: grid !important;
      grid-template-columns: 90px minmax(0, 1fr) 90px !important;
      align-items: center !important;
      gap: 8px !important;
      min-height: 104px !important;
      position: relative !important;
      overflow: visible !important;
      box-sizing: border-box !important;
    }
    .bulk-report-page .report-header .school-info {
      grid-column: 2 !important;
      min-width: 0 !important;
    }
    .bulk-report-page .logo-section {
      grid-column: 1 !important;
      position: relative !important;
      left: auto !important;
      right: auto !important;
      top: auto !important;
    }
    .bulk-report-page .student-photo {
      grid-column: 3 !important;
      position: relative !important;
      left: auto !important;
      right: auto !important;
      top: auto !important;
    }
    @media print {
      .download-section, .breadcrumb, .bulk-report-actions, .excel-card-header { display: none !important; }
      .bulk-report-page .excel-card,
      .bulk-report-page .excel-card-body {
        overflow: visible !important;
      }
      /* IndividualReportDetail hides logo/photo placeholders in print; restore for bulk when images load late or fail */
      .bulk-report-page .logo-section .school-logo-placeholder,
      .bulk-report-page .student-photo .photo-placeholder,
      .bulk-report-page .logo-section .school-logo-placeholder i,
      .bulk-report-page .student-photo .photo-placeholder i {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .report-container {
        page-break-after: always;
        margin-bottom: 20px;
      }
      .report-container:last-child {
        page-break-after: auto;
      }
      .bulk-report-page {
        padding: 0.5rem;
      }
      .excel-card {
        box-shadow: none;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="bulk-report-page">

    <div class="bulk-reports-list">
      <div class="excel-card">
        <div class="excel-card-body">
          ${reportHTMLs.map((html, index) => `
            <div class="report-container" style="${index > 0 ? 'page-break-before: always;' : ''}">
              ${html}
            </div>
          `).join('\n')}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const publicOrigin = publicOriginFromApiUrl(apiUrl);
    console.log('[BULK PDF] Inlining images (logo, photos, stamp, signatures) as data URIs for reliable multi-page PDF...');
    const htmlForPdf = await inlineBulkReportImages(combinedHTML, publicOrigin, authToken);
    
    // Step 3: Convert combined HTML to PDF using Puppeteer
    console.log(`[BULK PDF] Step 3: Converting HTML to PDF using Puppeteer...`);
    const pdfStartTime = Date.now();
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      timeout: 300000 // 5 minutes timeout for browser launch (bulk PDFs can take time)
    });
    
    const page = await browser.newPage();
    
    // Set default timeout for page operations (5 minutes for bulk PDFs)
    page.setDefaultTimeout(300000);
    page.setDefaultNavigationTimeout(300000);
    
    // Set viewport to match premium local development appearance
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false
    });

    await page.emulateMediaType('print');
    
    // Set auth headers for image requests
    if (authToken) {
      await page.setExtraHTTPHeaders({
        'Authorization': `Bearer ${authToken}`
      });
    }
    
    // Set base URL for relative image paths
    const baseUrl = apiUrl.replace('/api', '');
    
    // Set content and wait for it to load
    // Use 'load' instead of 'networkidle0' for bulk PDFs to avoid timeout issues
    // networkidle0 waits for no network activity, which can timeout with many reports
    try {
      await page.setContent(htmlForPdf, {
        waitUntil: 'load', // Changed from 'networkidle0' to 'load' for better reliability
        timeout: 300000, // 5 minutes timeout for setContent (bulk PDFs can be large)
        baseURL: baseUrl
      });
    } catch (contentError) {
      // If 'load' times out, try with 'domcontentloaded' as fallback
      console.warn('[BULK PDF] setContent with "load" timed out, trying "domcontentloaded"...');
      try {
        await page.setContent(htmlForPdf, {
          waitUntil: 'domcontentloaded',
          timeout: 300000,
          baseURL: baseUrl
        });
      } catch (domError) {
        // Last resort: set content without waiting
        console.warn('[BULK PDF] setContent with "domcontentloaded" also timed out, setting content without wait...');
        await page.setContent(htmlForPdf, {
          waitUntil: 'commit',
          timeout: 300000,
          baseURL: baseUrl
        });
      }
    }
    
    try {
      await page.evaluate(() => document.fonts.ready);
    } catch (e) {
      console.warn('[BULK PDF] document.fonts.ready:', e.message);
    }

    console.log('[BULK PDF] Waiting for report images to finish loading...');
    try {
      await page.evaluate(async () => {
        const imgs = Array.from(document.querySelectorAll('.bulk-report-page img[src]'));
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise((resolve) => {
                if (img.complete && img.naturalWidth > 0) {
                  resolve();
                  return;
                }
                const done = () => resolve();
                const t = setTimeout(done, 15000);
                img.addEventListener('load', () => { clearTimeout(t); done(); }, { once: true });
                img.addEventListener('error', () => { clearTimeout(t); done(); }, { once: true });
              })
          )
        );
      });
    } catch (imgWaitErr) {
      console.warn('[BULK PDF] Image wait:', imgWaitErr.message);
    }
    
    // Wait a bit for all images/fonts to load (increased wait time for bulk PDFs)
    console.log('[BULK PDF] Waiting for resources to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // CRITICAL: Execute the same JavaScript styling enforcement as local development
    // This ensures exact congruence between local and production PDFs for each report
    console.log('[BULK PDF] Applying JavaScript styling enforcement for exact congruence...');
    await page.evaluate((fontStack) => {
      // Apply styling enforcement to all report containers
      const reportContainers = document.querySelectorAll('.report-container');
      
      reportContainers.forEach((container) => {
        // Force MAONI column visibility within each report
        const forceMaoniColumnVisible = () => {
          const maoniHeaders = container.querySelectorAll('.academic-table th:nth-child(10)');
          const maoniCells = container.querySelectorAll('.academic-table td:nth-child(10)');
          
          maoniHeaders.forEach((header) => {
            header.style.setProperty('display', 'table-cell', 'important');
            header.style.setProperty('visibility', 'visible', 'important');
            header.style.setProperty('opacity', '1', 'important');
            header.style.setProperty('border', '1px solid #000000', 'important');
          });
          
          maoniCells.forEach((cell) => {
            cell.style.setProperty('display', 'table-cell', 'important');
            cell.style.setProperty('visibility', 'visible', 'important');
            cell.style.setProperty('opacity', '1', 'important');
            cell.style.setProperty('border', '1px solid #000000', 'important');
          });
        };

        // Force thin black borders on all table cells within each report
        const forceThinBlackBorders = () => {
          const allTableCells = container.querySelectorAll('td, th');
          allTableCells.forEach((cell) => {
            cell.style.setProperty('border', '1px solid #000000', 'important');
          });
        };

        // Force column widths within each report
        const forceColumnWidths = () => {
          const academicTable = container.querySelector('.academic-table');
          if (!academicTable) return;

          academicTable.style.setProperty('table-layout', 'fixed', 'important');
          academicTable.style.setProperty('width', '100%', 'important');

          // Column widths - ensure all 10 columns are properly sized
          const colWidths = ['33%', '7%', '7%', '7%', '7%', '5%', '4%', '4%', '12%', '14%'];
          colWidths.forEach((width, idx) => {
            const col = academicTable.querySelectorAll(`th:nth-child(${idx + 1}), td:nth-child(${idx + 1})`);
            col.forEach(cell => {
              cell.style.setProperty('width', width, 'important');
              cell.style.setProperty('min-width', width, 'important');
              cell.style.setProperty('max-width', width, 'important');
            });
          });
        };
        
        // Force NAFASI header rotation within each report
        const forceNafasiRotation = () => {
          const academicTable = container.querySelector('.academic-table');
          if (!academicTable) return;
          
          // Find NAFASI header (column 8 with rotate-header class)
          const nafasiHeader = academicTable.querySelector('thead tr:first-child th:nth-child(8).rotate-header');
          if (nafasiHeader) {
            // Apply rotation with all vendor prefixes for maximum compatibility
            nafasiHeader.style.setProperty('writing-mode', 'vertical-rl', 'important');
            nafasiHeader.style.setProperty('text-orientation', 'mixed', 'important');
            nafasiHeader.style.setProperty('transform', 'rotate(180deg)', 'important');
            nafasiHeader.style.setProperty('-webkit-transform', 'rotate(180deg)', 'important');
            nafasiHeader.style.setProperty('-moz-transform', 'rotate(180deg)', 'important');
            nafasiHeader.style.setProperty('-ms-transform', 'rotate(180deg)', 'important');
            nafasiHeader.style.setProperty('-o-transform', 'rotate(180deg)', 'important');
            nafasiHeader.style.setProperty('white-space', 'nowrap', 'important');
            nafasiHeader.style.setProperty('text-align', 'center', 'important');
            nafasiHeader.style.setProperty('vertical-align', 'middle', 'important');
            nafasiHeader.style.setProperty('display', 'table-cell', 'important');
            nafasiHeader.style.setProperty('position', 'relative', 'important');
          }
        };

        // CRITICAL: Force premium font styling to match local development exactly
        const forcePremiumFontStyling = () => {
          const allTextElements = container.querySelectorAll('*');
          allTextElements.forEach(element => {
            // Times New Roman for report body
            if (element.tagName !== 'IMG' && element.tagName !== 'SVG') {
              element.style.setProperty('font-family', fontStack, 'important');
              // Ensure font sizes are applied correctly
              const computedStyle = window.getComputedStyle(element);
              const fontSize = computedStyle.fontSize;
              if (fontSize && parseFloat(fontSize) > 0) {
                element.style.setProperty('font-size', fontSize, 'important');
              }
            }
          });
        };

        // Initialize formatting - same as local development
        const initFormatting = () => {
          forceMaoniColumnVisible();
          forceThinBlackBorders();
          forceColumnWidths();
          forceNafasiRotation();
          forcePremiumFontStyling();
        };

        // Run immediately for each report
        initFormatting();

        // Use MutationObserver to watch for style changes within each report
        const academicTable = container.querySelector('.academic-table');
        if (academicTable) {
          const observer = new MutationObserver(() => {
            setTimeout(initFormatting, 10);
          });

          observer.observe(academicTable, {
            attributes: true,
            attributeFilter: ['style'],
            subtree: true
          });
        }

        // CRITICAL: Force grade key to be visible within each report
        const gradeKeyLegend = container.querySelector('.grade-key-legend');
        if (gradeKeyLegend) {
          gradeKeyLegend.style.setProperty('display', 'block', 'important');
          gradeKeyLegend.style.setProperty('visibility', 'visible', 'important');
          gradeKeyLegend.style.setProperty('opacity', '1', 'important');
          gradeKeyLegend.style.setProperty('color', '#000000', 'important');
          
          // Force all child divs to be visible
          const childDivs = gradeKeyLegend.querySelectorAll('div');
          childDivs.forEach(div => {
            div.style.setProperty('display', 'block', 'important');
            div.style.setProperty('visibility', 'visible', 'important');
            div.style.setProperty('opacity', '1', 'important');
            div.style.setProperty('color', '#000000', 'important');
          });
          
          // Force all strong tags to be visible
          const strongTags = gradeKeyLegend.querySelectorAll('strong');
          strongTags.forEach(strong => {
            strong.style.setProperty('display', 'inline', 'important');
            strong.style.setProperty('visibility', 'visible', 'important');
            strong.style.setProperty('opacity', '1', 'important');
            strong.style.setProperty('color', '#000000', 'important');
            strong.style.setProperty('font-weight', 'bold', 'important');
          });
        }
      });
    }, FONT_STACK);
    
    // Final grace period after JavaScript execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate PDF with premium settings to match local development appearance
    console.log('[BULK PDF] Generating PDF from HTML (this may take a while for bulk reports)...');
    const pdfPromise = page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '5mm',
        right: '2.5mm',
        bottom: '5mm',
        left: '2.5mm'
      },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      scale: 0.85
    });
    
    // Add timeout wrapper (10 minutes for very large bulk PDFs)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('PDF generation timed out after 10 minutes')), 600000);
    });
    
    const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise]);
    
    const pdfTime = Date.now() - pdfStartTime;
    const totalTime = Date.now() - startTime;
    
    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    let buffer;
    if (Buffer.isBuffer(pdfBuffer)) {
      buffer = pdfBuffer;
    } else {
      buffer = Buffer.from(pdfBuffer);
    }
    
    // Verify it's a valid PDF
    const firstBytes = buffer.slice(0, 4);
    if (firstBytes[0] !== 0x25 || firstBytes[1] !== 0x50 || firstBytes[2] !== 0x44 || firstBytes[3] !== 0x46) {
      throw new Error('Generated file is not a valid PDF');
    }
    
    console.log(`[BULK PDF] PDF conversion completed in ${pdfTime}ms`);
    console.log(`[BULK PDF] TOTAL TIME: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`[BULK PDF] Final PDF size: ${buffer.length} bytes`);
    
    return buffer;
    
  } catch (error) {
    console.error('[BULK PDF] Error during PDF generation:', error);
    // Provide more helpful error messages
    if (error.message.includes('timeout') || error.message.includes('Timeout') || error.name === 'TimeoutError') {
      throw new Error(`PDF generation timed out. This can happen with large bulk reports (${students.length} students). The operation may take several minutes. Please try again or generate PDFs in smaller batches.`);
    }
    throw error;
  } finally {
    // Always close browser
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[BULK PDF] Error closing browser:', closeError);
      }
    }
  }
}

module.exports = {
  generateBulkReportPDFWithBatches
};
