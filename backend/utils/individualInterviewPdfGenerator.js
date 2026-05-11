/**
 * Individual PreForm One Interview Report PDF Generator
 * Generates properly formatted PDF with school letterhead and interview results
 */
const puppeteer = require('puppeteer');

/**
 * Generate individual interview report PDF with proper school letterhead formatting
 * @param {Object} student - Student information
 * @param {Object} result - Interview results data
 * @param {Array} subjects - Interview subjects
 * @param {Object} scores - Student subject scores
 * @param {string} year - Academic year
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateIndividualInterviewPDF(student, result, subjects, scores, year) {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      });
      
      const page = await browser.newPage();
      
      // Generate HTML content with school letterhead
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              width: 80px;
              height: 80px;
              margin-bottom: 10px;
            }
            .school-info {
              margin-bottom: 20px;
            }
            .school-info h1 {
              font-size: 18px;
              font-weight: bold;
              margin: 5px 0;
            }
            .school-info h2 {
              font-size: 16px;
              margin: 5px 0;
            }
            .school-info p {
              margin: 2px 0;
              font-size: 14px;
            }
            .report-title {
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              margin: 30px 0 20px 0;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .results-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .results-table th,
            .results-table td {
              border: 1px solid #333;
              padding: 8px;
              text-align: left;
            }
            .results-table th {
              background-color: #f0f0f0;
              font-weight: bold;
            }
            .summary-section {
              margin-top: 30px;
              padding: 15px;
              border: 1px solid #333;
            }
            .signature-section {
              margin-top: 40px;
              text-align: right;
            }
            .page-break {
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          <!-- School Letterhead -->
          <div class="header">
            <div class="logo">
              <img src="${process.env.BASE_URL || 'http://localhost:5000'}/static/school-logo.png" alt="Arusha Catholic Seminary official school logo" />
            </div>
            <div class="school-info">
              <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
              <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
              <p>P.O BOX 3102 Arusha, Tanzania</p>
              <p>+255 754 92 60 22 / +255 765 394 802 (Office)</p>
              <p>Email: arucase@gmail.com</p>
            </div>
            <div class="logo">
              <img src="${process.env.BASE_URL || 'http://localhost:5000'}/static/school-logo.png" alt="Arusha Catholic Seminary official school logo" />
            </div>
          </div>

          <!-- Report Title -->
          <div class="report-title">
            PRE-FORM ONE INTERVIEW REPORT ${year}
          </div>

          <!-- Student Information -->
          <div class="summary-section">
            <p><strong>Student Name:</strong> ${student.first_name} ${student.middle_name || ''} ${student.surname}</p>
            <p><strong>Admission Number:</strong> ${student.admission_number}</p>
            <p><strong>Parish:</strong> ${student.parish || 'N/A'}</p>
            <p><strong>Sex:</strong> ${student.sex}</p>
          </div>

          <!-- Interview Results Table -->
          <table class="results-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Score</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(subject => {
                const score = scores[subject.subject_code] || '-';
                const grade = score !== '-' ? getGrade(score) : '-';
                return `
                  <tr>
                    <td>${subject.subject_code}</td>
                    <td>${score}</td>
                    <td>${grade}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <!-- Summary Section -->
          <div class="summary-section">
            <p><strong>Total Score:</strong> ${result.total_marks || 0}</p>
            <p><strong>Average:</strong> ${result.average || 0}</p>
            <p><strong>Grade:</strong> ${result.grade || 'N/A'}</p>
            <p><strong>Position:</strong> ${result.position || 'N/A'}</p>
            <p><strong>Remarks:</strong> ${result.remarks || 'N/A'}</p>
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <p><strong>Mwalimu wa Taaluma:</strong> ________________________</p>
            <p><strong>Maoni ya Mkuu wa Shule:</strong> ________________________</p>
            <p><strong>Sahihi ya Mkuu wa Shule:</strong> Signature</p>
            <p><strong>Tarehe:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
        </html>
      `;
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        timeout: 15000
      });
      
      await browser.close();
      
      resolve(pdfBuffer);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get grade based on score
 * @param {number} score - Student score
 * @returns {string} Grade letter
 */
function getGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

module.exports = {
  generateIndividualInterviewPDF
};
