// Check monthly_results table structure
const { query } = require('./config/database');

async function checkMonthlyResultsStructure() {
  try {
    console.log('=== CHECKING MONTHLY_RESULTS STRUCTURE ===');
    
    // Get table structure
    const structureResult = await query(
      `SELECT column_name, data_type, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'monthly_results' 
       ORDER BY ordinal_position`
    );
    
    console.log('monthly_results columns:');
    structureResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
    
    // Check for Form IV data
    const formIVData = await query(
      `SELECT COUNT(*) as count FROM monthly_results 
       WHERE level = 'FORM IV' AND year = 2025`
    );
    console.log(`\nForm IV monthly results in 2025: ${formIVData.rows[0].count}`);
    
    // Check available months for Form IV
    const monthsResult = await query(
      `SELECT DISTINCT month, COUNT(*) as count 
       FROM monthly_results 
       WHERE level = 'FORM IV' AND year = 2025
       GROUP BY month 
       ORDER BY month`
    );
    
    console.log('\nForm IV monthly results by month:');
    monthsResult.rows.forEach(row => {
      console.log(`  - ${row.month}: ${row.count} students`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkMonthlyResultsStructure();
