const { query } = require('./config/database');

async function testAPI() {
  try {
    console.log('Testing API query for FORM I, A, 2025...');
    
    // Simulate the API query from students.js line 357-365
    const level = 'FORM I';
    const stream = 'A';
    const year = 2025;
    
    const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(level.trim());
    console.log('isFormIV:', isFormIV);
    
    let queryText = 'SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com FROM students WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (level && level.trim()) {
      const normalizedLevel = level.trim().toUpperCase();
      queryText += ` AND level = $${paramCount}`;
      params.push(normalizedLevel);
      paramCount++;
    }
    
    if (stream && stream.trim()) {
      const normalizedStream = stream.trim(); // Don't normalize for test
      console.log('normalizedStream:', normalizedStream);
      
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(normalizedStream);
      }
    }
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        queryText += ` AND year = $${paramCount++}`;
        params.push(yearNum);
      }
    }
    
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    console.log('Final query:', queryText);
    console.log('Params:', params);
    
    const result = await query(queryText, params);
    console.log('Students found:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('First few students:');
      result.rows.slice(0, 3).forEach((student, i) => {
        console.log(`${i+1}. ${student.first_name} ${student.surname} - Stream: ${student.stream}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testAPI();
