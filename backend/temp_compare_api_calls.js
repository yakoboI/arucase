const { query } = require('./config/database');

async function compareAPICalls() {
  try {
    console.log('=== COMPARING API CALLS ===\n');
    
    // Test 1: Registration page parameters
    console.log('1. REGISTRATION PAGE API CALL:');
    const regParams = {
      level: 'FORM I',
      stream: 'A',  // Registration uses stream from URL
      year: 2025,
      term: 'First Term'
    };
    console.log('Parameters:', regParams);
    
    let queryText = 'SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com FROM students WHERE 1=1';
    let params = [];
    let paramCount = 1;
    
    if (regParams.level) {
      queryText += ` AND level = $${paramCount}`;
      params.push(regParams.level);
      paramCount++;
    }
    
    if (regParams.stream) {
      const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(regParams.level);
      if (isFormIV && (regParams.stream === 'A' || regParams.stream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(regParams.stream);
      }
    }
    
    if (regParams.year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(regParams.year);
    }
    
    if (regParams.term) {
      queryText += ` AND term = $${paramCount++}`;
      params.push(regParams.term);
    }
    
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    const regResult = await query(queryText, params);
    console.log(`Students found: ${regResult.rows.length}\n`);
    
    // Test 2: Score Entry page parameters  
    console.log('2. SCORE ENTRY PAGE API CALL:');
    const scoreParams = {
      level: 'FORM I',
      stream: 'A',  // Score entry normalizes to 'A'
      year: 2025
      // No term filter for Form I-IV
    };
    console.log('Parameters:', scoreParams);
    
    queryText = 'SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com FROM students WHERE 1=1';
    params = [];
    paramCount = 1;
    
    if (scoreParams.level) {
      queryText += ` AND level = $${paramCount}`;
      params.push(scoreParams.level);
      paramCount++;
    }
    
    if (scoreParams.stream) {
      const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(scoreParams.level);
      if (isFormIV && (scoreParams.stream === 'A' || scoreParams.stream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(scoreParams.stream);
      }
    }
    
    if (scoreParams.year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(scoreParams.year);
    }
    
    // No term filter for Form I-IV score entry
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    const scoreResult = await query(queryText, params);
    console.log(`Students found: ${scoreResult.rows.length}\n`);
    
    // Test 3: Marks Config page parameters
    console.log('3. MARKS CONFIG PAGE API CALL:');
    const marksParams = {
      level: 'FORM I',
      stream: 'A',  // Marks config uses stream from URL
      year: 2025,
      term: 'Term I'  // Marks config includes term for Form I (but shouldn't filter)
    };
    console.log('Parameters:', marksParams);
    
    queryText = 'SELECT adm_no, first_name, middle_name, surname, sex, level, stream, year, term, com FROM students WHERE 1=1';
    params = [];
    paramCount = 1;
    
    if (marksParams.level) {
      queryText += ` AND level = $${paramCount}`;
      params.push(marksParams.level);
      paramCount++;
    }
    
    if (marksParams.stream) {
      const isFormIV = /^FORM\s+(I|II|III|IV)$/i.test(marksParams.level);
      if (isFormIV && (marksParams.stream === 'A' || marksParams.stream === 'NA')) {
        queryText += ` AND (stream = $${paramCount} OR stream = $${paramCount + 1})`;
        params.push('A', 'NA');
        paramCount += 2;
      } else {
        queryText += ` AND stream = $${paramCount++}`;
        params.push(marksParams.stream);
      }
    }
    
    if (marksParams.year) {
      queryText += ` AND year = $${paramCount++}`;
      params.push(marksParams.year);
    }
    
    // For Form I-IV, marks config shouldn't filter by term, but let's see what happens
    const isFormVOrVI = marksParams.level === 'FORM V' || marksParams.level === 'FORM VI';
    if (isFormVOrVI && marksParams.term) {
      queryText += ` AND term = $${paramCount++}`;
      params.push(marksParams.term);
    }
    
    queryText += ' ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC LIMIT 500';
    
    const marksResult = await query(queryText, params);
    console.log(`Students found: ${marksResult.rows.length}\n`);
    
    console.log('=== SUMMARY ===');
    console.log(`Registration: ${regResult.rows.length} students`);
    console.log(`Score Entry:  ${scoreResult.rows.length} students`);
    console.log(`Marks Config:  ${marksResult.rows.length} students`);
    
    if (regResult.rows.length === scoreResult.rows.length && scoreResult.rows.length === marksResult.rows.length) {
      console.log('\n✅ ALL API CALLS RETURN SAME RESULTS - Issue is likely in frontend');
    } else {
      console.log('\n❌ API CALLS RETURN DIFFERENT RESULTS - Backend logic issue');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

compareAPICalls();
