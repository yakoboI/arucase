/**
 * Puppeteer-based PDF Generator for Individual Reports
 * Renders the actual HTML page to PDF, preserving all CSS styling
 */
const puppeteer = require('puppeteer');
const axios = require('axios');
const { normalizeStream } = require('./streamNormalizer');

/**
 * Generate PDF from the individual report page using Puppeteer
 * Fetches data from API and renders HTML server-side, then converts to PDF
 * @param {string} form - Form level (e.g., 'FORM I')
 * @param {string} stream - Stream (e.g., 'NA', 'A', 'PCB')
 * @param {number} year - Year (e.g., 2025)
 * @param {string} term - Term (e.g., 'Term I', 'Term II')
 * @param {string} admNo - Admission number
 * @param {string} apiUrl - Backend API URL (default: http://localhost:5000)
 * @param {string} authToken - Auth token for API requests
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateIndividualReportPDFWithPuppeteer(
  form,
  stream,
  year,
  term,
  admNo,
  apiUrl = process.env.API_URL || 'http://localhost:5000',
  authToken = null
) {
  let browser = null;
  
  try {
    // Normalize stream: NA -> A (important for database queries)
    const normalizedStream = normalizeStream(stream || 'NA');
    
    // Encode parameters for URL
    const encodedForm = encodeURIComponent(form);
    const encodedStream = encodeURIComponent(normalizedStream);
    const encodedTerm = encodeURIComponent(term);
    
    // Fetch report data from API
    console.log('Fetching report data from API...');
    console.log('Stream normalization:', { original: stream, normalized: normalizedStream });
    const reportDataUrl = `${apiUrl}/api/reports/individual/${encodedForm}/${encodedStream}/${year}/${encodedTerm}/${admNo}`;
    console.log('Report data URL:', reportDataUrl);
    console.log('API URL base:', apiUrl);
    console.log('Auth token present:', !!authToken);
    
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    let reportDataResponse;
    try {
      console.log('Making API request...');
      reportDataResponse = await axios.get(reportDataUrl, { headers, timeout: 30000 });
      console.log('API response status:', reportDataResponse.status);
      console.log('API response data keys:', Object.keys(reportDataResponse.data || {}));
    } catch (apiError) {
      console.error('API request failed:', apiError.message);
      console.error('API error details:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        url: reportDataUrl,
        hasAuthToken: !!authToken
      });
      
      // Provide more detailed error message
      if (apiError.response) {
        const status = apiError.response.status;
        const errorData = apiError.response.data;
        const errorMsg = errorData?.message || errorData?.error || apiError.message;
        throw new Error(`API request failed (${status}): ${errorMsg}`);
      } else if (apiError.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to API server at ${apiUrl}. Make sure the backend server is running.`);
      } else if (apiError.code === 'ETIMEDOUT') {
        throw new Error(`API request timed out after 30 seconds. The server may be overloaded.`);
      } else {
        throw new Error(`API request failed: ${apiError.message}`);
      }
    }
    
    const reportData = reportDataResponse.data;
    
    console.log('Report data fetched successfully');
    
    // Generate HTML from report data
    const { generateReportHTML } = require('./htmlReportRenderer');
    const html = await generateReportHTML({
      ...reportData,
      form,
      term,
      year
    }, apiUrl);
    
    // Validate HTML
    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      throw new Error('Generated HTML is empty or invalid');
    }
    
    console.log(`HTML generated successfully. Length: ${html.length} characters`);
    
    // Launch browser with optimized settings
    console.log('Launching Puppeteer browser...');
    try {
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
        timeout: 30000
      });
      console.log('Browser launched successfully');
    } catch (browserError) {
      console.error('Failed to launch browser:', browserError);
      throw new Error(`Browser launch failed: ${browserError.message}`);
    }
    
    const page = await browser.newPage();

    // Collect useful diagnostics for debugging missing images in PDF.
    page.on('console', (msg) => {
      // Avoid noisy logs; focus on warnings/errors.
      if (['warning', 'error'].includes(msg.type())) {
        console.log('[PUPPETEER][console]', msg.type(), msg.text());
      }
    });
    page.on('pageerror', (err) => {
      console.error('[PUPPETEER][pageerror]', err.message);
    });
    page.on('requestfailed', (req) => {
      const failure = req.failure();
      console.warn('[PUPPETEER][requestfailed]', req.url(), failure?.errorText || 'unknown');
    });
    
    // Set viewport for consistent rendering - wider to match screen view
    await page.setViewport({
      width: 1920,
      height: 1600,
      deviceScaleFactor: 2
    });
    
    // Set base URL for relative image paths
    const baseUrl = apiUrl.replace('/api', '');
    
    // Set auth headers for image requests (before setContent so they're used)
    if (authToken) {
      await page.setExtraHTTPHeaders({
        'Authorization': `Bearer ${authToken}`
      });
    }
    
    // Set content directly from HTML string
    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
        baseURL: baseUrl
      });
    } catch (contentError) {
      console.error('Error setting page content:', contentError);
      throw new Error(`Failed to load HTML content: ${contentError.message}`);
    }
    
    // Wait for student photo (if present) to fully load before generating the PDF.
    // Some iPhone/safari-like environments defer image load events; this avoids capturing a blank slot.
    try {
      await page.waitForFunction(() => {
        const img = document.querySelector('.student-photo img.photo');
        if (!img) return true; // No photo element rendered
        return img.complete && img.naturalWidth > 0;
      }, { timeout: 10000 });
    } catch {
      // If it times out, still generate the PDF with whatever is rendered.
    }

    // Log final image state for debugging.
    try {
      const photoState = await page.evaluate(() => {
        const img = document.querySelector('.student-photo img.photo');
        if (!img) return null;
        return {
          src: img.currentSrc || img.src,
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        };
      });
      if (photoState) {
        console.log('[PUPPETEER] Student photo render state:', photoState);

        if (!photoState.complete || !(photoState.naturalWidth > 0)) {
          const screenshotPath = `debug_student_photo_${Date.now()}.png`;
          try {
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.warn('[PUPPETEER] Photo not loaded (or has zero naturalWidth). Saved screenshot:', screenshotPath);
          } catch (ssErr) {
            console.warn('[PUPPETEER] Could not take screenshot:', ssErr.message);
          }
        }
      }
    } catch (e) {
      console.warn('[PUPPETEER] Could not read photo render state:', e.message);
    }
    
    // Small grace period for layout/render stability.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // CRITICAL: Execute the same JavaScript styling enforcement as local development
    // This ensures exact congruence between local and production PDFs
    await page.evaluate(() => {
      // Force MAONI column visibility
      const forceMaoniColumnVisible = () => {
        const maoniHeaders = document.querySelectorAll('.academic-table th:nth-child(10)');
        const maoniCells = document.querySelectorAll('.academic-table td:nth-child(10)');
        
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

      // Force thin black borders on all table cells
      const forceThinBlackBorders = () => {
        const allTableCells = document.querySelectorAll('.report-container td, .report-container th');
        allTableCells.forEach((cell) => {
          cell.style.setProperty('border', '1px solid #000000', 'important');
        });
      };

      // Force column widths
      const forceColumnWidths = () => {
        const academicTable = document.querySelector('.academic-table');
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
      
      // Force NAFASI header rotation - critical for PDF generation
      const forceNafasiRotation = () => {
        const academicTable = document.querySelector('.academic-table');
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

      // Initialize formatting - same as local development
      const initFormatting = () => {
        forceMaoniColumnVisible();
        forceThinBlackBorders();
        forceColumnWidths();
        forceNafasiRotation();
      };

      // Run immediately
      initFormatting();

      // Use MutationObserver to watch for style changes - same as local
      const academicTable = document.querySelector('.academic-table');
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

      // CRITICAL: Force grade key to be visible before PDF generation
      const gradeKeyLegend = document.querySelector('.grade-key-legend');
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
    
    // Another grace period after JavaScript execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify page loaded correctly
    const pageTitle = await page.title();
    console.log('Page loaded. Title:', pageTitle);
    
    // Generate PDF with optimized settings for A4 printing - maximize width to match screen view
    let pdfBuffer;
    try {
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5mm',
          right: '0.5mm',
          bottom: '0.5mm',
          left: '0.5mm'
        },
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        scale: 1.0
      });
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      throw new Error(`Failed to generate PDF: ${pdfError.message}`);
    }
    
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
      console.error('Invalid PDF buffer. First bytes:', buffer.slice(0, 20).toString('hex'));
      console.error('First bytes (ascii):', buffer.slice(0, 20).toString('ascii'));
      throw new Error('Generated file is not a valid PDF');
    }
    
    console.log(`PDF generated successfully. Size: ${buffer.length} bytes`);
    console.log('PDF first bytes:', buffer.slice(0, 10).toString('hex'));
    
    return buffer;
    
  } catch (error) {
    console.error('Puppeteer PDF Generation Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      form,
      stream,
      year,
      term,
      admNo
    });
    
    // Provide more specific error messages
    if (error.message.includes('Browser launch')) {
      throw new Error(`Failed to launch browser for PDF generation: ${error.message}. Make sure Puppeteer dependencies are installed.`);
    } else if (error.message.includes('API request failed')) {
      throw new Error(`Failed to fetch report data: ${error.message}`);
    } else if (error.message.includes('HTML')) {
      throw new Error(`Failed to generate HTML: ${error.message}`);
    } else {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

module.exports = {
  generateIndividualReportPDFWithPuppeteer
};
