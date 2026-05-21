/**
 * Monthly results PDF via PDFKit (no Chromium/Puppeteer — reliable on Railway).
 */
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs').promises;
const { query } = require('../config/database');
const { normalizeStream } = require('./streamNormalizer');

const SCHOOL_NAME = 'ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU';
const SCHOOL_FULL_NAME = 'CATHOLIC ARCHDIOCESE OF ARUSHA';
const CONTACT_LINES = [
  'P.O BOX 3102 Arusha, Tanzania',
  '+255 754 92 60 22 / +255 765 394 802',
  'Email: arucase@gmail.com',
];

function compareNames(a, b) {
  const fn = String(a.first_name || '').localeCompare(String(b.first_name || ''), undefined, {
    sensitivity: 'base',
  });
  if (fn !== 0) return fn;
  const mn = String(a.middle_name || '').localeCompare(String(b.middle_name || ''), undefined, {
    sensitivity: 'base',
  });
  if (mn !== 0) return mn;
  return String(a.surname || '').localeCompare(String(b.surname || ''), undefined, { sensitivity: 'base' });
}

function getTestType(month, level) {
  const isALevel = level.includes('FORM V') || level.includes('FORM VI');
  const testTypes = {
    February: 'MONTHLY',
    March: 'MIDTERM',
    April: 'MONTHLY',
    May: isALevel ? 'ANNUAL' : 'TERMINAL',
    June: 'MONTHLY',
    July: 'MONTHLY',
    August: 'MONTHLY',
    September: 'MIDTERM',
    October: 'MONTHLY',
    November: isALevel ? 'TERMINAL' : 'ANNUAL',
    December: 'MONTHLY',
    January: 'MONTHLY',
  };
  return (testTypes[month] || 'MONTHLY') + ' RESULTS';
}

function formatALevelSubjectHeader(label) {
  const s = String(label || '').trim();
  if (!s) return s;
  const m1 = s.match(/^A\/(BIO|CHE|COM|DIV|HTM|MAT|PHY)$/i);
  if (m1) {
    const code = m1[1].toUpperCase();
    return code === 'COM' ? 'ACOM' : code;
  }
  const m2 = s.match(/^A_(BIO|CHE|COM|DIV|HTM|MAT|PHY)$/i);
  if (m2) {
    const code = m2[1].toUpperCase();
    return code === 'COM' ? 'ACOM' : code;
  }
  return s;
}

function formatScore(value) {
  if (value === undefined || value === null || value === '') return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
  return String(num)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '');
}

function formatComDisplay(value, isALevel) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const code = raw.toLowerCase();
  if (!isALevel) {
    if (code === 'sc') return 'Science';
    if (code === 'ss') return 'Art';
    if (code === 'ui') return 'Under investigation';
  }
  return raw.toUpperCase();
}

function getGradeFill(grade, avgValue, isALevel) {
  if (!grade) return null;
  if (grade === 'C' && avgValue !== null && avgValue < 55 && !isALevel) return '#fecaca';
  const map = {
    A: '#22c55e',
    B: isALevel ? '#22c55e' : '#86efac',
    C: isALevel ? '#86efac' : '#fef9c3',
    D: isALevel ? '#fef9c3' : '#fecaca',
    E: '#fecaca',
    S: '#fecaca',
    F: '#fecaca',
  };
  return map[grade] || null;
}

function getGradeTextColor(grade, avgValue, isALevel) {
  if (!grade) return '#000000';
  if (grade === 'C' && avgValue !== null && avgValue < 55 && !isALevel) return '#7f1d1d';
  if (grade === 'A') return '#ffffff';
  if (grade === 'B' && isALevel) return '#ffffff';
  if (grade === 'B') return '#14532d';
  if (grade === 'C' && isALevel) return '#14532d';
  if (grade === 'C') return '#713f12';
  if (grade === 'D' && isALevel) return '#713f12';
  return '#7f1d1d';
}

