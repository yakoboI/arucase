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
      body { font-family: Times New Roman, Times, serif; margin: 0; padding: 0; }
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

/**
 * Get report data directly from database (internal function to avoid HTTP requests)
 */
async function getReportDataInternal(form, stream, year, term, admNo) {
  // This function replicates the logic from the individual report endpoint
  // but bypasses authentication and HTTP requests
  
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
      [admNo, form, uniqueStreams[0], parseInt(year)]
    );
  } else {
    studentResult = await query(
      'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
      [admNo, form, uniqueStreams[0], uniqueStreams[1], parseInt(year)]
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
      [form, uniqueSubjectStreams[0], parseInt(year)]
    );
  } else {
    subjectsResult = await query(
      'SELECT * FROM subjects WHERE level = $1 AND stream IN ($2, $3) AND year = $4 ORDER BY subject_code',
      [form, uniqueSubjectStreams[0], uniqueSubjectStreams[1], parseInt(year)]
    );
  }
  
  // Get individual scores
  const monthlyResult = await query(
    'SELECT * FROM individual_scores WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND month = ANY($6::text[])',
    [admNo, form, actualStream, normalizedStream, parseInt(year), months]
  );
  
  // Get basic report data (simplified for bulk PDF)
  return {
    student,
    subjects: subjectsResult.rows,
    monthly_results: monthlyResult.rows,
    months,
    form,
    term: normalizedTerm,
    year
  };
}

/**
 * Generate HTML for a single report (extract just the report-container content)
 */
async function generateSingleReportHTML(reportData) {
  const fullHTML = await generateReportHTML(reportData);
  // Extract just the report-container content
  // The HTML structure is: <body><div class="report-container">...</div></body></html>
  const containerMatch = fullHTML.match(/<div class="report-container">([\s\S]*?)<\/div>\s*(?:<\/body>|<\/html>)/);
  if (containerMatch && containerMatch[1]) {
    return containerMatch[1].trim();
  }
  // Fallback: try to extract everything between body tags
  const bodyMatch = fullHTML.match(/<body>([\s\S]*?)<\/body>/);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1].trim();
  }
  // Last resort: return full HTML (will work but less efficient)
  console.warn('[BULK PDF] Could not extract report container, using full HTML');
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
    
    // Fetch report data for all students and generate HTML
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const admNo = student.adm_no || student.admNo;
      const studentStream = student.stream || stream;
      
      try {
        // Get report data directly from database (no HTTP requests)
        const reportData = await getReportDataInternal(form, studentStream, year, term, admNo);
        
        // Generate HTML for this report (just the container content)
        const reportHTML = await generateSingleReportHTML({
          ...reportData,
          form,
          term,
          year
        });
        
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
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>
    ${cssContent}
    @media print {
      .download-section, .breadcrumb, .bulk-report-actions, .excel-card-header { display: none !important; }
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
      await page.setContent(combinedHTML, {
        waitUntil: 'load', // Changed from 'networkidle0' to 'load' for better reliability
        timeout: 300000, // 5 minutes timeout for setContent (bulk PDFs can be large)
        baseURL: baseUrl
      });
    } catch (contentError) {
      // If 'load' times out, try with 'domcontentloaded' as fallback
      console.warn('[BULK PDF] setContent with "load" timed out, trying "domcontentloaded"...');
      try {
        await page.setContent(combinedHTML, {
          waitUntil: 'domcontentloaded',
          timeout: 300000,
          baseURL: baseUrl
        });
      } catch (domError) {
        // Last resort: set content without waiting
        console.warn('[BULK PDF] setContent with "domcontentloaded" also timed out, setting content without wait...');
        await page.setContent(combinedHTML, {
          waitUntil: 'commit',
          timeout: 300000,
          baseURL: baseUrl
        });
      }
    }
    
    // Wait a bit for all images/fonts to load (increased wait time for bulk PDFs)
    console.log('[BULK PDF] Waiting for resources to load...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Increased from 2s to 5s
    
    // CRITICAL: Execute the same JavaScript styling enforcement as local development
    // This ensures exact congruence between local and production PDFs for each report
    console.log('[BULK PDF] Applying JavaScript styling enforcement for exact congruence...');
    await page.evaluate(() => {
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
              element.style.setProperty('font-family', 'Times New Roman, Times, serif', 'important');
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
    });
    
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
