const { query } = require('./config/database');
const { normalizeStream } = require('./utils/streamNormalizer');

async function checkStreamNormalization() {
  try {
    console.log('Testing stream normalization...');
    
    console.log('Testing NA -> A normalization:');
    console.log('normalizeStream("NA"):', normalizeStream('NA'));
    console.log('normalizeStream("A"):', normalizeStream('A'));
    
    // Check actual streams in database for FORM I 2025
    const result = await query(
      'SELECT DISTINCT stream FROM students WHERE level = $1 AND year = $2 ORDER BY stream',
      ['FORM I', 2025]
    );
    
    console.log('\nActual streams in database:');
    result.rows.forEach(row => {
      console.log(`  "${row.stream}"`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkStreamNormalization();