async function loadLogoBuffer() {
  try {
    const logoResult = await query('SELECT logo_image_path FROM school_logo WHERE id = 1');
    if (!logoResult.rows.length || !logoResult.rows[0].logo_image_path) return null;
    const logoPath = logoResult.rows[0].logo_image_path;
    if (logoPath.startsWith('http')) {
      const axios = require('axios');
      const response = await axios.get(logoPath, { responseType: 'arraybuffer', timeout: 10000 });
      return Buffer.from(response.data);
    }
    return fs.readFile(path.join(__dirname, '../static', logoPath));
  } catch (e) {
    console.warn('Monthly results PDF: logo not loaded:', e.message);
    return null;
  }
}

async function loadMonthlyResultsData(level, stream, year, month) {
  const normalizedLevel = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
  const normalizedStream = normalizeStream(stream);
  const normalizedMonth = decodeURIComponent(String(month).replace(/\+/g, ' ')).trim();
  const normalizedYear = parseInt(year, 10);
  const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(normalizedLevel);
  const isALevel = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');

  let studentsResult;
  if (normalizedStream === 'ALL') {
    studentsResult = await query(
      'SELECT adm_no, first_name, middle_name, surname, stream, com FROM students WHERE level = $1 AND year = $2 ORDER BY adm_no',
      [normalizedLevel, normalizedYear]
    );
  } else if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
    studentsResult = await query(
      'SELECT adm_no, first_name, middle_name, surname, stream, com FROM students WHERE level = $1 AND (stream = $2 OR stream = $3) AND year = $4 ORDER BY adm_no',
      [normalizedLevel, 'A', 'NA', normalizedYear]
    );
  } else {
    studentsResult = await query(
      'SELECT adm_no, first_name, middle_name, surname, stream, com FROM students WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY adm_no',
      [normalizedLevel, normalizedStream, normalizedYear]
    );
  }

  if (studentsResult.rows.length === 0) {
    const err = new Error('No students found for this class');
    err.status = 404;
    throw err;
  }

  let subjectsResult;
  if (normalizedStream === 'ALL') {
    subjectsResult = await query(
      'SELECT DISTINCT subject_code, subject_abbreviation, subject_name FROM subjects WHERE level = $1 AND year = $2 ORDER BY subject_code',
      [normalizedLevel, normalizedYear]
    );
  } else {
    subjectsResult = await query(
      'SELECT subject_code, subject_abbreviation, subject_name FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
      [normalizedLevel, normalizedStream, 'NA', normalizedYear]
    );
  }

  const scoresResult =
    normalizedStream === 'ALL'
      ? await query(
          `SELECT adm_no, subject_code, score FROM individual_scores WHERE level = $1 AND year = $2 AND month = $3`,
          [normalizedLevel, normalizedYear, normalizedMonth]
        )
      : await query(
          `SELECT adm_no, subject_code, score FROM individual_scores WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
          [normalizedLevel, normalizedStream, 'NA', normalizedYear, normalizedMonth]
        );

  let monthlyResultsResult;
  if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
    monthlyResultsResult = await query(
      `SELECT student_index, total_marks, average, grade, position, remarks FROM monthly_results
       WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
      [normalizedLevel, 'A', 'NA', normalizedYear, normalizedMonth]
    );
  } else {
    monthlyResultsResult = await query(
      `SELECT student_index, total_marks, average, grade, position, remarks FROM monthly_results
       WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4`,
      [normalizedLevel, normalizedStream, normalizedYear, normalizedMonth]
    );
  }

  const monthlyResultsMap = {};
  monthlyResultsResult.rows.forEach((row) => {
    monthlyResultsMap[String(row.student_index)] = row;
  });

  const scoreLookup = {};
  scoresResult.rows.forEach((row) => {
    if (!scoreLookup[row.adm_no]) scoreLookup[row.adm_no] = {};
    scoreLookup[row.adm_no][row.subject_code] = parseFloat(row.score);
  });

  const subjects = subjectsResult.rows.map((subject) => {
    const raw = subject.subject_abbreviation || subject.subject_code;
    return { ...subject, header: isALevel ? formatALevelSubjectHeader(raw) : raw };
  });

  const studentsWithResults = studentsResult.rows.map((student, idx) => ({
    ...student,
    result: monthlyResultsMap[String(idx)] || {},
  }));

  studentsWithResults.sort((a, b) => {
    const resultA = a.result;
    const resultB = b.result;
    const avgA =
      resultA?.average !== null && resultA?.average !== undefined ? Number(resultA.average) : null;
    const avgB =
      resultB?.average !== null && resultB?.average !== undefined ? Number(resultB.average) : null;
    const aHasAvg = avgA !== null && Number.isFinite(avgA);
    const bHasAvg = avgB !== null && Number.isFinite(avgB);
    if (aHasAvg && bHasAvg && avgA !== avgB) return avgB - avgA;
    if (aHasAvg && !bHasAvg) return -1;
    if (!aHasAvg && bHasAvg) return 1;
    if (aHasAvg && bHasAvg && avgA === avgB) {
      const totA =
        resultA?.total_marks !== null && resultA?.total_marks !== undefined
          ? Number(resultA.total_marks)
          : null;
      const totB =
        resultB?.total_marks !== null && resultB?.total_marks !== undefined
          ? Number(resultB.total_marks)
          : null;
      if (totA !== null && totB !== null && Number.isFinite(totA) && Number.isFinite(totB) && totA !== totB) {
        return totB - totA;
      }
    }
    return compareNames(a, b);
  });

  return {
    normalizedLevel,
    normalizedStream,
    normalizedMonth,
    normalizedYear,
    isALevel,
    subjects,
    studentsWithResults,
    scoreLookup,
    testType: getTestType(normalizedMonth, normalizedLevel),
    logoBuffer: await loadLogoBuffer(),
  };
}

