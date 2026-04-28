/**
 * Check 2026 student data - diagnose why 2026 shows only 1 student
 */
require('dotenv').config();
const { query } = require('../config/database');

async function check2026Students() {
  try {
    console.log('=== Checking 2026 Student Data ===\n');

    // 1. Count students by year
    const yearCounts = await query(`
      SELECT year, COUNT(*) as count
      FROM students
      GROUP BY year
      ORDER BY year DESC
    `);
    console.log('Students by year:');
    yearCounts.rows.forEach(row => {
      console.log(`  ${row.year}: ${row.count} students`);
    });

    // 2. Check 2026 students specifically
    const students2026 = await query(`
      SELECT id, adm_no, level, stream, year, term
      FROM students
      WHERE year = 2026
      ORDER BY level, stream
      LIMIT 10
    `);
    console.log(`\nStudents with year = 2026: ${students2026.rows.length} (showing first 10)`);
    if (students2026.rows.length > 0) {
      students2026.rows.forEach(s => {
        console.log(`  ${s.adm_no} - ${s.level} - Stream ${s.stream} - Term: ${s.term}`);
      });
    }

    // 3. Check for students with year values that might be 2026 but stored differently
    const weirdYears = await query(`
      SELECT DISTINCT year, COUNT(*) as count
      FROM students
      WHERE year IS NOT NULL
      GROUP BY year
      ORDER BY year DESC
    `);
    console.log('\nAll distinct year values in database:');
    weirdYears.rows.forEach(row => {
      console.log(`  ${row.year} (${typeof row.year}): ${row.count} students`);
    });

    // 4. Check level values for all students
    const levelCounts = await query(`
      SELECT UPPER(TRIM(level)) as level, COUNT(*) as count
      FROM students
      GROUP BY UPPER(TRIM(level))
      ORDER BY count DESC
    `);
    console.log('\nStudents by level:');
    levelCounts.rows.forEach(row => {
      console.log(`  ${row.level}: ${row.count} students`);
    });

    // 5. Check if there are students with NULL year
    const nullYearCount = await query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE year IS NULL
    `);
    console.log(`\nStudents with NULL year: ${nullYearCount.rows[0].count}`);

    // 6. Check the actual distribution query for 2026
    const distribution2026 = await query(`
      SELECT 
        year,
        term,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM I' THEN 1 ELSE 0 END) AS form_i,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM II' THEN 1 ELSE 0 END) AS form_ii,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM III' THEN 1 ELSE 0 END) AS form_iii,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM IV' THEN 1 ELSE 0 END) AS form_iv,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM V' THEN 1 ELSE 0 END) AS form_v,
        SUM(CASE WHEN UPPER(TRIM(level)) = 'FORM VI' THEN 1 ELSE 0 END) AS form_vi
      FROM students
      WHERE year = 2026
      GROUP BY year, term
      ORDER BY year DESC, term DESC
    `);
    console.log('\nDistribution query result for 2026:');
    console.log(JSON.stringify(distribution2026.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

check2026Students();
