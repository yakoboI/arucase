// Check what results tables exist
const { query } = require('./config/database');

async function checkResultsTables() {
  try {
    console.log('=== CHECKING RESULTS TABLES ===');
    
    // Get all table names containing 'result'
    const tablesResult = await query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name LIKE '%result%'
       ORDER BY table_name`
    );
    
    console.log('Available results tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check Form IV data in each results table
    const form = 'FORM IV';
    const year = 2025;
    const term = 'First Term';
    
    for (const table of tablesResult.rows) {
      try {
        const countResult = await query(
          `SELECT COUNT(*) as count FROM ${table.table_name} 
           WHERE level = $1 AND year = $2 AND term = $3`,
          [form, year, term]
        );
        console.log(`${table.table_name}: ${countResult.rows[0].count} Form IV records for Term I 2025`);
      } catch (error) {
        console.log(`${table.table_name}: Cannot query - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    process.exit(0);
  }
}

checkResultsTables();
