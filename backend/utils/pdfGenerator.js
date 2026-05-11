/**
 * PDF Generation Utilities
 */
const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { normalizeStream } = require('../utils/streamNormalizer');
const {
  dedupeCommentRowsByTypePreferA,
  dedupeTabiaRowsByCriterionPreferA
} = require('./reportCommentDedupe');
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

async function generateIndividualReportPDF(form, stream, year, term, admNo) {
  return new Promise(async (resolve, reject) => {
    try {
      // Normalize stream: NA -> A
      const normalizedStream = normalizeStream(stream);
      const decodedForm = decodeURIComponent(form).trim().toUpperCase();
      const decodedTerm = decodeURIComponent(term).trim();
      
      // Get student data
      const studentResult = await query(
        'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4',
        [admNo, decodedForm, normalizedStream, parseInt(year)]
      );
      
      if (studentResult.rows.length === 0) {
        throw new Error(`Student not found: ${admNo} in ${decodedForm} ${normalizedStream} ${year}`);
      }
      
      const student = studentResult.rows[0];
      const formCode = decodedForm.replace('FORM ', '').trim();
      const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);

      // Get months based on term
      // Form V/VI: Academic year July-June. Term I (Jul-Dec): Aug-Nov, Term II (Jan-Jun): Feb-May
      // Form I-IV: Term I: Feb-May, Term II: Aug-Nov
      const getMonthsForTerm = (termParam) => {
        if (isForm5Or6) {
          return (termParam === 'Term I' || termParam === 'Term 1')
            ? ['August', 'September', 'October', 'November']
            : ['February', 'March', 'April', 'May'];
        } else {
          return (termParam === 'Term I' || termParam === 'Term 1')
            ? ['February', 'March', 'April', 'May']
            : ['August', 'September', 'October', 'November'];
        }
      };
      const months = getMonthsForTerm(decodedTerm);
      
      // Get marks configuration
      let marksConfig = {
        month_weights: {
          February: 40.0, March: 0.0, April: 40.0, May: 20.0,
          August: 40.0, September: 0.0, October: 40.0, November: 20.0
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
        console.log('Marks config table not found, using defaults');
      }
      
      // Get subjects
      const subjectsResult = await query(
        'SELECT * FROM subjects WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY subject_code',
        [decodedForm, normalizedStream, parseInt(year)]
      );
      
      // Get individual scores
      const monthlyResult = await query(
        'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream = $3 AND year = $4 AND month = ANY($5::text[])',
        [admNo, decodedForm, normalizedStream, parseInt(year), months]
      );
      
      // Get all students for ranking
      const allStudentsResult = await query(
        'SELECT adm_no FROM students WHERE level = $1 AND stream = $2 AND year = $3',
        [decodedForm, normalizedStream, parseInt(year)]
      );
      
      const allMonthlyResults = await query(
        'SELECT * FROM individual_scores WHERE level = $1 AND stream = $2 AND year = $3 AND month = ANY($4::text[])',
        [decodedForm, normalizedStream, parseInt(year), months]
      );
      
      // Calculate subject rankings
      const subjectRankings = {};
      subjectsResult.rows.forEach((subject) => {
        const subjectTotals = {};
        allStudentsResult.rows.forEach((s) => {
          let total = 0;
          months.forEach((month) => {
            const result = allMonthlyResults.rows.find(
              (r) => r.adm_no === s.adm_no && r.subject_code === subject.subject_code && r.month === month
            );
            if (result) {
              const weight = marksConfig.month_weights[month] || 0;
              total += parseFloat(result.score || 0) * (weight / 100);
            }
          });
          subjectTotals[s.adm_no] = total;
        });
        const sorted = Object.entries(subjectTotals)
          .sort((a, b) => b[1] - a[1])
          .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
        subjectRankings[subject.subject_code] = {};
        sorted.forEach((item) => {
          subjectRankings[subject.subject_code][item.adm_no] = item.rank;
        });
      });
      
      // Calculate overall ranking
      const overallTotals = {};
      allStudentsResult.rows.forEach((s) => {
        let grandTotal = 0;
        subjectsResult.rows.forEach((subject) => {
          let subjectTotal = 0;
          months.forEach((month) => {
            const result = allMonthlyResults.rows.find(
              (r) => r.adm_no === s.adm_no && r.subject_code === subject.subject_code && r.month === month
            );
            if (result) {
              const weight = marksConfig.month_weights[month] || 0;
              subjectTotal += parseFloat(result.score || 0) * (weight / 100);
            }
          });
          grandTotal += subjectTotal;
        });
        overallTotals[s.adm_no] = grandTotal;
      });
      
      const sortedOverall = Object.entries(overallTotals)
        .sort((a, b) => b[1] - a[1])
        .map((entry, index) => ({ adm_no: entry[0], rank: index + 1 }));
      
      const overallRank = sortedOverall.find((item) => item.adm_no === admNo)?.rank || '-';
      
      // Get student index for comments/photos.
      // Must match PhotoManagement sorting exactly (JS localeCompare) and FORM I-IV stream behavior (A + NA).
      const isFormIToIV = ['I', 'II', 'III', 'IV', '1', '2', '3', '4'].includes(formCode.toUpperCase());
      const sortStudentsByName = (students) => {
        return [...students].sort((a, b) => {
          const firstNameA = String(a.first_name || '').toLowerCase().trim();
          const firstNameB = String(b.first_name || '').toLowerCase().trim();
          const firstNameCompare = firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
          if (firstNameCompare !== 0) return firstNameCompare;

          const middleNameA = String(a.middle_name || '').toLowerCase().trim();
          const middleNameB = String(b.middle_name || '').toLowerCase().trim();
          const middleNameCompare = middleNameA.localeCompare(middleNameB, undefined, { sensitivity: 'base' });
          if (middleNameCompare !== 0) return middleNameCompare;

          const surnameA = String(a.surname || '').toLowerCase().trim();
          const surnameB = String(b.surname || '').toLowerCase().trim();
          return surnameA.localeCompare(surnameB, undefined, { sensitivity: 'base' });
        });
      };

      const studentIndexStudentsQuery = (isFormIToIV && normalizedStream === 'A')
        ? `SELECT adm_no, first_name, middle_name, surname
           FROM students
           WHERE level = $1 AND stream IN ($2, $3) AND year = $4
           ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
           LIMIT 500`
        : `SELECT adm_no, first_name, middle_name, surname
           FROM students
           WHERE level = $1 AND stream = $2 AND year = $3
           ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC
           LIMIT 500`;

      const studentIndexStudentsParams = (isFormIToIV && normalizedStream === 'A')
        ? [decodedForm, 'A', 'NA', parseInt(year)]
        : [decodedForm, normalizedStream, parseInt(year)];

      const studentIndexStudentsResult = await query(studentIndexStudentsQuery, studentIndexStudentsParams);

      const sortedStudentsByName = sortStudentsByName(studentIndexStudentsResult.rows);
      const studentIndexPos = sortedStudentsByName.findIndex(
        (s) => String(s.adm_no) === String(admNo)
      );
      const studentIndex = (studentIndexPos >= 0 ? studentIndexPos : -1).toString();
      
      // Get comments (FORM I–IV: rows may be stored as stream A or NA — match bulk report / comments list)
      let commentsResult;
      if (isFormIToIV && normalizedStream === 'A') {
        const cr = await query(
          `SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
          [studentIndex, decodedForm, 'A', 'NA', parseInt(year), decodedTerm]
        );
        commentsResult = { rows: dedupeCommentRowsByTypePreferA(cr.rows) };
      } else {
        commentsResult = await query(
          'SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
          [studentIndex, decodedForm, normalizedStream, parseInt(year), decodedTerm]
        );
      }
      
      let tabiaResult;
      if (isFormIToIV && normalizedStream === 'A') {
        const tr = await query(
          `SELECT * FROM tabia_mwenendo WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6`,
          [studentIndex, decodedForm, 'A', 'NA', parseInt(year), decodedTerm]
        );
        tabiaResult = { rows: dedupeTabiaRowsByCriterionPreferA(tr.rows) };
      } else {
        tabiaResult = await query(
          'SELECT * FROM tabia_mwenendo WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5',
          [studentIndex, decodedForm, normalizedStream, parseInt(year), decodedTerm]
        );
      }
      
      // Get subject teacher signatures
      const subjectTeachersResult = await query(
        'SELECT subject_code, teacher_signature FROM subject_teachers WHERE level = $1 AND stream = $2 AND year = $3',
        [decodedForm, normalizedStream, parseInt(year)]
      );
      const subjectTeacherSignatures = {};
      subjectTeachersResult.rows.forEach((row) => {
        subjectTeacherSignatures[row.subject_code] = row.teacher_signature || '';
      });
      
      // Get school logo, stamp, and authority data
      const logoResult = await query('SELECT * FROM school_logo WHERE id = 1');
      const stampResult = await query('SELECT * FROM school_stamp WHERE id = 1');
      const authorityResult = await query('SELECT * FROM authority_data WHERE id = 1');
      
      // Get student parish
      let studentParish = 'Not specified';
      try {
        const parishResult = (isFormIToIV && normalizedStream === 'A')
          ? await query(
              `SELECT parish_name FROM student_parishes WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
               ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
              [studentIndex, decodedForm, 'A', 'NA', parseInt(year)]
            )
          : await query(
              'SELECT parish_name FROM student_parishes WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
              [studentIndex, decodedForm, normalizedStream, parseInt(year)]
            );
        if (parishResult.rows.length > 0) {
          studentParish = parishResult.rows[0].parish_name || student.parish || 'Not specified';
        } else {
          studentParish = student.parish || 'Not specified';
        }
      } catch (e) {
        studentParish = student.parish || 'Not specified';
      }
      
      // Get student fees debt
      let studentFeesDebt = '0.00';
      try {
        const debtResult = (isFormIToIV && normalizedStream === 'A')
          ? await query(
              `SELECT amount, description FROM individual_debt WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5
               ORDER BY CASE WHEN stream = $3 THEN 0 ELSE 1 END LIMIT 1`,
              [studentIndex, decodedForm, 'A', 'NA', parseInt(year)]
            )
          : await query(
              'SELECT amount, description FROM individual_debt WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
              [studentIndex, decodedForm, normalizedStream, parseInt(year)]
            );
        if (debtResult.rows.length > 0) {
          const debt = debtResult.rows[0];
          if (debt.amount && debt.description) {
            studentFeesDebt = `${parseFloat(debt.amount).toFixed(0)} - ${debt.description}`;
          } else if (debt.amount) {
            studentFeesDebt = parseFloat(debt.amount).toFixed(0);
          }
        }
      } catch (e) {
        studentFeesDebt = student.fees_debt || '0.00';
      }
      
      // Get student photo
      let studentPhoto = null;
      try {
        // Some deployments may have mixed stream values in student_photos for FORM I-IV.
        const photoStreamsToCheck = (isFormIToIV && normalizedStream === 'A') ? ['A', 'NA'] : [normalizedStream];

        const photoResult = (photoStreamsToCheck.length === 2)
          ? await query(
              'SELECT photo_filename FROM student_photos WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
              [studentIndex, decodedForm, photoStreamsToCheck[0], photoStreamsToCheck[1], parseInt(year)]
            )
          : await query(
              'SELECT photo_filename FROM student_photos WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4',
              [studentIndex, decodedForm, photoStreamsToCheck[0], parseInt(year)]
            );

        if (photoResult.rows.length > 0) {
          studentPhoto = photoResult.rows[0].photo_filename;
        }
      } catch (e) {
        studentPhoto = student.photo_filename || null;
      }
      
      // Get fees announcements - filter by term
      let classFeesAnnouncements = {};
      try {
        // Try with term first (new format)
        let feesAnnouncementsResult;
        try {
          feesAnnouncementsResult = await query(
            'SELECT announcement_index, announcement_text FROM fees_announcements WHERE level = $1 AND stream = $2 AND year = $3 AND term = $4 ORDER BY announcement_index',
            [decodedForm, stream, parseInt(year), term]
          );
        } catch (e) {
          // If term column doesn't exist, fall back to old query (backward compatibility)
          if (e.message.includes('column') && e.message.includes('term')) {
            feesAnnouncementsResult = await query(
              'SELECT announcement_index, announcement_text FROM fees_announcements WHERE level = $1 AND stream = $2 AND year = $3 ORDER BY announcement_index',
              [decodedForm, stream, parseInt(year)]
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
        classFeesAnnouncements = {};
      }
      
      // Calculate subject data
      const subjectsData = {};
      let totalMarks = 0;
      subjectsResult.rows.forEach((subject) => {
        const monthScores = {};
        months.forEach((month) => {
          const result = monthlyResult.rows.find(
            (r) => r.subject_code === subject.subject_code && r.month === month
          );
          monthScores[month] = result ? parseFloat(result.score || 0) : 0;
        });
        const weightedTotal = calculateWeightedTotal(monthScores, months, marksConfig.month_weights || {});
        const grade = calculateGrade(weightedTotal, decodedForm);
        subjectsData[subject.subject_code] = {
          grade: grade,
          weighted_total: weightedTotal,
          name: subject.subject_name || subject.subject_code,
          monthScores: monthScores
        };
        totalMarks += weightedTotal;
      });
      
      const average = calculateOverallAverage(subjectsData);
      const overallGrade = calculateGrade(average, decodedForm);
      
      // Calculate division
      let divisionPoint = null;
      let division = null;
      if (isForm5Or6) {
        divisionPoint = calculateALevelDivisionPoint(subjectsData, stream);
        division = getALevelDivision(divisionPoint);
      } else {
        divisionPoint = calculateOLevelDivisionPoint(subjectsData);
        division = getOLevelDivision(divisionPoint);
      }
      
      // Create PDF with optimized margins for A4
      const doc = new PDFDocument({ 
        margin: 0,
        size: 'A4',
        layout: 'portrait'
      });
      const buffers = [];
      
      doc.on('error', (error) => {
        console.error('PDF Document Error:', error);
        reject(new Error('Error generating PDF document: ' + error.message));
      });
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          if (pdfBuffer.length === 0) {
            reject(new Error('Generated PDF is empty'));
            return;
          }
          resolve(pdfBuffer);
        } catch (error) {
          reject(new Error('Error creating PDF buffer: ' + error.message));
        }
      });
      
      // Helper functions - check both formats for backward compatibility
      const getCommentValue = (key) => {
        // First try the correct format (without _comments suffix)
        const comment = commentsResult.rows.find((c) => c.comment_type === key);
        if (comment) return comment.comment_text || '';
        
        // Fallback: try with _comments suffix for backward compatibility
        const commentWithSuffix = commentsResult.rows.find((c) => c.comment_type === `${key}_comments`);
        return commentWithSuffix?.comment_text || '';
      };
      
      const getTabiaGrade = (code) => {
        const tabia = tabiaResult.rows.find((t) => t.code === code);
        return tabia?.grade || 'C';
      };
      
      const formatAuthorityDate = () => {
        if (authorityResult.rows[0]?.date) {
          try {
            const dateObj = new Date(authorityResult.rows[0].date);
            if (!isNaN(dateObj.getTime())) {
              const day = String(dateObj.getDate()).padStart(2, '0');
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const year = dateObj.getFullYear();
              return `${day}/${month}/${year}`;
            }
          } catch (e) {}
          return authorityResult.rows[0].date;
        }
        return new Date().toLocaleDateString('en-GB');
      };
      
      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const marginX = 28; // 8mm ≈ 28pt
      const marginY = 28; // 10mm ≈ 28pt
      const contentWidth = pageWidth - (marginX * 2);
      let currentY = marginY;
      
      // Helper to check if new page needed
      const checkNewPage = (requiredHeight) => {
        if (currentY + requiredHeight > pageHeight - marginY) {
          doc.addPage();
          currentY = marginY;
          return true;
        }
        return false;
      };
      
      // Helper to draw table cell
      const drawCell = (x, y, width, height, text, options = {}) => {
        const align = options.align || 'left';
        const fontSize = options.fontSize || 8;
        const font = options.font || 'Helvetica';
        const bold = options.bold || false;
        
        // Draw border first
        doc.rect(x, y, width, height).stroke();
        
        // Set font
        doc.fontSize(fontSize).font(bold ? 'Helvetica-Bold' : font);
        
        // Calculate text position - center vertically
        const textY = y + (height - fontSize) / 2 - 2; // -2 for better centering
        
        // Handle multi-line text
        const textStr = String(text || '');
        const lines = textStr.split('\n');
        
        if (lines.length === 1) {
          // Single line - use text with alignment
          const textOptions = {
            width: width - 4,
            align: align === 'right' ? 'right' : align === 'center' ? 'center' : 'left'
          };
          doc.text(textStr, x + 2, textY, textOptions);
        } else {
          // Multi-line - center each line
          const lineHeight = fontSize + 1;
          const totalHeight = lines.length * lineHeight;
          let lineY = y + (height - totalHeight) / 2;
          
          lines.forEach((line) => {
            const textOptions = {
              width: width - 4,
              align: align === 'right' ? 'right' : align === 'center' ? 'center' : 'left'
            };
            doc.text(line, x + 2, lineY, textOptions);
            lineY += lineHeight;
          });
        }
      };
      
      // HEADER SECTION
      const headerHeight = 60;
      checkNewPage(headerHeight);
      
      // Logo (left)
      const logoSize = 50;
      if (logoResult.rows[0]?.logo_image_path) {
        try {
          const logoPath = logoResult.rows[0].logo_image_path;
          
          // Check if it's a URL (Cloudinary) or local file
          if (logoPath.startsWith('http')) {
            // For Cloudinary URLs, we need to fetch the image and convert to buffer
            try {
              const axios = require('axios');
              const response = await axios.get(logoPath, { 
                responseType: 'arraybuffer',
                timeout: 10000 
              });
              const imageBuffer = Buffer.from(response.data);
              doc.image(imageBuffer, marginX, currentY, { width: logoSize, height: logoSize });
            } catch (fetchError) {
              console.error('Error fetching logo from URL:', fetchError.message);
            }
          } else {
            // Local file path
            const fullLogoPath = path.join(__dirname, '../static', logoPath);
            if (await fileExists(fullLogoPath)) {
              doc.image(fullLogoPath, marginX, currentY, { width: logoSize, height: logoSize });
            }
          }
        } catch (err) {
          console.error('Error loading logo:', err);
        }
      }
      
      // School info (center)
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('CATHOLIC ARCHDIOCESE OF ARUSHA', marginX + logoSize + 10, currentY, {
        width: contentWidth - logoSize - 10 - 60,
        align: 'center'
      });
      doc.fontSize(11);
      doc.text('ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU', marginX + logoSize + 10, currentY + 12, {
        width: contentWidth - logoSize - 10 - 60,
        align: 'center'
      });
      doc.fontSize(8).font('Helvetica');
      doc.text('P.O BOX 3102 Arusha, Tanzania', marginX + logoSize + 10, currentY + 24, {
        width: contentWidth - logoSize - 10 - 60,
        align: 'center'
      });
      doc.text('+255 754 92 60 22 / +255 765 394 802 (Office)', marginX + logoSize + 10, currentY + 32, {
        width: contentWidth - logoSize - 10 - 60,
        align: 'center'
      });
      doc.text('Email: arucase@gmail.com', marginX + logoSize + 10, currentY + 40, {
        width: contentWidth - logoSize - 10 - 60,
        align: 'center'
      });
      
      // Student photo (right)
      const photoSize = 50;
      const photoX = pageWidth - marginX - photoSize;
      if (studentPhoto) {
        try {
          const photoPath = path.join(__dirname, '../static/uploads/photos', studentPhoto);
          if (await fileExists(photoPath)) {
            // Read file as buffer and validate format
            const imageBuffer = await fs.readFile(photoPath);
            
            // Validate buffer is not empty
            if (!imageBuffer || imageBuffer.length === 0) {
              throw new Error('Image file is empty');
            }
            
            // Detect image format from magic bytes to validate
            const isJPEG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
            const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
            const isGIF = imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46;
            const isWebP = imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46 && 
                           imageBuffer[8] === 0x57 && imageBuffer[9] === 0x45 && imageBuffer[10] === 0x42 && imageBuffer[11] === 0x50;
            
            let finalImageBuffer = imageBuffer;
            
            // Convert WebP to JPEG if needed (PDFKit doesn't support WebP)
            if (isWebP) {
              try {
                // Convert WebP to JPEG using Sharp
                finalImageBuffer = await sharp(imageBuffer)
                  .jpeg({ quality: 90 })
                  .toBuffer();
              } catch (convertError) {
                console.error('Error converting WebP to JPEG:', convertError);
                throw new Error('Failed to convert WebP image to JPEG format');
              }
            } else if (isJPEG || isPNG || isGIF) {
              // Already in supported format, use as-is
              finalImageBuffer = imageBuffer;
            } else {
              // Unknown format - try file path as fallback
              const ext = path.extname(studentPhoto).toLowerCase();
              if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
                // Try using file path - PDFKit will attempt to read and detect format
                doc.image(photoPath, photoX, currentY, { width: photoSize, height: photoSize });
                return; // Exit early if using file path
              } else {
                throw new Error(`Unsupported image format: ${ext || 'unknown'}. Only JPEG, PNG, GIF, and WebP are supported.`);
              }
            }
            
            // Use the (possibly converted) buffer with PDFKit
            doc.image(finalImageBuffer, photoX, currentY, { width: photoSize, height: photoSize });
          }
        } catch (err) {
          console.error('Error loading photo:', err);
          console.error('Photo filename:', studentPhoto);
          // Silently skip photo if there's an error (don't break the PDF generation)
        }
      }
      
      currentY += headerHeight + 5;
      
      // SECTION A: TAARIFA YA MAENDELEO YA MWANAFUNZI
      checkNewPage(40);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('A. TAARIFA YA MAENDELEO YA MWANAFUNZI', marginX, currentY);
      currentY += 12;
      
      const infoTableHeight = 45;
      // Ensure widths sum exactly to contentWidth
      const infoColWidths = [];
      const infoColCount = 6;
      const baseWidth = Math.floor(contentWidth / infoColCount);
      let remainder = contentWidth - (baseWidth * infoColCount);
      for (let i = 0; i < infoColCount; i++) {
        infoColWidths.push(baseWidth + (i < remainder ? 1 : 0));
      }
      let infoX = marginX;
      
      // Row 1
      drawCell(infoX, currentY, infoColWidths[0], 15, 'JINA KAMILI', { bold: true, fontSize: 7 });
      infoX += infoColWidths[0];
      const fullName = `${student.first_name} ${student.middle_name || ''} ${student.surname}`.trim();
      drawCell(infoX, currentY, infoColWidths[1] * 2, 15, fullName, { fontSize: 7 });
      infoX += infoColWidths[1] * 2;
      drawCell(infoX, currentY, infoColWidths[2], 15, 'JINSIA', { bold: true, fontSize: 7 });
      infoX += infoColWidths[2];
      drawCell(infoX, currentY, infoColWidths[3], 15, student.sex || '', { fontSize: 7 });
      currentY += 15;
      
      // Row 2
      infoX = marginX;
      drawCell(infoX, currentY, infoColWidths[0], 15, 'KIDATO', { bold: true, fontSize: 7 });
      infoX += infoColWidths[0];
      drawCell(infoX, currentY, infoColWidths[1], 15, formCode, { fontSize: 7 });
      infoX += infoColWidths[1];
      drawCell(infoX, currentY, infoColWidths[2], 15, 'MUHULA', { bold: true, fontSize: 7 });
      infoX += infoColWidths[2];
      drawCell(infoX, currentY, infoColWidths[3], 15, decodedTerm.replace('Term ', ''), { fontSize: 7 });
      infoX += infoColWidths[3];
      drawCell(infoX, currentY, infoColWidths[4], 15, 'MWEZI', { bold: true, fontSize: 7 });
      infoX += infoColWidths[4];
      const monthText = isForm5Or6
        ? (decodedTerm === 'Term I' ? 'DECEMBER' : 'JUNE')
        : (decodedTerm === 'Term I' ? 'JUNE' : 'DECEMBER');
      drawCell(infoX, currentY, infoColWidths[5], 15, monthText, { fontSize: 7 });
      currentY += 15;
      
      // Row 3
      infoX = marginX;
      drawCell(infoX, currentY, infoColWidths[0], 15, 'MWAKA', { bold: true, fontSize: 7 });
      infoX += infoColWidths[0];
      drawCell(infoX, currentY, infoColWidths[1], 15, year.toString(), { fontSize: 7 });
      infoX += infoColWidths[1];
      drawCell(infoX, currentY, infoColWidths[2], 15, 'PAROKIA YA', { bold: true, fontSize: 7 });
      infoX += infoColWidths[2];
      drawCell(infoX, currentY, infoColWidths[3] * 3, 15, studentParish, { fontSize: 7 });
      currentY += 20;
      
      // SECTION B: UFANISI WA MWANAFUNZI KITAALUMA NA MASOMO
      checkNewPage(100);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('B. UFANISI WA MWANAFUNZI KITAALUMA NA MASOMO', marginX, currentY);
      currentY += 12;
      
      // Academic table header - normalize widths to sum exactly to contentWidth
      const acadColPercentages = [0.33, 0.07, 0.07, 0.07, 0.07, 0.05, 0.04, 0.04, 0.09, 0.17];
      const acadColWidths = [];
      let acadTotalWidth = 0;
      acadColPercentages.forEach((percent, index) => {
        const width = index === acadColPercentages.length - 1 
          ? contentWidth - acadTotalWidth // Last column gets remainder
          : Math.floor(contentWidth * percent);
        acadColWidths.push(width);
        acadTotalWidth += width;
      });
      
      let acadX = marginX;
      const headerRowY = currentY;
      const headerRowHeight = 30;
      
      // Header row 1
      // Subject column spans full height (rowSpan=2)
      drawCell(acadX, headerRowY, acadColWidths[0], headerRowHeight, 'SOMO', { bold: true, fontSize: 7, align: 'center' });
      acadX += acadColWidths[0];
      // Scores columns header (spans 4 month columns, only row 1)
      drawCell(acadX, headerRowY, acadColWidths[1] + acadColWidths[2] + acadColWidths[3] + acadColWidths[4], headerRowHeight / 2, 'ALAMA ZA UFAULU', { bold: true, fontSize: 7, align: 'center' });
      acadX += acadColWidths[1] + acadColWidths[2] + acadColWidths[3] + acadColWidths[4];
      // Total column spans full height (rowSpan=2)
      drawCell(acadX, headerRowY, acadColWidths[5], headerRowHeight, 'JUMLA', { bold: true, fontSize: 7, align: 'center' });
      acadX += acadColWidths[5];
      // Grade column spans full height (rowSpan=2)
      drawCell(acadX, headerRowY, acadColWidths[6], headerRowHeight, 'DARAJA', { bold: true, fontSize: 7, align: 'center' });
      acadX += acadColWidths[6];
      // Rank column spans full height (rowSpan=2)
      drawCell(acadX, headerRowY, acadColWidths[7], headerRowHeight, 'NAFASI', { bold: true, fontSize: 7, align: 'center' });
      acadX += acadColWidths[7];
      // MAONI column spans full height (rowSpan=2)
      drawCell(acadX, headerRowY, acadColWidths[8], headerRowHeight, 'MAONI', { bold: true, fontSize: 7, align: 'center' });
      acadX += acadColWidths[8];
      // Signature column spans full height (rowSpan=2)
      drawCell(acadX, headerRowY, acadColWidths[9], headerRowHeight, 'SAHIHI YA\nMWALIMU', { bold: true, fontSize: 6, align: 'center' });
      
      // Header row 2 - only draw month column headers
      acadX = marginX + acadColWidths[0]; // Start after subject column
      const monthLabels = months.map(m => {
        if (m === 'February' || m === 'August') return 'Jrb1';
        if (m === 'March' || m === 'September') return 'Robo';
        if (m === 'April' || m === 'October') return 'Jrb2';
        if (m === 'May' || m === 'November') return 'Muh';
        return m.substring(0, 4);
      });
      const weightLabels = months.map(m => {
        const weight = marksConfig.month_weights[m] || 0;
        return weight > 0 ? `(${weight.toFixed(1)}%)` : '(0.0%)';
      });
      
      // Draw month column headers (second row only)
      for (let i = 0; i < 4; i++) {
        drawCell(acadX, headerRowY + headerRowHeight / 2, acadColWidths[i + 1], headerRowHeight / 2, 
          `${monthLabels[i]}\n${weightLabels[i]}`, { bold: true, fontSize: 6, align: 'center' });
        acadX += acadColWidths[i + 1];
      }
      
      currentY += headerRowHeight;
      const rowHeight = 18;
      
      // Subject rows
      subjectsResult.rows.forEach((subject) => {
        checkNewPage(rowHeight + 5);
        const subjectData = subjectsData[subject.subject_code] || {};
        const monthScores = subjectData.monthScores || {};
        const weightedTotal = subjectData.weighted_total || 0;
        const grade = subjectData.grade || 'F';
        const rank = subjectRankings[subject.subject_code]?.[admNo] || '-';
        const comment = getCommentValue(`subject_${subject.subject_code}`) || 'Feli';
        const signature = subjectTeacherSignatures[subject.subject_code] || '';
        
        acadX = marginX;
        drawCell(acadX, currentY, acadColWidths[0], rowHeight, subject.subject_name || subject.subject_code, { fontSize: 7 });
        acadX += acadColWidths[0];
        
        for (let i = 0; i < 4; i++) {
          const month = months[i];
          const score = monthScores[month] || 0;
          drawCell(acadX, currentY, acadColWidths[i + 1], rowHeight, score.toFixed(1), { fontSize: 7, align: 'center' });
          acadX += acadColWidths[i + 1];
        }
        
        drawCell(acadX, currentY, acadColWidths[5], rowHeight, weightedTotal.toFixed(1), { fontSize: 7, align: 'center' });
        acadX += acadColWidths[5];
        drawCell(acadX, currentY, acadColWidths[6], rowHeight, grade, { fontSize: 7, align: 'center' });
        acadX += acadColWidths[6];
        drawCell(acadX, currentY, acadColWidths[7], rowHeight, rank.toString(), { fontSize: 7, align: 'center' });
        acadX += acadColWidths[7];
        drawCell(acadX, currentY, acadColWidths[8], rowHeight, comment, { fontSize: 6 });
        acadX += acadColWidths[8];
        drawCell(acadX, currentY, acadColWidths[9], rowHeight, signature, { fontSize: 6 });
        
        currentY += rowHeight;
      });
      
      currentY += 5;
      
      // KEY
      checkNewPage(15);
      doc.fontSize(7).font('Helvetica');
      doc.text('KEY: Jrb1 = Jaribio 1, Robo = Robo Muhula, Jrb2 = Jaribio 2, Nusu = Nusu Muhula, Muh = Muhula', marginX, currentY);
      currentY += 10;

      // Grading scale legend (only for Form V/VI)
      if (isForm5Or6) {
        checkNewPage(20);
        doc.fontSize(7).font('Helvetica');
        doc.text('ALAMA: A = 85+, Bora Sana, B = 75+, Vizuri Sana, C = 65+, Vizuri, D = 55+, Dhaifu, E = 45+, Wastani, S = 40+, Kidogo, F = 0 – 39, Feli', marginX, currentY);
        currentY += 10;
        doc.text('TABIA: A, Vizuri Sana, B, Vizuri, C, Wastani, D, Dhaifu, F, Mbaya', marginX, currentY);
        currentY += 10;
      }
      
      // MAJUMUISHO YA KITAALUMA - normalize widths
      checkNewPage(30);
      const summaryColPercentages = [0.25, 0.15, 0.1, 0.1, 0.15, 0.25];
      const summaryColWidths = [];
      let summaryTotalWidth = 0;
      summaryColPercentages.forEach((percent, index) => {
        const width = index === summaryColPercentages.length - 1
          ? contentWidth - summaryTotalWidth
          : Math.floor(contentWidth * percent);
        summaryColWidths.push(width);
        summaryTotalWidth += width;
      });
      let summaryX = marginX;
      const summaryRowHeight = 15;
      
      drawCell(summaryX, currentY, summaryColWidths[0], summaryRowHeight, 'JUMLA KUU KATIKA MASOMO NI:', { bold: true, fontSize: 7 });
      summaryX += summaryColWidths[0];
      drawCell(summaryX, currentY, summaryColWidths[1], summaryRowHeight, totalMarks.toFixed(1), { fontSize: 7, align: 'center' });
      summaryX += summaryColWidths[1];
      drawCell(summaryX, currentY, summaryColWidths[2], summaryRowHeight, 'WASTANI', { bold: true, fontSize: 7 });
      summaryX += summaryColWidths[2];
      drawCell(summaryX, currentY, summaryColWidths[3], summaryRowHeight, average.toFixed(1), { fontSize: 7, align: 'center' });
      summaryX += summaryColWidths[3];
      drawCell(summaryX, currentY, summaryColWidths[4], summaryRowHeight, 'DARAJA', { bold: true, fontSize: 7 });
      summaryX += summaryColWidths[4];
      drawCell(summaryX, currentY, summaryColWidths[5], summaryRowHeight, overallGrade, { fontSize: 7, align: 'center' });
      currentY += summaryRowHeight;
      
      summaryX = marginX;
      drawCell(summaryX, currentY, summaryColWidths[0], summaryRowHeight, 'DIVISION', { bold: true, fontSize: 7 });
      summaryX += summaryColWidths[0];
      drawCell(summaryX, currentY, summaryColWidths[1], summaryRowHeight, (division || '0').toString(), { fontSize: 7, align: 'center' });
      summaryX += summaryColWidths[1];
      drawCell(summaryX, currentY, summaryColWidths[2], summaryRowHeight, 'POINTI', { bold: true, fontSize: 7 });
      summaryX += summaryColWidths[2];
      drawCell(summaryX, currentY, summaryColWidths[3], summaryRowHeight, (divisionPoint || 0).toString(), { fontSize: 7, align: 'center' });
      summaryX += summaryColWidths[3];
      drawCell(summaryX, currentY, summaryColWidths[4], summaryRowHeight, 'NAFASI YA:', { bold: true, fontSize: 7 });
      summaryX += summaryColWidths[4];
      drawCell(summaryX, currentY, summaryColWidths[5], summaryRowHeight, overallRank.toString(), { fontSize: 7, align: 'center' });
      currentY += summaryRowHeight;
      
      summaryX = marginX + summaryColWidths[0] + summaryColWidths[1] + summaryColWidths[2] + summaryColWidths[3] + summaryColWidths[4];
      drawCell(summaryX, currentY, summaryColWidths[5], summaryRowHeight, `KATI YA WANAFUNZI ${allStudentsResult.rows.length}`, { fontSize: 7 });
      currentY += 20;
      
      // SECTION C: TABIA NA MWENENDO
      checkNewPage(80);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('C. TABIA NA MWENENDO', marginX, currentY);
      currentY += 12;
      
      // Normalize tabia column widths
      const tabiaColPercentages = [0.15, 0.65, 0.2];
      const tabiaColWidths = [];
      let tabiaTotalWidth = 0;
      tabiaColPercentages.forEach((percent, index) => {
        const width = index === tabiaColPercentages.length - 1
          ? contentWidth - tabiaTotalWidth
          : Math.floor(contentWidth * percent);
        tabiaColWidths.push(width);
        tabiaTotalWidth += width;
      });
      const tabiaRowHeight = 15;
      
      // Header
      let tabiaX = marginX;
      drawCell(tabiaX, currentY, tabiaColWidths[0], tabiaRowHeight, 'NAMBA', { bold: true, fontSize: 7, align: 'center' });
      tabiaX += tabiaColWidths[0];
      drawCell(tabiaX, currentY, tabiaColWidths[1], tabiaRowHeight, 'KIPENGELE', { bold: true, fontSize: 7 });
      tabiaX += tabiaColWidths[1];
      drawCell(tabiaX, currentY, tabiaColWidths[2], tabiaRowHeight, 'DARAJA', { bold: true, fontSize: 7, align: 'center' });
      currentY += tabiaRowHeight;
      
      // Tabia rows
      const tabiaCodes = ['901', '902', '903', '904', '905', '906', '907', '908', '909', '910', '911'];
      const tabiaNames = [
        'Kufanya kazi kwa bidii',
        'Ubora wa kazi',
        'Kuheshimu kazi',
        'Utunzaji wa mali ya shule / binafsi',
        'Ushirikiano na wenzake',
        'Heshima kwa wenzake / walimu / wafanyakazi',
        'Sifa za uongozi',
        'Kutii na kufuata maagizo',
        'Uaminifu',
        'Usafi binafsi',
        'Kushiriki katika Utamaduni / Michezo'
      ];
      
      tabiaCodes.forEach((code, index) => {
        checkNewPage(tabiaRowHeight + 5);
        const grade = getTabiaGrade(code);
        tabiaX = marginX;
        drawCell(tabiaX, currentY, tabiaColWidths[0], tabiaRowHeight, code, { fontSize: 7, align: 'center' });
        tabiaX += tabiaColWidths[0];
        drawCell(tabiaX, currentY, tabiaColWidths[1], tabiaRowHeight, tabiaNames[index], { fontSize: 7 });
        tabiaX += tabiaColWidths[1];
        drawCell(tabiaX, currentY, tabiaColWidths[2], tabiaRowHeight, grade, { fontSize: 7, align: 'center' });
        currentY += tabiaRowHeight;
      });
      
      currentY += 10;
      
      // SECTION D: MAONI KATIKA TAALUMA
      checkNewPage(50);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('D. MAONI KATIKA TAALUMA', marginX, currentY);
      currentY += 12;
      
      // Normalize maoni column widths
      const maoniColPercentages = [0.3, 0.7];
      const maoniColWidths = [];
      let maoniTotalWidth = 0;
      maoniColPercentages.forEach((percent, index) => {
        const width = index === maoniColPercentages.length - 1
          ? contentWidth - maoniTotalWidth
          : Math.floor(contentWidth * percent);
        maoniColWidths.push(width);
        maoniTotalWidth += width;
      });
      const maoniRowHeight = 15;
      
      let maoniX = marginX;
      drawCell(maoniX, currentY, maoniColWidths[0], maoniRowHeight, 'Mwalimu wa Taaluma:', { bold: true, fontSize: 7 });
      maoniX += maoniColWidths[0];
      const mwalimuComment = getCommentValue('mwalimu_taaluma') || '';
      drawCell(maoniX, currentY, maoniColWidths[1], maoniRowHeight, mwalimuComment, { fontSize: 7, align: 'right' });
      currentY += maoniRowHeight;
      
      maoniX = marginX;
      drawCell(maoniX, currentY, maoniColWidths[0], maoniRowHeight, 'Maoni ya Mkuu wa Shule:', { bold: true, fontSize: 7 });
      maoniX += maoniColWidths[0];
      const headComment = getCommentValue('mkuu_shule') || '';
      drawCell(maoniX, currentY, maoniColWidths[1], maoniRowHeight, headComment, { fontSize: 7, align: 'right' });
      currentY += maoniRowHeight;
      
      const authorityName = authorityResult.rows[0]?.name || 'Father Moses Assey';
      const authorityTitle = authorityResult.rows[0]?.title || 'Baba Gombera';
      const authorityDate = formatAuthorityDate();
      
      maoniX = marginX;
      drawCell(maoniX, currentY, maoniColWidths[0], maoniRowHeight, 'SAHIHI YA MKUU WA SHULE:', { bold: true, fontSize: 7 });
      maoniX += maoniColWidths[0];
      drawCell(maoniX, currentY, maoniColWidths[1] / 2, maoniRowHeight, authorityName, { fontSize: 7 });
      maoniX += maoniColWidths[1] / 2;
      drawCell(maoniX, currentY, maoniColWidths[1] / 2, maoniRowHeight, 'TAREHE:', { bold: true, fontSize: 7 });
      currentY += maoniRowHeight;
      
      maoniX = marginX + maoniColWidths[0] + maoniColWidths[1] / 2;
      drawCell(maoniX, currentY, maoniColWidths[1] / 2, maoniRowHeight, authorityDate, { fontSize: 7 });
      currentY += 15;
      
      // MAONI section
      checkNewPage(100);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('MAONI', marginX, currentY);
      currentY += 12;
      
      const maoniLabels = ['TAALUMA:', 'HUDUMA:', 'MICHEZO:', 'TABIA:', 'SALA:', 'FEDHA ANAYODAIWA:'];
      const maoniKeys = ['taaluma', 'huduma', 'michezo', 'tabia', 'sala', 'fees_debt'];
      
      maoniLabels.forEach((label, index) => {
        checkNewPage(maoniRowHeight + 5);
        maoniX = marginX;
        drawCell(maoniX, currentY, maoniColWidths[0], maoniRowHeight, label, { bold: true, fontSize: 7 });
        maoniX += maoniColWidths[0];
        let value = '';
        if (index === 5) {
          value = studentFeesDebt;
        } else {
          value = getCommentValue(maoniKeys[index]) || '';
        }
        drawCell(maoniX, currentY, maoniColWidths[1], maoniRowHeight, value, { fontSize: 7, align: 'right' });
        currentY += maoniRowHeight;
      });
      
      currentY += 10;
      
      // MAMBO YA KUFAHAMU
      checkNewPage(50);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('MAMBO YA KUFAHAMU', marginX, currentY);
      currentY += 12;
      
      const announcementKeys = Object.keys(classFeesAnnouncements).sort();
      if (announcementKeys.length > 0) {
        announcementKeys.forEach((key) => {
          checkNewPage(15);
          doc.fontSize(8).font('Helvetica');
          doc.text(classFeesAnnouncements[key] || '', marginX, currentY, { width: contentWidth });
          currentY += 15;
        });
      } else {
        doc.fontSize(8).font('Helvetica');
        doc.text('Hakuna matangazo ya ada yaliyowekwa kwa darasa hili.', marginX, currentY);
        currentY += 15;
      }
      
      currentY += 10;
      
      // SIGNATURE AND STAMP SECTION
      checkNewPage(80);
      const signatureColWidths = [contentWidth * 0.5, contentWidth * 0.5];
      let sigX = marginX;
      
      // Signature
      doc.fontSize(8).font('Helvetica');
      doc.text(authorityName, sigX, currentY);
      currentY += 10;
      doc.moveTo(sigX, currentY).lineTo(sigX + signatureColWidths[0] - 20, currentY).stroke();
      currentY += 5;
      doc.fontSize(7);
      doc.text(authorityTitle, sigX, currentY);
      currentY += 5;
      doc.text(`Tarehe ${authorityDate}`, sigX, currentY);
      
      // Stamp (right side)
      sigX = marginX + signatureColWidths[0];
      if (stampResult.rows[0]?.stamp_image_path) {
        try {
          const stampRelativePath = stampResult.rows[0].stamp_image_path;
          const stampPath = path.join(__dirname, '../static', stampRelativePath);
          if (await fileExists(stampPath)) {
            doc.image(stampPath, sigX, currentY - 30, { width: 60, height: 60 });
          }
        } catch (err) {
          console.error('Error loading stamp:', err);
        }
      }
      doc.fontSize(7).font('Helvetica');
      doc.text('Arusha Catholic Seminary official school stamp', sigX, currentY + 30, {
        width: signatureColWidths[1],
        align: 'center'
      });
      
      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}

async function generateBulkReportPDF(form, year, term, stream = null) {
  return new Promise(async (resolve, reject) => {
    try {
      let queryText = 'SELECT * FROM students WHERE level = $1 AND year = $2';
      const params = [form, year];
      if (stream) {
        queryText += ' AND stream = $3';
        params.push(stream);
      }
      queryText += ' ORDER BY stream, adm_no';
      
      const studentsResult = await query(queryText, params);
      const students = studentsResult.rows;
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      // Header
      doc.fontSize(18).text('BULK STUDENT REPORT', { align: 'center' });
      doc.fontSize(12).text(`${form} - ${year} - ${term}`, { align: 'center' });
      if (stream) {
        doc.text(`Stream: ${stream}`, { align: 'center' });
      }
      doc.moveDown();
      
      // Table
      const tableTop = doc.y;
      const colWidths = [80, 150, 100, 100];
      
      // Header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Adm No', 50, tableTop);
      doc.text('Name', 50 + colWidths[0], tableTop);
      doc.text('Stream', 50 + colWidths[0] + colWidths[1], tableTop);
      doc.text('Status', 50 + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
      
      // Rows
      let yPos = tableTop + 20;
      doc.font('Helvetica');
      students.forEach(student => {
        if (yPos > doc.page.height - 50) {
          doc.addPage();
          yPos = 50;
        }
        doc.text(student.adm_no, 50, yPos);
        doc.text(`${student.first_name} ${student.surname}`, 50 + colWidths[0], yPos);
        doc.text(student.stream, 50 + colWidths[0] + colWidths[1], yPos);
        doc.text(student.status, 50 + colWidths[0] + colWidths[1] + colWidths[2], yPos);
        yPos += 15;
      });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generatePhotoEntryFormPDF(level, stream, year, month = null, term = null) {
  return new Promise(async (resolve, reject) => {
    try {
      // Normalize stream for FORM I-IV: NA -> A
      const { normalizeStream } = require('../utils/streamNormalizer');
      const normalizedStream = normalizeStream(stream);

      // For FORM I-IV, check both stream 'A' and 'NA' (students may have either)
      const isFormIV = level && /^FORM\s+(I|II|III|IV)$/.test(level);

      let studentsQuery = `SELECT * FROM students
         WHERE level = $1`;
      const studentsParams = [level];
      let paramCount = 2;

      if (isFormIV && (normalizedStream === 'A' || stream === 'NA')) {
        // Check both 'A' and 'NA' for FORM I-IV
        studentsQuery += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        studentsParams.push('A', 'NA');
        paramCount += 2;
      } else {
        studentsQuery += ` AND stream = $${paramCount}`;
        studentsParams.push(normalizedStream);
        paramCount++;
      }

      studentsQuery += ` AND year = $${paramCount}`;
      studentsParams.push(parseInt(year));
      paramCount++;

      // Add term filtering for Form V/VI
      if (term && term.trim()) {
        studentsQuery += ` AND term = $${paramCount}`;
        studentsParams.push(term.trim());
        paramCount++;
      }

      studentsQuery += ` ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`;
      
      // Get all students for the class, sorted by name: first_name, then middle_name, then surname
      const studentsResult = await query(studentsQuery, studentsParams);
      
      if (studentsResult.rows.length === 0) {
        throw new Error('No students found for this class');
      }
      
      // Get all photos for the class
      // For FORM I-IV, check both stream 'A' and 'NA'
      let photosQuery = `SELECT * FROM student_photos
         WHERE level = $1`;
      const photosParams = [level];
      paramCount = 2;

      if (isFormIV && (normalizedStream === 'A' || stream === 'NA')) {
        // Check both 'A' and 'NA' for FORM I-IV
        photosQuery += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        photosParams.push('A', 'NA');
        paramCount += 2;
      } else {
        photosQuery += ` AND stream = $${paramCount}`;
        photosParams.push(normalizedStream);
        paramCount++;
      }

      photosQuery += ` AND year = $${paramCount}`;
      photosParams.push(parseInt(year));
      // Note: Not filtering photos by term because student_index is position-based
      // and changes when students are filtered. Students are already filtered by term.
      
      const photosResult = await query(photosQuery, photosParams);

      // Create photo lookup map: adm_no -> photo_filename
      // Use adm_no instead of student_index for reliable matching
      const photoMap = {};
      photosResult.rows.forEach(photo => {
        if (photo.adm_no) {
          photoMap[photo.adm_no] = photo.photo_filename;
        }
      });
      
      // Get school logo if available
      const logoResult = await query('SELECT * FROM school_logo WHERE id = 1');
      
      // Create PDF document with A4 size
      const doc = new PDFDocument({ 
        margin: 30, 
        size: 'A4',
        layout: 'portrait'
      });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      
      // Set default font
      doc.font('Helvetica');
      
      // Header Section - ARUSHA CATHOLIC SEMINARY
      const headerY = 30;
      doc.fontSize(20).font('Helvetica-Bold').text('ARUSHA CATHOLIC SEMINARY', { align: 'center', y: headerY });
      
      // School logo (if available) - positioned at top right
      if (logoResult.rows[0] && logoResult.rows[0].logo_image_path) {
        try {
          const logoPath = logoResult.rows[0].logo_image_path;
          
          // Check if it's a URL (Cloudinary) or local file
          if (logoPath.startsWith('http')) {
            // For Cloudinary URLs, we need to fetch the image and convert to buffer
            try {
              const axios = require('axios');
              const response = await axios.get(logoPath, { 
                responseType: 'arraybuffer',
                timeout: 10000 
              });
              const imageBuffer = Buffer.from(response.data);
              doc.image(imageBuffer, doc.page.width - 100, headerY, { width: 60, height: 60 });
            } catch (fetchError) {
              console.error('Error fetching logo from URL:', fetchError.message);
            }
          } else {
            // Local file path
            if (await fileExists(logoPath)) {
              doc.image(logoPath, doc.page.width - 100, headerY, { width: 60, height: 60 });
            }
          }
        } catch (err) {
          console.error('Error loading logo:', err);
        }
      }
      
      // Title - PHOTO ENTRY FORM
      doc.fontSize(18).font('Helvetica-Bold').text('PHOTO ENTRY FORM', { align: 'center', y: headerY + 40 });
      
      // Class, Month, Year information
      const currentMonth = month || new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();
      // Keep CLASS/MONTH/YEAR in one row to match the printable template.
      const classMonthYearLine = `CLASS: ${level} ${stream}    MONTH: ${currentMonth}    YEAR: ${year}`;
      doc
        .fontSize(12)
        .font('Helvetica')
        .text(classMonthYearLine, {
          align: 'left',
          y: headerY + 80,
          // Provide a width so it can wrap naturally if the text is too long.
          width: doc.page.width - 60,
        });
      
      // Draw a line separator
      doc.moveTo(30, headerY + 140).lineTo(doc.page.width - 30, headerY + 140).stroke();
      
      // Grid layout: 4 photos per row
      const gridStartY = headerY + 160;
      const photosPerRow = 4;
      const pageWidth = doc.page.width - 60; // Total usable width (30px margin on each side)
      const cellWidth = pageWidth / photosPerRow;
      // Photos are stored as 132x185 portrait; using a square (50x50) box scales them down too much.
      // Render them in a portrait bounding box instead.
      const photoWidth = Math.max(55, Math.floor(cellWidth * 0.5)); // keep some minimum
      const photoHeight = Math.floor((photoWidth * 185) / 132); // preserve 132x185 aspect ratio
      const cellHeight = photoHeight + 70; // Height for photo + text below + signature line
      const photoMargin = 5; // Margin around photo in cell
      
      let currentY = gridStartY;
      let currentX = 30; // Start from left margin
      
      // Helper function to draw a student card
      const drawStudentCard = async (student, index, x, y) => {
        // Get photo filename by adm_no
        const photoFilename = photoMap[student.adm_no];
        
        // Draw cell border
        doc.rect(x, y, cellWidth, cellHeight).stroke();
        
        // Photo area (centered in cell)
        const photoX = x + (cellWidth - photoWidth) / 2;
        const photoY = y + photoMargin;
        
        // Draw photo placeholder border
        doc.rect(photoX, photoY, photoWidth, photoHeight).stroke();
        
        if (photoFilename) {
          try {
            const photoPath = path.join(__dirname, '../static/uploads/photos', photoFilename);
            if (await fileExists(photoPath)) {
              // Read file as buffer and validate format
              const imageBuffer = await fs.readFile(photoPath);
              
              // Validate buffer is not empty
              if (!imageBuffer || imageBuffer.length === 0) {
                throw new Error('Image file is empty');
              }
              
              // Detect image format from magic bytes to validate
              const isJPEG = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 && imageBuffer[2] === 0xFF;
              const isPNG = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47;
              const isGIF = imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46;
              const isWebP = imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46 && 
                             imageBuffer[8] === 0x57 && imageBuffer[9] === 0x45 && imageBuffer[10] === 0x42 && imageBuffer[11] === 0x50;
              
              let finalImageBuffer = imageBuffer;
              
              // Convert WebP to JPEG if needed (PDFKit doesn't support WebP)
              if (isWebP) {
                try {
                  // Convert WebP to JPEG using Sharp
                  finalImageBuffer = await sharp(imageBuffer)
                    .jpeg({ quality: 90 })
                    .toBuffer();
                } catch (convertError) {
                  console.error('Error converting WebP to JPEG:', convertError);
                  throw new Error('Failed to convert WebP image to JPEG format');
                }
              } else if (isJPEG || isPNG || isGIF) {
                // Already in supported format, use as-is
                finalImageBuffer = imageBuffer;
              } else {
                // Unknown format - try file path as fallback (PDFKit might handle it)
                const ext = path.extname(photoFilename).toLowerCase();
                if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
                  // Try using file path - PDFKit will attempt to read and detect format
                doc.image(photoPath, photoX, photoY, { 
                    fit: [photoWidth, photoHeight]
                  });
                  return; // Exit early if using file path
                } else {
                  throw new Error(`Unsupported image format: ${ext || 'unknown'}. Only JPEG, PNG, GIF, and WebP are supported.`);
                }
              }
              
              // Use the (possibly converted) buffer with PDFKit
              doc.image(finalImageBuffer, photoX, photoY, { 
                fit: [photoWidth, photoHeight]
              });
            } else {
              // Placeholder if photo not found
              doc.fontSize(7).text('No Photo', photoX + 5, photoY + photoHeight / 2 - 3, {
                width: photoWidth - 10,
                align: 'center'
              });
            }
          } catch (err) {
            console.error('Error loading photo:', err);
            console.error('Photo filename:', photoFilename);
            console.error('Photo path:', path.join(__dirname, '../static/uploads/photos', photoFilename));
            // Show placeholder instead of error text
            doc.fontSize(7).text('No Photo', photoX + 5, photoY + photoHeight / 2 - 3, {
              width: photoWidth - 10,
              align: 'center'
            });
          }
        } else {
          // Placeholder if no photo
          doc.fontSize(7).text('No Photo', photoX + 5, photoY + photoHeight / 2 - 3, {
            width: photoWidth - 10,
            align: 'center'
          });
        }
        
        // Serial number (top left corner)
        doc.fontSize(8).font('Helvetica-Bold').text((index + 1).toString(), x + 3, y + 3);
        
        // Admission number (below photo, centered)
        const textY = photoY + photoHeight + 5;
        doc.fontSize(8).font('Helvetica-Bold');
        const admNoText = student.adm_no || '';
        doc.text(admNoText, x + 3, textY, { width: cellWidth - 6, align: 'center' });
        
        // Full name (below admission number)
        const fullName = `${student.first_name || ''} ${student.middle_name || ''} ${student.surname || ''}`.trim();
        doc.fontSize(7).font('Helvetica');
        const nameY = textY + 10;
        // Split name if too long - check width
        const maxNameWidth = cellWidth - 6;
        const nameWidth = doc.widthOfString(fullName);
        
        if (nameWidth > maxNameWidth) {
          // Try to fit name in two lines
          const words = fullName.split(' ');
          let line1 = '';
          let line2 = '';
          for (const word of words) {
            const testLine = line1 ? `${line1} ${word}` : word;
            if (doc.widthOfString(testLine) <= maxNameWidth) {
              line1 = testLine;
            } else {
              line2 = line2 ? `${line2} ${word}` : word;
            }
          }
          doc.text(line1 || fullName.substring(0, 25), x + 3, nameY, { width: cellWidth - 6, align: 'center' });
          if (line2) {
            doc.text(line2, x + 3, nameY + 8, { width: cellWidth - 6, align: 'center' });
          }
        } else {
          doc.text(fullName, x + 3, nameY, { width: cellWidth - 6, align: 'center' });
        }
        
        // Sex (below name)
        const sexY = nameY + (nameWidth > maxNameWidth ? 18 : 10);
        doc.fontSize(7);
        doc.text(student.sex || '', x + 3, sexY, { width: cellWidth - 6, align: 'center' });
        
        // Signature line (bottom of cell)
        const signatureY = sexY + 10;
        doc.moveTo(x + 5, signatureY).lineTo(x + cellWidth - 5, signatureY).stroke();
        doc.fontSize(6).font('Helvetica-Oblique');
        doc.text('Signature', x + 3, signatureY + 2, { width: cellWidth - 6, align: 'center' });
      };
      
      // Draw students in grid format (4 per row)
      for (let i = 0; i < studentsResult.rows.length; i++) {
        const student = studentsResult.rows[i];
        const colIndex = i % photosPerRow;
        
        // Check if we need a new page
        if (currentY + cellHeight > doc.page.height - 50) {
          doc.addPage();
          currentY = 50;
          
          // Redraw header on new page
          doc.fontSize(20).font('Helvetica-Bold').text('ARUSHA CATHOLIC SEMINARY', { align: 'center', y: 30 });
          doc.fontSize(18).font('Helvetica-Bold').text('PHOTO ENTRY FORM', { align: 'center', y: 70 });
          doc.fontSize(12).font('Helvetica').text(`CLASS: ${level} ${stream}`, { align: 'left', y: 110 });
          doc.text(`MONTH: ${currentMonth}`, { align: 'left', y: 130 });
          doc.text(`YEAR: ${year}`, { align: 'left', y: 150 });
          doc.moveTo(30, 170).lineTo(doc.page.width - 30, 170).stroke();
          
          currentY = 180;
        }
        
        // Calculate X position for this column
        currentX = 30 + (colIndex * cellWidth);
        
        // Draw student card (await async function)
        await drawStudentCard(student, i, currentX, currentY);
        
        // Move to next row if we've filled 4 columns
        if ((i + 1) % photosPerRow === 0) {
          currentY += cellHeight;
          currentX = 30; // Reset to first column
        }
      }
      
      // Footer
      const footerY = doc.page.height - 30;
      doc.fontSize(8).font('Helvetica');
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 30, footerY, { align: 'left' });
      doc.text(`Total Students: ${studentsResult.rows.length}`, doc.page.width - 30, footerY, { align: 'right' });
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Monthly Results PDF using Puppeteer
 * Generates PDF directly from database data (no frontend scraping)
 */
async function generateMonthlyResultsPDF(level, stream, year, month) {
  const puppeteer = require('puppeteer');
  const { calculateGrade, getSwahiliRemarks } = require('./calculations');
  const bwipjs = require('bwip-js');
  let browser = null;
  
  try {
    // Normalize parameters
    const normalizedLevel = decodeURIComponent(String(level).replace(/\+/g, ' ')).trim().toUpperCase();
    const normalizedStream = normalizeStream(stream);
    const normalizedMonth = decodeURIComponent(String(month).replace(/\+/g, ' ')).trim();
    const normalizedYear = parseInt(year);
    
    console.log('Generating PDF for:', { level: normalizedLevel, stream: normalizedStream, year: normalizedYear, month: normalizedMonth });
    
    // Fetch all data from database
    // Check if this is FORM I-IV (which may have students with stream 'A' or 'NA')
    const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(normalizedLevel);
    
    // Get students
    // For FORM I-IV, check both 'A' and 'NA' streams since students may have either
    // For combined mode, stream=ALL includes all streams for this level/year
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
      throw new Error('No students found for this class');
    }
    
    // Get subjects
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
    
    // Get scores
    const scoresResult = normalizedStream === 'ALL'
      ? await query(
        `SELECT adm_no, subject_code, score
         FROM individual_scores
         WHERE level = $1 AND year = $2 AND month = $3`,
        [normalizedLevel, normalizedYear, normalizedMonth]
      )
      : await query(
        `SELECT adm_no, subject_code, score 
         FROM individual_scores 
         WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
        [normalizedLevel, normalizedStream, 'NA', normalizedYear, normalizedMonth]
      );
    
    // Get monthly results (for totals, averages, grades, positions, remarks)
    // For FORM I-IV, check both 'A' and 'NA' streams since results may be stored with either
    let monthlyResultsResult;
    if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
      monthlyResultsResult = await query(
        `SELECT student_index, total_marks, average, grade, position, remarks 
         FROM monthly_results 
         WHERE level = $1 AND stream IN ($2, $3) AND year = $4 AND month = $5`,
        [normalizedLevel, 'A', 'NA', normalizedYear, normalizedMonth]
      );
    } else {
      monthlyResultsResult = await query(
        `SELECT student_index, total_marks, average, grade, position, remarks 
         FROM monthly_results 
         WHERE level = $1 AND stream = $2 AND year = $3 AND month = $4`,
        [normalizedLevel, normalizedStream, normalizedYear, normalizedMonth]
      );
    }
    
    // Build lookup maps
    const monthlyResultsMap = {};
    monthlyResultsResult.rows.forEach(row => {
      monthlyResultsMap[row.student_index] = row;
    });
    
    const scoreLookup = {};
    scoresResult.rows.forEach(row => {
      if (!scoreLookup[row.adm_no]) {
        scoreLookup[row.adm_no] = {};
      }
      scoreLookup[row.adm_no][row.subject_code] = parseFloat(row.score);
    });
    
    // Get school logo
    let leftLogoBase64 = null;
    let rightLogoBase64 = null;
    try {
      const logoResult = await query('SELECT logo_image_path FROM school_logo WHERE id = 1');
      if (logoResult.rows.length > 0 && logoResult.rows[0].logo_image_path) {
        const logoPath = logoResult.rows[0].logo_image_path;
        
        try {
          let logoBuffer;
          let logoExtension;
          
          // Check if it's a URL (Cloudinary) or local file
          if (logoPath.startsWith('http')) {
            // For Cloudinary URLs, fetch the image
            const axios = require('axios');
            const response = await axios.get(logoPath, { 
              responseType: 'arraybuffer',
              timeout: 10000 
            });
            logoBuffer = Buffer.from(response.data);
            
            // Extract extension from URL or default to jpg
            const urlPath = new URL(logoPath).pathname;
            logoExtension = path.extname(urlPath).toLowerCase().substring(1) || 'jpg';
            console.log(`Logo fetched from URL: ${logoPath}`);
          } else {
            // Local file path
            const fullLogoPath = path.join(__dirname, '../static', logoPath);
            logoBuffer = await fs.readFile(fullLogoPath);
            logoExtension = path.extname(logoPath).toLowerCase().substring(1);
            console.log(`Logo loaded from file: ${logoPath}`);
          }
          
          // Convert to base64
          const logoBase64 = logoBuffer.toString('base64');
          const mimeType = logoExtension === 'png' ? 'image/png' : 
                          logoExtension === 'jpg' || logoExtension === 'jpeg' ? 'image/jpeg' : 
                          logoExtension === 'webp' ? 'image/webp' : 'image/jpeg';
          
          leftLogoBase64 = `data:${mimeType};base64,${logoBase64}`;
          rightLogoBase64 = `data:${mimeType};base64,${logoBase64}`; // Use same logo for both sides
        } catch (logoError) {
          console.warn('Could not load logo:', logoError.message);
        }
      }
    } catch (logoQueryError) {
      console.warn('Could not fetch logo from database:', logoQueryError.message);
    }
    
    // Get school info
    const schoolName = 'ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU';
    const schoolFullName = 'CATHOLIC ARCHDIOCESE OF ARUSHA';
    const contactInfo = 'P.O BOX 3102 Arusha, Tanzania\n+255 754 92 60 22 / +255 765 394 802\nEmail: arucase@gmail.com';
    
    // Determine test type based on month and form level (same logic as frontend)
    const isALevel = normalizedLevel.includes('FORM V') || normalizedLevel.includes('FORM VI');
    const getTestType = (month, level) => {
      const testTypes = {
        'February': 'MONTHLY',
        'March': 'MIDTERM',
        'April': 'MONTHLY',
        'May': isALevel ? 'ANNUAL' : 'TERMINAL',
        'June': 'MONTHLY',
        'July': 'MONTHLY',
        'August': 'MONTHLY',
        'September': 'MIDTERM',
        'October': 'MONTHLY',
        'November': isALevel ? 'TERMINAL' : 'ANNUAL',
        'December': 'MONTHLY',
        'January': 'MONTHLY'
      };
      return testTypes[month] || 'MONTHLY';
    };
    const testTypeRaw = getTestType(normalizedMonth, normalizedLevel);
    // Format: MIDTERM -> MIDTERM RESULTS (no "TEST" in output)
    const testType = testTypeRaw + ' RESULTS';
    
    // Helper function to escape HTML
    const escapeHtml = (text) => {
      if (text === null || text === undefined) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Barcode text should standardize on PDF generation date.
    // Using YYYY-MM-DD makes it deterministic per generation day.
    const generationDateISO = new Date().toISOString().slice(0, 10);
    const barcodeText = `RESULTS-${generationDateISO}`;
    let barcodeSvg = '';
    try {
      // Use Code128 so we can encode the standardized date string.
      barcodeSvg = bwipjs.toSVG({
        bcid: 'code128',
        text: barcodeText,
        scale: 3,
        height: 22,
        includetext: false,
        padding: 0,
        rotate: 'N'
      });
    } catch (e) {
      console.warn('Failed to generate barcode SVG:', e.message);
      barcodeSvg = '';
    }

    // Single horizontal barcode to print after the last student row.
    const barcodeBottomHtml = barcodeSvg
      ? `<div class="barcode-bottom" aria-label="Results generation barcode">${barcodeSvg}</div>`
      : '';

    // Build HTML
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 20mm 10mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      height: 100%;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12px;
      background: white;
      display: flex;
      flex-direction: column;
    }
    .report-header-section {
      background: linear-gradient(135deg, #87ceeb 0%, #b0e0e6 100%);
      padding: 15px;
      margin-bottom: 5px;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      padding-bottom: 20px;
      position: relative;
    }
    .logo-section, .logo-section-right {
      flex: 0 0 100px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 0;
      margin-top: 0;
    }
    .school-logo, .school-logo-right {
      width: 80px;
      height: auto;
      display: block;
      vertical-align: top;
    }
    .school-logo-placeholder {
      width: 80px;
      height: 80px;
      border: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      font-size: 1.5rem;
      color: #6b7280;
      vertical-align: top;
    }
    .school-info {
      flex: 1;
      text-align: center;
    }
    .school-info h1 {
      font-size: 24px;
      font-weight: bold;
      margin: 0;
      color: #000000;
    }
    .school-info h2 {
      font-size: 20px;
      font-weight: bold;
      margin: 5px 0;
      color: #000000;
    }
    .contact-info {
      text-align: center;
      font-size: 14px;
      margin-top: 5px;
    }
    .test-info-bar {
      background-color: #87ceeb;
      color: #000000;
      text-align: center;
      padding: 10px;
      font-size: 16px;
      font-weight: bold;
      margin-top: 5px;
    }
    .compact-results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 5px;
    }
    .compact-results-table th,
    .compact-results-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: center;
      vertical-align: middle;
      page-break-inside: avoid;
    }
    .compact-results-table th {
      background-color: #e5e7eb;
      font-weight: bold;
    }
    .compact-results-table tbody tr {
      page-break-inside: avoid;
    }
    .compact-results-table thead {
      display: table-header-group;
    }
    /* Ensure header repeats on each page automatically */
    .compact-results-table thead tr {
      page-break-after: avoid;
    }
    .text-left {
      text-align: left !important;
      padding-left: 6px !important;
    }
    .grade-row-A { background: linear-gradient(90deg, #166534 0%, #22c55e 100%) !important; color: white !important; }
    .grade-row-B { background: #86efac !important; color: #14532d !important; }
    .a-level.grade-row-B { background: #22c55e !important; color: white !important; }
    .grade-row-C { background: #fef9c3 !important; color: #713f12 !important; }
    .a-level.grade-row-C { background: #86efac !important; color: #14532d !important; }
    .grade-row-C-low { background: #fecaca !important; color: #7f1d1d !important; }
    .grade-row-D, .grade-row-E, .grade-row-S, .grade-row-F { background: #fecaca !important; color: #7f1d1d !important; }
    .a-level.grade-row-D { background: #fef9c3 !important; color: #713f12 !important; }

    /* Horizontal barcode printed after the results table */
    .barcode-bottom {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: auto; /* push to bottom of page */
      padding-bottom: 4mm;
      page-break-inside: avoid;
    }
    .barcode-bottom svg {
      height: 18mm;
      width: auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="report-header-section">
    <div class="report-header">
      <div class="logo-section">
        ${leftLogoBase64 
          ? `<img src="${leftLogoBase64}" alt="School Logo" class="school-logo" />`
          : `<div class="school-logo-placeholder">🏫</div>`
        }
      </div>
      <div class="school-info">
        <h1>${escapeHtml(schoolFullName)}</h1>
        <h2>${escapeHtml(schoolName)}</h2>
        <div class="contact-info">${escapeHtml(contactInfo).replace(/\n/g, '<br>')}</div>
      </div>
      <div class="logo-section-right">
        ${rightLogoBase64 
          ? `<img src="${rightLogoBase64}" alt="School Logo" class="school-logo-right" />`
          : `<div class="school-logo-placeholder">🏫</div>`
        }
      </div>
    </div>
  </div>
  <div class="test-info-bar">
    ${normalizedLevel} ${testType} ${normalizedMonth.toUpperCase()} ${normalizedYear}
  </div>
  <table class="compact-results-table">
    <thead>
      <tr>
        <th>S/N</th>
        <th class="text-left">F.Name</th>
        <th class="text-left">M.Name</th>
        <th class="text-left">Surname</th>`;

    const formatALevelSubjectHeader = (label) => {
      const s = String(label || '').trim();
      if (!s) return s;

      // Database may store A-level advanced subjects with prefixes like "A/BIO"
      // but printed results expect: BIO, CHE, ACOM, DIV, HTM, MAT, PHY.
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
    };

    // Add subject columns
    subjectsResult.rows.forEach(subject => {
      const rawAbbrev = subject.subject_abbreviation || subject.subject_code;
      const abbrev = isALevel ? formatALevelSubjectHeader(rawAbbrev) : rawAbbrev;
      html += `<th>${escapeHtml(abbrev)}</th>`;
    });
    // Always show COM column between POS and REMARKS.
    // O-Level uses Sc/Ss/Ui; A-Level uses combination shortforms like PCM/HGE/HGL.
    const shouldShowCom = true;

    html += `
        <th>TOT</th>
        <th>AVR</th>
        <th>GRD</th>
        <th>POS</th>
        ${shouldShowCom ? '<th>COM</th>' : ''}
        <th class="text-left">REMARKS</th>
      </tr>
    </thead>
    <tbody>`;
    
    // Sort students: by position if results exist, otherwise alphabetically
    const studentsWithResults = studentsResult.rows.map((student, idx) => {
      const studentIndex = idx.toString();
      return {
        ...student,
        studentIndex,
        result: monthlyResultsMap[studentIndex] || {}
      };
    });
    
    studentsWithResults.sort((a, b) => {
      const resultA = a.result;
      const resultB = b.result;

      // Sort by AVR (average) desc only.
      const avgA = resultA?.average !== null && resultA?.average !== undefined ? Number(resultA.average) : null;
      const avgB = resultB?.average !== null && resultB?.average !== undefined ? Number(resultB.average) : null;

      const aHasAvg = avgA !== null && Number.isFinite(avgA);
      const bHasAvg = avgB !== null && Number.isFinite(avgB);
      if (aHasAvg && bHasAvg && avgA !== avgB) return avgB - avgA;
      if (aHasAvg && !bHasAvg) return -1;
      if (!aHasAvg && bHasAvg) return 1;

      // If AVR ties, rank by TOT desc so POS is chronological.
      if (aHasAvg && bHasAvg && avgA === avgB) {
        const totA = resultA?.total_marks !== null && resultA?.total_marks !== undefined ? Number(resultA.total_marks) : null;
        const totB = resultB?.total_marks !== null && resultB?.total_marks !== undefined ? Number(resultB.total_marks) : null;
        const aHasTot = totA !== null && Number.isFinite(totA);
        const bHasTot = totB !== null && Number.isFinite(totB);
        if (aHasTot && bHasTot && totA !== totB) return totB - totA;
      }

      // If averages missing, sort alphabetically
      if (a.first_name !== b.first_name) return a.first_name.localeCompare(b.first_name);
      if ((a.middle_name || '') !== (b.middle_name || '')) return (a.middle_name || '').localeCompare(b.middle_name || '');
      return a.surname.localeCompare(b.surname);
    });

    // Add student rows
    studentsWithResults.forEach((student, index) => {
      const monthlyResult = student.result;
      const studentScores = scoreLookup[student.adm_no] || {};
      const grade = monthlyResult.grade || '';
      const avgValue = monthlyResult.average ? parseFloat(monthlyResult.average) : null;

      const formatComDisplay = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '-';
        const code = raw.toLowerCase();
        if (code === 'sc') return 'Science';
        if (code === 'ss') return 'Art';
        if (code === 'ui') return 'Under investigation';
        // A-Level: store combination shortform like PCM/HGE/HGL
        return raw.toUpperCase();
      };

      // Format numbers consistently (remove trailing ".00")
      const formatScore = (value) => {
        if (value === undefined || value === null || value === '') return '-';
        const num = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(num)) return String(value);
        if (Math.abs(num - Math.round(num)) < 1e-9) return String(Math.round(num));
        return String(num)
          .replace(/(\.\d*?[1-9])0+$/, '$1')
          .replace(/\.0+$/, '');
      };
      
      // Grade C-low only applies to O-Level when average < 55
      let gradeClass = '';
      if (grade) {
        if (grade === 'C' && avgValue !== null && avgValue < 55 && !isALevel) {
          gradeClass = 'grade-row-C-low';
        } else {
          gradeClass = `grade-row-${grade}${isALevel ? ' a-level' : ''}`;
        }
      }
      
      // Automatic pagination - no manual page breaks needed
      html += `<tr class="${gradeClass}">
        <td>${index + 1}</td>
        <td class="text-left">${escapeHtml(student.first_name || '')}</td>
        <td class="text-left">${escapeHtml(student.middle_name || '-')}</td>
        <td class="text-left">${escapeHtml(student.surname || '')}</td>`;
      
      // Add subject scores (try both abbreviation and code)
      subjectsResult.rows.forEach(subject => {
        const subjectKey = subject.subject_abbreviation || subject.subject_code;
        const score = studentScores[subjectKey] || studentScores[subject.subject_code];
        const scoreDisplay = formatScore(score);
        html += `<td>${escapeHtml(scoreDisplay)}</td>`;
      });
      
      const totalMarks = formatScore(monthlyResult.total_marks);
      
      const average = monthlyResult.average !== null && monthlyResult.average !== undefined 
        ? Math.round(monthlyResult.average)
        : '-';
      
      html += `
        <td>${escapeHtml(String(totalMarks))}</td>
        <td>${escapeHtml(String(average))}</td>
        <td>${escapeHtml(grade || '-')}</td>
        <td>${escapeHtml(String(monthlyResult.position || '-'))}</td>
        ${shouldShowCom
          ? `<td>${escapeHtml(formatComDisplay(isALevel ? (student.com || student.stream) : student.com))}</td>`
          : ''}
        <td class="text-left">${escapeHtml(monthlyResult.remarks || '-')}</td>
      </tr>`;
    });
    
    html += `
    </tbody>
  </table>
  ${barcodeBottomHtml || ''}
</body>
</html>`;
    
    // Log HTML length for debugging
    console.log(`Generated HTML length: ${html.length} characters`);
    console.log(`Number of students: ${studentsWithResults.length}`);
    console.log(`Number of subjects: ${subjectsResult.rows.length}`);
    
    // Validate HTML structure (basic check)
    if (!html.includes('</html>') || !html.includes('</body>') || !html.includes('</table>')) {
      console.warn('HTML structure may be incomplete');
    }
    
    // Launch browser and generate PDF
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set content directly (no navigation needed)
    try {
      await page.setContent(html, { 
        waitUntil: 'load',
        timeout: 30000
      });
      console.log('Page content set successfully');
    } catch (contentError) {
      console.error('Error setting page content:', contentError);
      // Try with a simpler wait condition
      try {
        await page.setContent(html, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        console.log('Page content set with domcontentloaded');
      } catch (retryError) {
        console.error('Failed to set page content even with domcontentloaded:', retryError);
        throw new Error('Failed to load HTML content: ' + retryError.message);
      }
    }
    
    // Wait for table to be rendered
    try {
      await page.waitForSelector('.compact-results-table', { timeout: 10000 });
    } catch (selectorError) {
      console.warn('Table selector not found, continuing anyway:', selectorError.message);
    }
    
    // Wait a bit for rendering (using Promise-based setTimeout instead of deprecated waitForTimeout)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate PDF
    console.log('Generating PDF from HTML...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '20mm',
        left: '10mm'
      },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false
    });
    
    console.log('PDF generated, buffer type:', typeof pdfBuffer, 'is Buffer:', Buffer.isBuffer(pdfBuffer), 'length:', pdfBuffer?.length);
    
    await browser.close();
    browser = null;
    
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
    } else if (typeof pdfBuffer === 'string') {
      buffer = Buffer.from(pdfBuffer, 'binary');
    } else {
      buffer = Buffer.from(pdfBuffer);
    }
    
    if (buffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    // Check if it's a valid PDF (starts with %PDF)
    const firstBytes = buffer.slice(0, 4);
    if (firstBytes[0] !== 0x25 || firstBytes[1] !== 0x50 || firstBytes[2] !== 0x44 || firstBytes[3] !== 0x46) {
      console.error('PDF buffer first 20 bytes (hex):', buffer.slice(0, 20).toString('hex'));
      console.error('PDF buffer first 20 bytes (ascii):', buffer.slice(0, 20).toString('ascii'));
      throw new Error(`Generated PDF buffer is not a valid PDF file. First bytes: ${firstBytes.toString('hex')}`);
    }
    
    console.log(`PDF generated successfully: ${buffer.length} bytes`);
    console.log('PDF first bytes:', buffer.slice(0, 10).toString('hex'));
    
    return buffer;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Error generating monthly results PDF:', error);
    throw error;
  }
}

module.exports = {
  generateIndividualReportPDF,
  generateBulkReportPDF,
  generatePhotoEntryFormPDF,
  generateMonthlyResultsPDF
};