function truncateText(doc, text, maxWidth) {
  const s = String(text ?? '-');
  if (doc.widthOfString(s) <= maxWidth) return s;
  let t = s;
  while (t.length > 1 && doc.widthOfString(`${t}…`) > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function buildColumns(data, contentW) {
  const fixedCols = [
    { label: 'S/N', width: 22, align: 'center' },
    { label: 'F.Name', width: 52, align: 'left' },
    { label: 'M.Name', width: 44, align: 'left' },
    { label: 'Surname', width: 52, align: 'left' },
  ];
  const tailCols = [
    { label: 'TOT', width: 28, align: 'center' },
    { label: 'AVR', width: 24, align: 'center' },
    { label: 'GRD', width: 22, align: 'center' },
    { label: 'POS', width: 22, align: 'center' },
    { label: 'COM', width: 36, align: 'center' },
    { label: 'REMARKS', width: 70, align: 'left' },
  ];
  const fixedW = [...fixedCols, ...tailCols].reduce((s, c) => s + c.width, 0);
  const subjectCount = Math.max(data.subjects.length, 1);
  const subjectColW = Math.max(18, Math.floor((contentW - fixedW) / subjectCount));
  const subjectCols = data.subjects.map((s) => ({
    label: String(s.header || '').slice(0, 10),
    width: subjectColW,
    align: 'center',
  }));
  const columns = [...fixedCols, ...subjectCols, ...tailCols];
  const totalW = columns.reduce((s, c) => s + c.width, 0);
  if (totalW > contentW) {
    const scale = contentW / totalW;
    columns.forEach((c) => {
      c.width = Math.max(14, Math.floor(c.width * scale));
    });
  }
  return columns;
}

function buildRowCells(student, index, data) {
  const monthlyResult = student.result || {};
  const sl = data.scoreLookup[student.adm_no] || {};
  const cells = [
    String(index + 1),
    String(student.first_name || ''),
    String(student.middle_name || '-'),
    String(student.surname || ''),
  ];
  data.subjects.forEach((subject) => {
    const subjectKey = subject.subject_abbreviation || subject.subject_code;
    const score = sl[subjectKey] ?? sl[subject.subject_code];
    cells.push(formatScore(score));
  });
  cells.push(
    formatScore(monthlyResult.total_marks),
    monthlyResult.average !== null && monthlyResult.average !== undefined
      ? String(Math.round(monthlyResult.average))
      : '-',
    monthlyResult.grade || '-',
    String(monthlyResult.position || '-'),
    formatComDisplay(data.isALevel ? student.com || student.stream : student.com, data.isALevel),
    String(monthlyResult.remarks || '-')
  );
  return { cells, monthlyResult };
}

/**
 * @returns {Promise<Buffer>}
 */
async function renderMonthlyResultsPdf(level, stream, year, month) {
  const data = await loadMonthlyResultsData(level, stream, year, month);
  console.log('Generating monthly results PDF (PDFKit):', {
    level: data.normalizedLevel,
    stream: data.normalizedStream,
    year: data.normalizedYear,
    month: data.normalizedMonth,
    students: data.studentsWithResults.length,
    subjects: data.subjects.length,
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 24 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const buf = Buffer.concat(buffers);
      if (!buf.length) {
        reject(new Error('Generated PDF buffer is empty'));
        return;
      }
      resolve(buf);
    });
    doc.on('error', reject);

    const margin = 24;
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const contentW = pageW - margin * 2;
    const tableBottom = pageH - margin - 12;
    const columns = buildColumns(data, contentW);
    const rowH = 12;
    const headerRowH = 14;
    const fontSize = columns.length > 18 ? 6 : columns.length > 14 ? 6.5 : 7;
    let y = margin;

    const drawPageHeader = () => {
      const headerH = 72;
      doc.save();
      doc.roundedRect(margin, y, contentW, headerH, 4).fill('#b0e0e6');
      doc.restore();
      const logoSize = 48;
      if (data.logoBuffer) {
        try {
          doc.image(data.logoBuffer, margin + 8, y + 10, { fit: [logoSize, logoSize] });
          doc.image(data.logoBuffer, margin + contentW - logoSize - 8, y + 10, { fit: [logoSize, logoSize] });
        } catch (e) {
          console.warn('Monthly results PDF: could not embed logo:', e.message);
        }
      }
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(14);
      doc.text(SCHOOL_FULL_NAME, margin, y + 8, { width: contentW, align: 'center' });
      doc.fontSize(12).text(SCHOOL_NAME, margin, y + 26, { width: contentW, align: 'center' });
      doc.font('Helvetica').fontSize(8);
      doc.text(CONTACT_LINES.join('\n'), margin, y + 44, { width: contentW, align: 'center', lineGap: 1 });
      y += headerH + 4;
      doc.save();
      doc.rect(margin, y, contentW, 18).fill('#87ceeb');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
      doc.text(
        `${data.normalizedLevel} ${data.testType} ${data.normalizedMonth.toUpperCase()} ${data.normalizedYear}`,
        margin,
        y + 4,
        { width: contentW, align: 'center' }
      );
      doc.restore();
      y += 22;
    };

    const drawTableHeader = () => {
      let x = margin;
      doc.save();
      doc.rect(margin, y, contentW, headerRowH).fill('#e5e7eb').stroke();
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(fontSize);
      columns.forEach((col) => {
        doc.text(truncateText(doc, col.label, col.width - 4), x + 2, y + 3, {
          width: col.width - 4,
          align: col.align,
          lineBreak: false,
        });
        x += col.width;
      });
      doc.restore();
      y += headerRowH;
    };

    drawPageHeader();
    drawTableHeader();

    data.studentsWithResults.forEach((student, index) => {
      if (y + rowH > tableBottom) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 24 });
        y = margin;
        drawTableHeader();
      }

      const { cells, monthlyResult } = buildRowCells(student, index, data);
      const grade = monthlyResult.grade || '';
      const avgValue =
        monthlyResult.average !== null && monthlyResult.average !== undefined
          ? parseFloat(monthlyResult.average)
          : null;
      const fill = getGradeFill(grade, avgValue, data.isALevel);
      const textColor = getGradeTextColor(grade, avgValue, data.isALevel);

      let x = margin;
      doc.save();
      if (fill) doc.rect(margin, y, contentW, rowH).fill(fill);
      doc.strokeColor('#000000').lineWidth(0.25).rect(margin, y, contentW, rowH).stroke();
      doc.fillColor(textColor).font('Helvetica').fontSize(fontSize);
      cells.forEach((cell, ci) => {
        const col = columns[ci];
        doc.text(truncateText(doc, cell, col.width - 4), x + 2, y + 2, {
          width: col.width - 4,
          align: col.align,
          lineBreak: false,
        });
        x += col.width;
      });
      doc.restore();
      y += rowH;
    });

    doc.end();
  });
}

module.exports = { renderMonthlyResultsPdf, loadMonthlyResultsData };
