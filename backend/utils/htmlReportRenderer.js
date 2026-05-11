/**
 * HTML Report Renderer
 * Generates HTML for the individual report that Puppeteer can render to PDF
 */
const fs = require('fs').promises;
const path = require('path');

/**
 * Read CSS file content
 */
async function getCSSContent() {
  try {
    const cssPath = path.join(__dirname, '../../frontend/src/pages/reports/IndividualReportDetail.css');
    return await fs.readFile(cssPath, 'utf-8');
  } catch (e) {
    console.log('Could not read CSS file, using minimal styles');
    return `
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
      .report-container { max-width: 194mm; margin: 0 auto; padding: 3px; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
      th, td { border: 1px solid #000; padding: 4px 5px; font-size: 10px; }
      th { background: #fff; font-weight: bold; }
    `;
  }
}

/**
 * Generate HTML for individual report
 * @param {Object} reportData - Report data from API
 * @param {string} apiUrl - Base API URL for image paths (optional)
 * @returns {string} HTML string
 */
async function generateReportHTML(reportData, apiUrl = 'http://localhost:5000') {
  const {
    student,
    subjects,
    monthly_results,
    comments,
    tabia_mwenendo,
    subject_rankings,
    subject_teacher_signatures,
    overall_rank,
    total_students,
    marks_config,
    months: reportMonths,
    summary_data,
    student_parish,
    student_fees_debt,
    class_fees_announcements,
    school_logo,
    school_stamp,
    authority_data,
    form,
    term,
    year
  } = reportData;
  
  // Helper function to get full image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // In production, use the Railway backend URL for static assets
    if (process.env.NODE_ENV === 'production') {
      const productionBackendUrl = process.env.RAILWAY_PUBLIC_URL || 'https://arucase-production.up.railway.app';
      const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
      return `${productionBackendUrl}/static/${cleanPath}`;
    }
    
    // Development: use local API URL
    const baseUrl = apiUrl.replace('/api', '');
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${baseUrl}/static/${cleanPath}`;
  };

  const formCode = form.replace('FORM ', '').trim();
  const isForm5Or6 = ['V', 'VI', '5', '6'].includes(formCode);
  // Form V/VI: Academic year July-June. Term I (Jul-Dec): Aug-Nov, Term II (Jan-Jun): Feb-May
  // Form I-IV: Term I: Feb-May, Term II: Aug-Nov
  const getDefaultMonths = () => {
    if (isForm5Or6) {
      return (term === 'Term I' || term === 'Term 1')
        ? ['August', 'September', 'October', 'November']
        : ['February', 'March', 'April', 'May'];
    } else {
      return (term === 'Term I' || term === 'Term 1')
        ? ['February', 'March', 'April', 'May']
        : ['August', 'September', 'October', 'November'];
    }
  };
  const months = reportMonths || getDefaultMonths();

  // Process monthly results
  const monthlyData = {};
  monthly_results?.forEach((result) => {
    if (!monthlyData[result.subject_code]) {
      monthlyData[result.subject_code] = {};
    }
    monthlyData[result.subject_code][result.month] = result.score || 0;
  });

  // Helper functions
  const getGrade = (total) => {
    if (isForm5Or6) {
      if (total >= 85) return 'A';
      if (total >= 75) return 'B';
      if (total >= 65) return 'C';
      if (total >= 55) return 'D';
      if (total >= 45) return 'E';
      if (total >= 40) return 'S';
      return 'F';
    } else {
      if (total >= 85) return 'A';
      if (total >= 70) return 'B';
      if (total >= 55) return 'C';
      if (total >= 40) return 'D';
      return 'F';
    }
  };

  const getComment = (grade) => {
    const commentMap = { A: 'Bora Sana', B: 'Vizuri Sana', C: 'Vizuri', D: 'Dhaifu', E: 'Wastani', S: 'Kidogo', F: 'Feli' };
    return commentMap[grade] || 'Feli';
  };

  const getMonthLabel = (month) => {
    if (month === 'February' || month === 'August') return 'Jrb1';
    if (month === 'March' || month === 'September') return 'Robo';
    if (month === 'April' || month === 'October') return 'Jrb2';
    if (month === 'May') return isForm5Or6 ? 'Muh' : 'Nusu';
    if (month === 'November') return isForm5Or6 ? 'Nusu' : 'Muh';
    return `${month} Test`;
  };

  const getTabiaEvaluation = (code) => {
    const tabia = tabia_mwenendo?.find(
      (t) => String(t.criterion ?? t.code ?? '').trim() === String(code)
    );
    return tabia?.evaluation || tabia?.grade || 'C';
  };

  const getCommentValue = (key) => {
    const comment = comments?.find((c) => c.comment_type === key);
    if (comment) return comment.comment_text || '';
    const commentWithSuffix = comments?.find((c) => c.comment_type === `${key}_comments`);
    return commentWithSuffix?.comment_text || '';
  };

  const formatAuthorityDate = () => {
    if (authority_data?.date) {
      try {
        const dateObj = new Date(authority_data.date);
        if (!isNaN(dateObj.getTime())) {
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          return `${day}/${month}/${year}`;
        }
      } catch (e) {}
      return authority_data.date;
    }
    return new Date().toLocaleDateString('en-GB');
  };

  const summary = summary_data || {
    total_marks: '0',
    average: '0',
    grade: 'F',
    division: 'IV',
    division_point: '0',
    position: overall_rank?.toString() || '-',
    total_students: total_students?.toString() || '-'
  };

  const studentHuduma = getCommentValue('huduma') || getCommentValue('huduma_comments') || '';
  const classFeesAnnouncements = class_fees_announcements || {};

  // Build subject rows HTML
  // Scores may be stored with either subject_code or subject_abbreviation
  const subjectRows = subjects?.map((subject) => {
    const subjectKey = subject.subject_code;
    const subjectAbbr = subject.subject_abbreviation;
    
    // Try to find scores using both code and abbreviation
    const getScore = (month) => {
      const score1 = monthlyData[subjectKey]?.[month];
      const score2 = subjectAbbr ? monthlyData[subjectAbbr]?.[month] : null;
      return score1 !== undefined && score1 !== null && score1 !== '' ? score1 : null;
    };
    
    const month1 = getScore(months[0]);
    const month2 = getScore(months[1]);
    const month3 = getScore(months[2]);
    const month4 = getScore(months[3]);
    
    // Check if all scores are null (no scores for this subject)
    const allScoresNull = month1 === null && month2 === null && month3 === null && month4 === null;
    
    // Skip this subject if all scores are null
    if (allScoresNull) {
      return null;
    }
    
    const weight1 = (marks_config?.month_weights?.[months[0]] || 100) / 100;
    const weight2 = (marks_config?.month_weights?.[months[1]] || 0) / 100;
    const weight3 = (marks_config?.month_weights?.[months[2]] || 0) / 100;
    const weight4 = (marks_config?.month_weights?.[months[3]] || 0) / 100;
    
    const test1 = (month1 || 0) * weight1;
    const midterm = (month2 || 0) * weight2;
    const test2 = (month3 || 0) * weight3;
    const exam = (month4 || 0) * weight4;
    const total = test1 + midterm + test2 + exam;
    
    const grade = getGrade(total);
    const comment = getComment(grade);
    const rank = subject_rankings?.[subject.subject_code]?.[student.adm_no] || '-';

    return `
      <tr>
        <td>${subject.subject_name}</td>
        <td>${test1.toFixed(1)}</td>
        <td>${midterm.toFixed(1)}</td>
        <td>${test2.toFixed(1)}</td>
        <td>${exam.toFixed(1)}</td>
        <td><strong>${total.toFixed(1)}</strong></td>
        <td><strong>${grade}</strong></td>
        <td>${rank}</td>
        <td>${comment}</td>
        <td class="teacher-signature">${subject_teacher_signatures?.[subject.subject_code] || subject_teacher_signatures?.[subject.subject_abbreviation] || ''}</td>
      </tr>
    `;
  }).filter(row => row !== null).join('');

  // Build month header cells with percentage below text
  const monthHeaders = months.map((month, idx) => {
    const weight = marks_config?.month_weights?.[month] || (idx === 0 ? 100.0 : 0.0);
    return `<th class="table-header-white" style="width: 7%; line-height: 1.2;">
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div>${getMonthLabel(month)}</div>
        <div style="font-size: 0.85em; margin-top: 2px;">(${weight.toFixed(1)}%)</div>
      </div>
    </th>`;
  }).join('');

  // Build tabia rows - split into two columns
  const tabiaItemsLeft = [
    { code: '901', desc: 'Kufanya kazi kwa bidii' },
    { code: '902', desc: 'Ubora wa kazi' },
    { code: '903', desc: 'Kuheshimu kazi' },
    { code: '904', desc: 'Utunzaji wa mali ya shule / binafsi' },
    { code: '905', desc: 'Ushirikiano na wenzake' },
    { code: '906', desc: 'Heshima kwa wenzake / walimu / wafanyakazi' }
  ];
  
  const tabiaItemsRight = [
    { code: '907', desc: 'Sifa za uongozi' },
    { code: '908', desc: 'Kutii na kufuata maagizo' },
    { code: '909', desc: 'Uaminifu' },
    { code: '910', desc: 'Usafi binafsi' },
    { code: '911', desc: 'Kushiriki katika Utamaduni / Michezo' }
  ];
  
  const tabiaRowsLeft = tabiaItemsLeft.map((item) => `
    <tr>
      <td>${item.code}</td>
      <td>${item.desc}</td>
      <td>${getTabiaEvaluation(item.code)}</td>
    </tr>
  `).join('');
  
  const tabiaRowsRight = tabiaItemsRight.map((item) => `
    <tr>
      <td>${item.code}</td>
      <td>${item.desc}</td>
      <td>${getTabiaEvaluation(item.code)}</td>
    </tr>
  `).join('');

  // Build instructions
  const instructions = Object.keys(classFeesAnnouncements).length > 0 ? 
    Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
      const announcement = classFeesAnnouncements[num.toString()] || classFeesAnnouncements[num];
      return announcement ? `<p class="instruction-line">${num}. ${announcement}</p>` : '';
    }).filter(Boolean).join('') :
    '<p class="instruction-line instruction-empty">Hakuna matangazo ya ada yaliyowekwa kwa darasa hili.</p>';

  // Read CSS
  const cssContent = await getCSSContent();

  // Build HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Report - ${student.first_name} ${student.surname}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    ${cssContent}
    @media print {
      .download-section, .breadcrumb { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="logo-section">
        ${school_logo?.logo_image_path ? `<img src="${getImageUrl(school_logo.logo_image_path)}" alt="School Logo" class="school-logo" />` : '<div class="school-logo-placeholder"><i class="fas fa-school"></i></div>'}
      </div>
      <div class="school-info">
        <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
        <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
        <div class="contact-info">
          <p>P.O BOX 3102 Arusha, Tanzania</p>
          <p>+255 754 92 60 22 / +255 765 394 802 (Office)</p>
          <p>Email: arucase@gmail.com</p>
        </div>
      </div>
      <div class="student-photo">
        ${
          student.photo_path
            ? `<img src="${getImageUrl(`uploads/photos/${student.photo_path}`)}" alt="${student.first_name} ${student.surname}" class="photo" />`
            : '<div class="photo-placeholder"><i class="fas fa-user"></i></div>'
        }
      </div>
    </div>

    <div class="report-section section-taarifa">
      <h3>A. TAARIFA YA MAENDELEO YA MWANAFUNZI</h3>
      <table class="excel-table info-table">
        <tbody>
          <tr>
            <td><strong>JINA KAMILI</strong></td>
            <td>${student.first_name} ${student.middle_name || ''} ${student.surname}</td>
            <td><strong>JINSIA</strong></td>
            <td>${student.sex}</td>
            <td><strong>KIDATO</strong></td>
            <td>${formCode}</td>
          </tr>
          <tr>
            <td><strong>MUHULA</strong></td>
            <td>${term.replace('Term ', '')}</td>
            <td><strong>MWEZI</strong></td>
            <td>${isForm5Or6 ? (term === 'Term I' ? 'DECEMBER' : 'JUNE') : (term === 'Term I' ? 'JUNE' : 'DECEMBER')}</td>
            <td><strong>MWAKA</strong></td>
            <td>${year}</td>
          </tr>
          <tr>
            <td><strong>PAROKIA YA</strong></td>
            <td colspan="5">${student_parish || 'Not specified'}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="section-spacer-4px"></div>

    <div class="report-section section-ufanisi">
      <h3>B. UFANISI WA MWANAFUNZI KITAALUMA NA MASOMO</h3>
      <table class="excel-table academic-table">
        <colgroup>
          <col style="width: 33%" />
          <col style="width: 7%" />
          <col style="width: 7%" />
          <col style="width: 7%" />
          <col style="width: 7%" />
          <col style="width: 5%" />
          <col style="width: 4%" />
          <col style="width: 4%" />
          <col style="width: 9%" />
          <col style="width: 17%" />
        </colgroup>
        <thead>
          <tr>
            <th rowspan="2">SOMO</th>
            <th colspan="4">ALAMA ZA UFAULU</th>
            <th rowspan="2" class="rotate-header">JUMLA</th>
            <th rowspan="2" class="rotate-header table-header-white">DARAJA</th>
            <th rowspan="2" class="rotate-header table-header-white">NAFASI</th>
            <th rowspan="2" class="table-header-white">MAONI</th>
            <th rowspan="2" class="sahihi-header table-header-white">SAHIHI YA<br />MWALIMU</th>
          </tr>
          <tr>
            ${monthHeaders}
          </tr>
        </thead>
        <tbody>
          ${subjectRows}
        </tbody>
      </table>
      <div style="margin-top: 5px; font-size: 12px; text-align: left; padding-left: 2px;">
        <strong>KEY:</strong> Jrb1 = Jaribio 1, Robo = Robo Muhula, Jrb2 = Jaribio 2, Nusu = Nusu Muhula, Muh = Muhula
      </div>
    </div>

    <div class="report-section section-majumuisho">
      <h3>MAJUMUISHO YA KITAALUMA</h3>
      <table class="excel-table summary-table">
        <tbody>
          <tr>
            <td><strong>JUMLA KUU KATIKA MASOMO NI:</strong></td>
            <td>${summary.total_marks}</td>
            <td><strong>WASTANI</strong></td>
            <td>${summary.average}</td>
            <td><strong>DARAJA</strong></td>
            <td class="grade-cell grade-${summary.grade.toLowerCase()}">${summary.grade}</td>
          </tr>
          <tr>
            <td><strong>DIVISION</strong></td>
            <td>${summary.division}</td>
            <td><strong>POINTI</strong></td>
            <td>${summary.division_point}</td>
            <td><strong>NAFASI YA:</strong></td>
            <td>${summary.position}</td>
          </tr>
          <tr>
            <td colspan="3"><strong>KATI YA WANAFUNZI</strong></td>
            <td colspan="3"><strong>${summary.total_students}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-section section-tabia">
      <h3>C. TABIA NA MWENENDO</h3>
      <div class="behavior-table-container">
        <table class="excel-table behavior-table behavior-table-left">
          <thead>
            <tr>
              <th>NA</th>
              <th>KIPENGELE</th>
              <th>DARAJA</th>
            </tr>
          </thead>
          <tbody>
            ${tabiaRowsLeft}
          </tbody>
        </table>
        <table class="excel-table behavior-table behavior-table-right">
          <thead>
            <tr>
              <th>NA</th>
              <th>KIPENGELE</th>
              <th>DARAJA</th>
            </tr>
          </thead>
          <tbody>
            ${tabiaRowsRight}
          </tbody>
        </table>
      </div>
      
      <!-- Grade Key/Legend -->
      <div class="grade-key-legend" style="margin-top: 8px; padding: 4px; font-size: 10.5px; line-height: 1.4; white-space: nowrap; overflow: visible;">
        ${isForm5Or6 ? `
          <strong>ALAMA:</strong> A = 85+, Bora Sana, B = 75+, Vizuri Sana, C = 65+, Vizuri, D = 55+, Dhaifu, E = 45+, Wastani, S = 40+, Kidogo, F = 0 – 39, Feli<br/>
          <strong>TABIA:</strong> A, Vizuri Sana, B, Vizuri, C, Wastani, D, Dhaifu, F, Mbaya
        ` : `
          <strong>ALAMA:</strong> A = 85 – 100, Bora Sana, B = 70 – 84, Vizuri Sana, C = 50 – 69, Vizuri, D = 40 – 49, Dhaifu, F = 0 – 39, Feli | <strong>TABIA:</strong> A, Vizuri Sana, B, Vizuri, C, Wastani, D, Dhaifu, F, Mbaya
        `}
      </div>
    </div>

    <div class="report-section section-maoni-taaluma">
      <h3>D. MAONI KATIKA TAALUMA</h3>
      <table class="excel-table comments-table">
        <tbody>
          <tr>
            <td><strong>Mwalimu wa Taaluma:</strong></td>
            <td colspan="3">${getCommentValue('mwalimu_taaluma') || ''}</td>
          </tr>
          <tr>
            <td><strong>Maoni ya Mkuu wa Shule:</strong></td>
            <td colspan="3">${getCommentValue('mkuu_shule') || ''}</td>
          </tr>
          <tr>
            <td><strong>SAHIHI YA MKUU WA SHULE:</strong></td>
            <td class="authority-signature">
              ${authority_data?.signature_image_path 
                ? `<img src="${getImageUrl(authority_data.signature_image_path)}" alt="Signature" class="signature-image" style="max-width: 300px; max-height: 60px;" />` 
                : (authority_data?.signature || '')}
            </td>
            <td><strong>TAREHE:</strong></td>
            <td class="authority-date">${formatAuthorityDate()}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-section section-maoni">
      <h3>MAONI</h3>
      <table class="excel-table general-comments maoni-table">
        <tbody>
          <tr class="maoni-taaluma-row">
            <td class="maoni-label"><strong>TAALUMA:</strong></td>
            <td class="maoni-content">${getCommentValue('taaluma') || ''}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>HUDUMA:</strong></td>
            <td class="maoni-content">${studentHuduma || ''}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>MICHEZO:</strong></td>
            <td class="maoni-content">${getCommentValue('michezo') || ''}</td>
          </tr>
          <tr class="maoni-tabia-row">
            <td class="maoni-label"><strong>TABIA:</strong></td>
            <td class="maoni-content">${getCommentValue('tabia') || ''}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>SALA:</strong></td>
            <td class="maoni-content">${getCommentValue('sala') || ''}</td>
          </tr>
          <tr>
            <td class="maoni-label"><strong>FEDHA ANAYODAIWA:</strong></td>
            <td class="maoni-content">${student_fees_debt || '0.00'}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="section-spacer-4px"></div>

    <div class="report-section section-mambo">
      <h3>MAMBO YA KUFAHAMU</h3>
      <div class="instructions">
        ${instructions}
      </div>
    </div>

    <div class="signature-stamp-section">
      <div class="signature-block">
        ${authority_data?.signature_image_path 
          ? `<div class="signature-image-container" style="text-align: left; margin-bottom: 5px;"><img src="${getImageUrl(authority_data.signature_image_path)}" alt="Signature" class="signature-image" style="max-width: 300px; max-height: 60px; display: inline-block; vertical-align: bottom;" /></div>` 
          : (authority_data?.signature ? `<div class="signature-text authority-signature">${authority_data.signature}</div>` : '')}
        <div class="signature-line">_________________________</div>
        <div class="signature-name">${authority_data?.name || 'Father Moses Assey'}</div>
        <div class="signature-title">${authority_data?.title || 'Baba Gombera'}</div>
        <div class="signature-date">Tarehe ${formatAuthorityDate()}</div>
      </div>
      <div class="stamp-block">
        ${school_stamp?.stamp_image_path ? `<img src="${getImageUrl(school_stamp.stamp_image_path)}" alt="School Stamp" class="stamp-img" />` : '<div class="school-stamp"><div class="stamp-border"><div class="stamp-content"><div class="stamp-text-top">ARUSHA CATHOLIC</div><div class="stamp-motto">SEMINARY</div><div class="stamp-text-bottom">OLDONYOSAMBU</div></div></div></div>'}
      </div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

module.exports = {
  generateReportHTML
};
