// Test bulk PDF generation to identify the 500 error
const puppeteer = require('puppeteer');

async function testPuppeteerLaunch() {
  try {
    console.log('=== TESTING PUPPETEER LAUNCH ===');
    
    console.log('Attempting to launch Puppeteer...');
    const browser = await puppeteer.launch({
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
    
    console.log('✅ Puppeteer launched successfully');
    
    const page = await browser.newPage();
    console.log('✅ New page created');
    
    await page.goto('data:text/html,<html><body><h1>Test</h1></body></html>');
    console.log('✅ Page loaded');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes');
    
    await browser.close();
    console.log('✅ Browser closed');
    
    console.log('\n=== PUPPETEER TEST SUCCESSFUL ===');
    console.log('The issue is not with Puppeteer launch');
    console.log('The 500 error is likely in the bulk PDF generation logic');
    
  } catch (error) {
    console.error('❌ PUPPETEER TEST FAILED:', error.message);
    console.error('This is the cause of the 500 error');
    
    if (error.message.includes('ENOENT')) {
      console.log('💡 Suggestion: Puppeteer cannot find Chromium - try installing dependencies');
    }
  }
}

async function testFormIVData() {
  try {
    console.log('\n=== TESTING FORM IV DATA ===');
    
    const { query } = require('./config/database');
    
    // Check if Form IV students exist for Term I 2025
    const studentsResult = await query(
      `SELECT COUNT(*) as count FROM students 
       WHERE level = 'FORM IV' AND year = 2025`
    );
    console.log('Form IV students in 2025:', studentsResult.rows[0].count);
    
    // Check if Form IV results exist for Term I 2025
    const resultsResult = await query(
      `SELECT COUNT(*) as count FROM exam_results 
       WHERE level = 'FORM IV' AND year = 2025 AND term = 'First Term'`
    );
    console.log('Form IV results for Term I 2025:', resultsResult.rows[0].count);
    
    if (studentsResult.rows[0].count === 0) {
      console.log('⚠️  No Form IV students found - this might cause the 500 error');
    }
    
    if (resultsResult.rows[0].count === 0) {
      console.log('⚠️  No Form IV results found - this might cause the 500 error');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

async function runTests() {
  await testPuppeteerLaunch();
  await testFormIVData();
  process.exit(0);
}

runTests();
