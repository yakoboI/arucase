/**
 * Get comments for a specific student
 * Usage: node backend/scripts/getStudentComments.js <admNo> <form> <stream> <year> <term>
 */
require('dotenv').config();
const { query } = require('../config/database');
const { normalizeStream } = require('../utils/streamNormalizer');

async function getStudentComments() {
  const args = process.argv.slice(2);
  if (args.length < 5) {
    console.log('Usage: node backend/scripts/getStudentComments.js <admNo> <form> <stream> <year> <term>');
    console.log('Example: node backend/scripts/getStudentComments.js 1824 "FORM I" NA 2025 "Term II"');
    process.exit(1);
  }

  const [admNo, form, stream, year, term] = args;
  const normalizedStream = normalizeStream(stream);

  // Fix empty password issue
  if (!process.env.PGPASSWORD) {
    process.env.PGPASSWORD = '';
  }

  try {
    console.log('='.repeat(80));
    console.log(`GETTING COMMENTS FOR STUDENT ${admNo}`);
    console.log(`Form: ${form}, Stream: ${stream} (normalized: ${normalizedStream}), Year: ${year}, Term: ${term}`);
    console.log('='.repeat(80));
    console.log();

    // Get student data
    const studentResult = await query(
      'SELECT * FROM students WHERE adm_no = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5',
      [admNo, form, normalizedStream, stream, parseInt(year)]
    );

    if (studentResult.rows.length === 0) {
      console.log(`❌ Student not found: ${admNo} in ${form} ${stream} ${year}`);
      process.exit(1);
    }

    const student = studentResult.rows[0];
    console.log('👤 STUDENT INFO:');
    console.log(`   Name: ${student.first_name} ${student.middle_name || ''} ${student.surname}`);
    console.log(`   ADM No: ${student.adm_no}`);
    console.log(`   Level: ${student.level}`);
    console.log(`   Stream: ${student.stream}`);
    console.log(`   Year: ${student.year}`);
    console.log();

    // Calculate student_index (same logic as reports.js)
    const isFormIToIV = /^FORM\s+(I|II|III|IV)$/i.test(form);
    const sortStudentsByName = (students) => {
      return [...students].sort((a, b) => {
        const firstNameA = String(a.first_name || '').toLowerCase().trim();
        const firstNameB = String(b.first_name || '').toLowerCase().trim();
        const firstNameCompare = firstNameA.localeCompare(firstNameB, undefined, { sensitivity: 'base' });
        if (firstNameCompare !== 0) return firstNameCompare;

        const middleNameA = String(a.middle_name || '').toLowerCase().trim();
        const middleNameB = String(b.middle_name || '').toLowerCase().trim();
        const middleNameCompare = middleNameA.localeCompare(middleNameB, undefined, { sensitivity: 'base' });
        if (middleNameCompare !== 0) return middleNameCompare;

        const surnameA = String(a.surname || '').toLowerCase().trim();
        const surnameB = String(b.surname || '').toLowerCase().trim();
        return surnameA.localeCompare(surnameB, undefined, { sensitivity: 'base' });
      });
    };

    const studentIndexStudentsQuery = (isFormIToIV && normalizedStream === 'A')
      ? `SELECT adm_no, first_name, middle_name, surname
         FROM students
         WHERE level = $1 AND stream IN ($2, $3) AND year = $4
         ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`
      : `SELECT adm_no, first_name, middle_name, surname
         FROM students
         WHERE level = $1 AND stream = $2 AND year = $3
         ORDER BY first_name ASC, middle_name ASC NULLS LAST, surname ASC`;

    const studentIndexStudentsQueryWithLimit = `${studentIndexStudentsQuery} LIMIT 500`;

    const studentIndexStudentsParams = (isFormIToIV && normalizedStream === 'A')
      ? [form, 'A', 'NA', parseInt(year)]
      : [form, normalizedStream, parseInt(year)];

    const studentIndexStudentsResult = await query(
      studentIndexStudentsQueryWithLimit,
      studentIndexStudentsParams
    );

    const sortedStudentsByName = sortStudentsByName(studentIndexStudentsResult.rows);
    const studentIndexPos = sortedStudentsByName.findIndex(
      (s) => String(s.adm_no) === String(admNo)
    );
    const studentIndex = (studentIndexPos >= 0 ? studentIndexPos : -1).toString();

    console.log(`📊 Student Index: ${studentIndex}`);
    console.log();

    // Get comments for the relevant comment types
    const commentTypes = ['mwalimu_taaluma', 'mkuu_shule'];
    console.log('📝 COMMENTS:');
    console.log('-'.repeat(80));

    let commentsResult;
    if (isFormIToIV && normalizedStream === 'A') {
      commentsResult = await query(
        `SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream IN ($3, $4) AND year = $5 AND term = $6 AND comment_type = ANY($7::text[])`,
        [studentIndex, form, 'A', 'NA', parseInt(year), term, commentTypes]
      );
    } else {
      commentsResult = await query(
        'SELECT * FROM comments WHERE student_index = $1 AND level = $2 AND stream = $3 AND year = $4 AND term = $5 AND comment_type = ANY($6::text[])',
        [studentIndex, form, normalizedStream, parseInt(year), term, commentTypes]
      );
    }

    if (commentsResult.rows.length === 0) {
      console.log('❌ No comments found for this student');
    } else {
      commentsResult.rows.forEach(row => {
        console.log(`\n📌 Comment Type: ${row.comment_type}`);
        console.log(`   Text: ${row.comment_text || '(empty)'}`);
        console.log(`   Stream: ${row.stream}`);
      });
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY:');
    console.log('-'.repeat(80));
    
    const mwalimuTaaluma = commentsResult.rows.find(c => c.comment_type === 'mwalimu_taaluma');
    const mkuuShule = commentsResult.rows.find(c => c.comment_type === 'mkuu_shule');

    console.log(`\n🎓 Mwalimu wa Taaluma:`);
    console.log(`   ${mwalimuTaaluma ? mwalimuTaaluma.comment_text : '(not set)'}`);
    
    console.log(`\n👨‍💼 Maoni ya Mkuu wa Shule:`);
    console.log(`   ${mkuuShule ? mkuuShule.comment_text : '(not set)'}`);
    
    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

getStudentComments();
