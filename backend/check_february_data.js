// Check if there's data for February 2025
const { query } = require('./config/database');

async function checkFebruaryData() {
  try {
    console.log('=== CHECKING FEBRUARY 2025 DATA ===');
    
    // Check students for FORM I A 2025
    const studentsResult = await query(
      `SELECT COUNT(*) as count FROM students 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025`
    );
    console.log('Students in FORM I A 2025:', studentsResult.rows[0].count);
    
    // Check individual scores for February
    const scoresResult = await query(
      `SELECT COUNT(*) as count FROM individual_scores 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025 AND month = 'February'`
    );
    console.log('Individual scores for February 2025:', scoresResult.rows[0].count);
    
    // Check individual scores for November (for comparison)
    const novemberScoresResult = await query(
      `SELECT COUNT(*) as count FROM individual_scores 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025 AND month = 'November'`
    );
    console.log('Individual scores for November 2025:', novemberScoresResult.rows[0].count);
    
    // Check monthly results for February
    const monthlyResultsResult = await query(
      `SELECT COUNT(*) as count FROM monthly_results 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025 AND month = 'February'`
    );
    console.log('Monthly results for February 2025:', monthlyResultsResult.rows[0].count);
    
    // Check monthly results for November (for comparison)
    const novemberMonthlyResultsResult = await query(
      `SELECT COUNT(*) as count FROM monthly_results 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025 AND month = 'November'`
    );
    console.log('Monthly results for November 2025:', novemberMonthlyResultsResult.rows[0].count);
    
    // Show available months with data
    const availableMonthsResult = await query(
      `SELECT DISTINCT month, COUNT(*) as count 
       FROM individual_scores 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025
       GROUP BY month 
       ORDER BY month`
    );
    console.log('\nAvailable months with individual scores:');
    availableMonthsResult.rows.forEach(row => {
      console.log(`  ${row.month}: ${row.count} scores`);
    });
    
    // Show available months with monthly results
    const availableMonthlyMonthsResult = await query(
      `SELECT DISTINCT month, COUNT(*) as count 
       FROM monthly_results 
       WHERE level = 'FORM I' AND stream IN ('A', 'NA') AND year = 2025
       GROUP BY month 
       ORDER BY month`
    );
    console.log('\nAvailable months with monthly results:');
    availableMonthlyMonthsResult.rows.forEach(row => {
      console.log(`  ${row.month}: ${row.count} results`);
    });
    
  } catch (error) {
    console.error('Error checking February data:', error);
  } finally {
    process.exit(0);
  }
}

checkFebruaryData();
