const { query } = require('./config/database');

async function testAPICall() {
  try {
    console.log('Testing actual API call parameters...');
    
    // Simulate the exact API call from frontend
    const level = 'FORM I';
    const stream = 'A';  // This is what frontend sends
    const year = 2025;
    
    console.log('Parameters:', { level, stream, year });
    
    // This is the exact query from students.js lines 320-406
    let queryText = 'SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com FROM students WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (level && level.trim()) {
      const normalizedLevel = level.trim().toUpperCase();
      queryText += ` AND level = $${paramCount}`;
      params.push(normalizedLevel);
      paramCount++;
      console.log('Added level filter:', normalizedLevel);
    }
    
    if (stream && stream.trim()) {
      const normalizedStream = stream.trim(); // Don't normalize for this test
      console.log('Processing stream:', normalizedStream);
      
      // Combined mode for FORM V/VI: stream=ALL means include all streams.
      if (normalizedStream === 'ALL') {
        console.log('Stream is ALL - skipping stream filter');
      } else {
      // FORM I-IV: return students with stream A or NA so all registered in that class are visible (e.g. score entry)
      const isFormIV = level && /^FORM\s+(I|II|III|IV)$/i.test(level.trim());
      console.log('isFormIV:', isFormIV, 'for level:', level);
      
      if (isFormIV && (normalizedStream === 'A' || normalizedStream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
        console.log('Added stream filter for A OR NA');
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(normalizedStream);
        console.log('Added exact stream filter:', normalizedStream);
      }
    }
    }
    
    if (year) {
      const yearNum = parseInt(year);
      if (!isNaN(yearNum) && yearNum > 0) {
        queryText += ` AND year = $${paramCount++}`;
        params.push(yearNum);
        console.log('Added year filter:', yearNum);
      }
    }
    
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    console.log('\nFinal query:');
    console.log(queryText);
    console.log('Params:', params);
    
    const result = await query(queryText, params);
    console.log('\nStudents found:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('First few students:');
      result.rows.slice(0, 3).forEach((student, i) => {
        console.log(`${i+1}. ${student.first_name} ${student.surname} - Stream: ${student.stream}`);
      });
    } else {
      console.log('No students found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testAPICall();
