const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const { sendError } = require('../utils/safeError');

function clientError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const { saveUserActivity } = require('../utils/activityLogger');

/**
 * Pre-Form One Routes
 * Handles all Pre-Form One student management operations
 */

// Get all Pre-Form One students for a specific year
router.get('/:year', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year parameter
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
      [year]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching Pre-Form One students:', error);
    sendError(res, error, 500);
  }
});

// Create a new Pre-Form One student
router.post('/', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Pre-Form One student registration request received');
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 DEBUG: Request headers:', JSON.stringify(req.headers, null, 2));
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const {
          admission_number,
          serial_number,
          first_name,
          middle_name,
          surname,
          sex,
          parish
        } = req.body;
        
        console.log('🔍 DEBUG: Extracted student data:', {
          admission_number,
          serial_number,
          first_name,
          middle_name,
          surname,
          sex,
          parish,
          year: req.body.year
        });
        
        // Validate required fields
        if (!admission_number || !serial_number || !first_name || !surname || !sex) {
          console.log('🔍 DEBUG: Validation failed - missing required fields');
          console.log('🔍 DEBUG: Missing fields:', {
            admission_number: !admission_number,
            serial_number: !serial_number,
            first_name: !first_name,
            surname: !surname,
            sex: !sex
          });
          return { success: false, message: 'Missing required fields: admission number, serial number, first name, surname, and sex' };
        }
        
        console.log('🔍 DEBUG: Required fields validation passed');
        
        // Validate sex value
        if (!['Male', 'Female'].includes(sex)) {
          console.log('🔍 DEBUG: Sex validation failed - invalid sex value:', sex);
          return { success: false, message: 'Sex must be either Male or Female' };
        }
        
        console.log('🔍 DEBUG: Sex validation passed');
        
        // Get current year or use provided year
        const studentYear = req.body.year || new Date().getFullYear();
        console.log('🔍 DEBUG: Student year determined:', studentYear);
        
        const insertQuery = 'INSERT INTO preform_one_students (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
        const insertValues = [admission_number, serial_number, first_name, middle_name, surname, sex, parish, studentYear];
        
        console.log('🔍 DEBUG: Executing insert query');
        console.log('🔍 DEBUG: Query:', insertQuery);
        console.log('🔍 DEBUG: Values:', insertValues);
        
        const result = await client.query(insertQuery, insertValues);
        
        console.log('🔍 DEBUG: Insert query successful');
        console.log('🔍 DEBUG: Inserted student data:', JSON.stringify(result.rows[0], null, 2));
        console.log('🔍 DEBUG: Row count:', result.rowCount);
        
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('Error creating Pre-Form One student:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
          console.log('🔍 DEBUG: Duplicate key constraint violation');
          console.log('🔍 DEBUG: Constraint:', error.constraint);
          console.log('🔍 DEBUG: Detail:', error.detail);
          
          if (error.constraint === 'preform_one_students_admission_number_key') {
            return { success: false, message: 'Admission number already exists. Please try again with a different serial number.' };
          }
          
          return { success: false, message: 'Duplicate data detected. Please check your input and try again.' };
        }
        
        throw error;
      }
    });
    
    console.log('🔍 DEBUG: Transaction completed, preparing response');
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error creating Pre-Form One student:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, error, 500);
  }
});

// Create multiple Pre-Form One students (bulk registration)
router.post('/bulk', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Bulk Pre-Form One student registration request received');
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const { students } = req.body;
        
        console.log('🔍 DEBUG: Students array received:', students);
        console.log('🔍 DEBUG: Number of students:', students?.length || 0);
        
        if (!students || !Array.isArray(students) || students.length === 0) {
          console.log('🔍 DEBUG: Bulk validation failed - invalid students data');
          console.log('🔍 DEBUG: Students validation:', {
            exists: !!students,
            isArray: Array.isArray(students),
            length: students?.length || 0
          });
          return { success: false, message: 'Invalid students data' };
        }
        
        console.log('🔍 DEBUG: Bulk validation passed');
        
        const studentYear = req.body.year || new Date().getFullYear();
        console.log('🔍 DEBUG: Bulk student year determined:', studentYear);
        
        const values = students.map((student, index) => {
          console.log(`🔍 DEBUG: Processing student ${index + 1}:`, student);
          return [
            student.admission_number,
            student.serial_number,
            student.first_name,
            student.middle_name || '',
            student.surname,
            student.sex,
            student.parish || '',
            studentYear
          ];
        });
        
        console.log('🔍 DEBUG: Mapped values for bulk insert:', values);
        
        const placeholders = students.map((_, index) => 
          `($${index * 8 + 1}, $${index * 8 + 2}, $${index * 8 + 3}, $${index * 8 + 4}, $${index * 8 + 5}, $${index * 8 + 6}, $${index * 8 + 7}, $${index * 8 + 8})`
        ).join(', ');
        
        const bulkInsertQuery = `INSERT INTO preform_one_students (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) VALUES ${placeholders} RETURNING *`;
        
        console.log('🔍 DEBUG: Executing bulk insert query');
        console.log('🔍 DEBUG: Query:', bulkInsertQuery);
        console.log('🔍 DEBUG: Flattened values:', values.flat());
        
        const result = await client.query(bulkInsertQuery, values.flat());
        
        console.log('🔍 DEBUG: Bulk insert query successful');
        console.log('🔍 DEBUG: Row count:', result.rowCount);
        
        return { success: true, students: result.rows, count: students.length };
      } catch (error) {
        console.error('Error creating bulk Pre-Form One students:', error);
        throw error;
      }
    });
    
    console.log('🔍 DEBUG: Bulk transaction completed, preparing response');
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error creating bulk Pre-Form One students:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, error, 500);
  }
});

// Update a Pre-Form One student's details
router.put('/:id', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Student update request received');
  console.log('🔍 DEBUG: Request params:', JSON.stringify(req.params, null, 2));
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const { id } = req.params;
        const {
          serial_number,
          first_name,
          middle_name,
          surname,
          sex,
          parish
        } = req.body;
        
        console.log('🔍 DEBUG: Extracted student update data:', {
          id,
          serial_number,
          first_name,
          middle_name,
          surname,
          sex,
          parish
        });
        
        // Validate required fields
        if (!id || !serial_number || !first_name || !surname || !sex) {
          console.log('🔍 DEBUG: Student update validation failed - missing required fields');
          console.log('🔍 DEBUG: Missing fields:', {
            id: !id,
            serial_number: !serial_number,
            first_name: !first_name,
            surname: !surname,
            sex: !sex
          });
          return { success: false, message: 'Missing required fields: serial number, first name, surname, and sex' };
        }
        
        // Validate sex value
        if (!['Male', 'Female'].includes(sex)) {
          console.log('🔍 DEBUG: Sex validation failed - invalid sex value:', sex);
          return { success: false, message: 'Sex must be either Male or Female' };
        }
        
        console.log('🔍 DEBUG: Student update validation passed');
        
        // First check if student exists
        console.log('🔍 DEBUG: Checking if student exists with ID:', id);
        const checkQuery = 'SELECT * FROM preform_one_students WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          console.log('🔍 DEBUG: Student not found with ID:', id);
          return { success: false, message: 'Student not found' };
        }
        
        const updateQuery = 'UPDATE preform_one_students SET serial_number = $1, first_name = $2, middle_name = $3, surname = $4, sex = $5, parish = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *';
        const updateValues = [serial_number, first_name, middle_name, surname, sex, parish || '', id];
        
        console.log('🔍 DEBUG: Executing student update query');
        console.log('🔍 DEBUG: Query:', updateQuery);
        console.log('🔍 DEBUG: Values:', updateValues);
        
        const result = await client.query(updateQuery, updateValues);
        
        console.log('🔍 DEBUG: Student update query successful');
        console.log('🔍 DEBUG: Updated student data:', JSON.stringify(result.rows[0], null, 2));
        console.log('🔍 DEBUG: Row count:', result.rowCount);
        
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('Error updating Pre-Form One student:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
          console.log('🔍 DEBUG: Duplicate key constraint violation');
          console.log('🔍 DEBUG: Constraint:', error.constraint);
          console.log('🔍 DEBUG: Detail:', error.detail);
          
          if (error.constraint === 'preform_one_students_serial_number_key') {
            return { success: false, message: 'Serial number already exists. Please use a different serial number.' };
          }
          
          return { success: false, message: 'Duplicate data detected. Please check your input and try again.' };
        }
        
        throw error;
      }
    });
    
    console.log('🔍 DEBUG: Student update transaction completed, preparing response');
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error updating student:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, error, 500);
  }
});

// Update a Pre-Form One student's parish
router.put('/:id/parish', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Parish update request received');
  console.log('🔍 DEBUG: Request params:', JSON.stringify(req.params, null, 2));
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  
  const client = await withTransaction(async (client) => {
    try {
      const { id } = req.params;
      const { parish } = req.body;
      
      console.log('🔍 DEBUG: Extracted parish update data:', { id, parish });
      
      if (!id) {
        console.log('🔍 DEBUG: Parish update validation failed');
        console.log('🔍 DEBUG: Missing ID:', !id);
        return { success: false, message: 'Student ID is required' };
      }
      
      // Allow empty parish (for removal) but not undefined/null
      if (parish === undefined || parish === null) {
        console.log('🔍 DEBUG: Parish update validation failed - parish is undefined/null');
        return { success: false, message: 'Parish value is required' };
      }
      
      console.log('🔍 DEBUG: Parish update validation passed');
      
      // First check if student exists
      console.log('🔍 DEBUG: Checking if student exists with ID:', id);
      const checkQuery = 'SELECT * FROM preform_one_students WHERE id = $1';
      const checkResult = await client.query(checkQuery, [id]);
      
      console.log('🔍 DEBUG: Student existence check result:', {
        rowCount: checkResult.rowCount,
        studentData: checkResult.rows[0]
      });
      
      if (checkResult.rowCount === 0) {
        console.log('🔍 DEBUG: Student not found with ID:', id);
        return { success: false, message: 'Student not found' };
      }
      
      const updateQuery = 'UPDATE preform_one_students SET parish = $1 WHERE id = $2 RETURNING *';
      const updateValues = [parish, id];
      
      console.log('🔍 DEBUG: Executing parish update query');
      console.log('🔍 DEBUG: Query:', updateQuery);
      console.log('🔍 DEBUG: Values:', updateValues);
      
      const result = await client.query(updateQuery, updateValues);
      
      console.log('🔍 DEBUG: Parish update query successful');
      console.log('🔍 DEBUG: Updated student data:', JSON.stringify(result.rows[0], null, 2));
      console.log('🔍 DEBUG: Row count:', result.rowCount);
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error updating student parish:', error);
      throw error;
    }
  });
  
  try {
    console.log('🔍 DEBUG: Parish update transaction completed, preparing response');
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error updating student parish:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, error, 500);
  }
});

// Bulk update parishes for multiple students
router.put('/bulk-parish', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Bulk parish update request received');
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  
  const client = await withTransaction(async (client) => {
    try {
      const { updates } = req.body;
      
      console.log('🔍 DEBUG: Updates array received:', updates);
      console.log('🔍 DEBUG: Number of updates:', updates?.length || 0);
      
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        console.log('🔍 DEBUG: Bulk parish validation failed - invalid updates data');
        console.log('🔍 DEBUG: Updates validation:', {
          exists: !!updates,
          isArray: Array.isArray(updates),
          length: updates?.length || 0
        });
        return { success: false, message: 'Invalid updates data' };
      }
      
      console.log('🔍 DEBUG: Bulk parish validation passed');
      
      // Process each update individually for better debugging
      const updatedStudents = [];
      for (let i = 0; i < updates.length; i++) {
        const update = updates[i];
        console.log(`🔍 DEBUG: Processing bulk update ${i + 1}:`, update);
        
        // First find the student by serial number
        const findQuery = 'SELECT * FROM preform_one_students WHERE serial_number = $1';
        const findResult = await client.query(findQuery, [update.serial_number]);
        
        console.log(`🔍 DEBUG: Student lookup for serial ${update.serial_number}:`, {
          rowCount: findResult.rowCount,
          studentData: findResult.rows[0]
        });
        
        if (findResult.rowCount === 0) {
          console.log(`🔍 DEBUG: Student not found with serial number: ${update.serial_number}`);
          continue; // Skip this update but continue with others
        }
        
        // Update the parish
        const updateQuery = 'UPDATE preform_one_students SET parish = $1 WHERE serial_number = $2 RETURNING *';
        const updateResult = await client.query(updateQuery, [update.parish, update.serial_number]);
        
        console.log(`🔍 DEBUG: Parish update successful for serial ${update.serial_number}:`, {
          rowCount: updateResult.rowCount,
          updatedData: updateResult.rows[0]
        });
        
        updatedStudents.push(updateResult.rows[0]);
      }
      
      console.log('🔍 DEBUG: Bulk parish update completed');
      console.log('🔍 DEBUG: Total updated students:', updatedStudents.length);
      console.log('🔍 DEBUG: Updated students data:', JSON.stringify(updatedStudents, null, 2));
      
      return { success: true, students: updatedStudents, count: updatedStudents.length };
    } catch (error) {
      console.error('Error bulk updating parishes:', error);
      throw error;
    }
  });
  
  try {
    console.log('🔍 DEBUG: Bulk parish update transaction completed, preparing response');
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error bulk updating parishes:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, error, 500);
  }
});

// Delete a Pre-Form One student
router.delete('/:id', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Delete student request received');
  console.log('🔍 DEBUG: Request params:', JSON.stringify(req.params, null, 2));
  
  try {
    const result = await withTransaction(async (client) => {
      try {
        const { id } = req.params;
        
        console.log('🔍 DEBUG: Extracted student ID for deletion:', id);
        
        if (!id) {
          console.log('🔍 DEBUG: Delete validation failed - missing student ID');
          return { success: false, message: 'Student ID is required' };
        }
        
        console.log('🔍 DEBUG: Delete validation passed');
        
        // First check if student exists
        console.log('🔍 DEBUG: Checking if student exists with ID:', id);
        const checkQuery = 'SELECT * FROM preform_one_students WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          console.log('🔍 DEBUG: Student not found with ID:', id);
          return { success: false, message: 'Student not found' };
        }
        
        console.log('🔍 DEBUG: Student found, proceeding with deletion');
        console.log('🔍 DEBUG: Student to delete:', JSON.stringify(checkResult.rows[0], null, 2));
        
        const result = await client.query(
          'DELETE FROM preform_one_students WHERE id = $1 RETURNING *',
          [id]
        );
        
        console.log('🔍 DEBUG: Delete query successful');
        console.log('🔍 DEBUG: Deleted student data:', JSON.stringify(result.rows[0], null, 2));
        console.log('🔍 DEBUG: Row count:', result.rowCount);
        
        return { success: true, message: 'Student deleted successfully', data: result.rows[0] };
      } catch (error) {
        console.error('Error deleting Pre-Form One student:', error);
        console.error('🔍 DEBUG: Delete error details:', {
          message: error.message,
          code: error.code,
          severity: error.severity,
          detail: error.detail,
          hint: error.hint
        });
        throw error;
      }
    });
    
    console.log('🔍 DEBUG: Delete transaction completed, preparing response');
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error deleting student:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, error, 500);
  }
});

// Export Pre-Form One students to CSV
router.get('/:year/export', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
      [year]
    );
    
    // Create CSV content
    const headers = ['admission_number', 'serial_number', 'first_name', 'middle_name', 'surname', 'sex', 'parish', 'year'];
    const csvContent = [
      headers.join(','),
      ...result.rows.map(student => [
        student.admission_number,
        student.serial_number,
        student.first_name,
        student.middle_name,
        student.surname,
        student.sex,
        student.parish,
        student.year
      ].map(field => field || ''))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="preform-one-students-${year}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting Pre-Form One students:', error);
    sendError(res, error, 500);
  }
});

// Get interview results for a specific year
router.get('/:year/interview-results', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year parameter
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_interview_results WHERE year = $1 ORDER BY position',
      [year]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching Pre-Form One interview results:', error);
    sendError(res, error, 500);
  }
});

// Get continuing results for a specific year
router.get('/:year/continuing-results', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Validate year parameter
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const result = await query(
      'SELECT * FROM preform_one_continuing_results WHERE year = $1 ORDER BY position',
      [year]
    );
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching Pre-Form One continuing results:', error);
    sendError(res, error, 500);
  }
});

// Calculate interview results
router.post('/:year/interview-results/calculate', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const client = await withTransaction(async (client) => {
      // Get students for the year
      const studentsResult = await client.query(
        'SELECT id, admission_number FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
        [year]
      );

      // Get interview subjects
      const subjectsResult = await client.query(
        'SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true'
      );

      if (studentsResult.rows.length === 0 || subjectsResult.rows.length === 0) {
        return [];
      }

      const results = [];

      for (const student of studentsResult.rows) {
        // Get student scores for each subject
        const scoresResult = await client.query(
          'SELECT subject_id, score FROM preform_one_scores WHERE student_id = $1 AND subject_type = $2',
          [student.id, 'interview']
        );

        let totalMarks = 0;
        let subjectCount = 0;

        const studentScores = {};

        for (const subject of subjectsResult.rows) {
          const score = scoresResult.rows.find(s => s.subject_id === subject.id);
          const subjectScore = score ? score.score : 0;

          studentScores[subject.subject_code] = subjectScore;
          totalMarks += subjectScore;
          subjectCount++;
        }

        // Calculate average and grade (assuming all subjects are out of 100)
        const average = subjectCount > 0 ? totalMarks / subjectCount : 0;
        const grade = calculateGrade(average);
        
        // Results will be updated with correct positions after the loop
        const result = {
          student_id: student.id,
          admission_number: student.admission_number,
          total_marks: totalMarks,
          average: average,
          grade: grade,
          position: 0, // Placeholder
          remarks: getRemarks(grade),
          year: parseInt(year)
        };
        
        results.push(result);
      }

      // Calculate correct positions based on average
      const sortedResults = [...results].sort((a, b) => b.average - a.average);
      
      for (let i = 0; i < sortedResults.length; i++) {
        const studentResult = sortedResults[i];
        const position = i + 1;
        
        // Save or update result with correct position
        await client.query(`
          INSERT INTO preform_one_interview_results 
          (student_id, admission_number, total_marks, average, grade, position, remarks, year)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (student_id, year) 
          DO UPDATE SET 
            total_marks = EXCLUDED.total_marks,
            average = EXCLUDED.average,
            grade = EXCLUDED.grade,
            position = EXCLUDED.position,
            remarks = EXCLUDED.remarks,
            updated_at = CURRENT_TIMESTAMP
        `, [
          studentResult.student_id,
          studentResult.admission_number,
          studentResult.total_marks,
          studentResult.average,
          studentResult.grade,
          position,
          getRemarks(studentResult.grade),
          parseInt(year)
        ]);
        
        // Update position in the array we return
        const originalResult = results.find(r => r.student_id === studentResult.student_id);
        if (originalResult) originalResult.position = position;
      }
      
      return results;
    });
    
    const result = await client;
    
    res.json({
      success: true,
      message: 'Interview results calculated and saved successfully!',
      results: result
    });
  } catch (error) {
    console.error('Error calculating interview results:', error);
    sendError(res, error, 500);
  }
});

// Calculate continuing results
router.post('/:year/continuing-results/calculate', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    const client = await withTransaction(async (client) => {
      // Get students for the year
      const studentsResult = await client.query(
        'SELECT id, admission_number FROM preform_one_students WHERE year = $1 ORDER BY admission_number',
        [year]
      );

      // Get continuing subjects
      const subjectsResult = await client.query(
        'SELECT id, subject_code FROM preformone_continuing_subjects WHERE is_active = true'
      );

      if (studentsResult.rows.length === 0 || subjectsResult.rows.length === 0) {
        return [];
      }

      const results = [];

      for (const student of studentsResult.rows) {
        // Get student scores for each subject
        const scoresResult = await client.query(
          'SELECT subject_id, score FROM preform_one_scores WHERE student_id = $1 AND subject_type = $2',
          [student.id, 'continuing']
        );
        
        let totalMarks = 0;
        let subjectCount = 0;
        
        const studentScores = {};
        
        for (const subject of subjectsResult.rows) {
          const score = scoresResult.rows.find(s => s.subject_id === subject.id);
          const subjectScore = score ? score.score : 0;
          
          studentScores[subject.subject_code] = subjectScore;
          totalMarks += subjectScore;
          subjectCount++;
        }
        
        // Calculate average and grade
        const average = subjectCount > 0 ? totalMarks / subjectCount : 0;
        const grade = calculateGrade(average);
        
        // Results will be updated with correct positions after the loop
        const result = {
          student_id: student.id,
          admission_number: student.admission_number,
          total_marks: totalMarks,
          average: average,
          grade: grade,
          position: 0, // Placeholder
          remarks: getRemarks(grade),
          year: parseInt(year)
        };
        
        results.push(result);
      }

      // Calculate correct positions based on average
      const sortedResults = [...results].sort((a, b) => b.average - a.average);
      
      for (let i = 0; i < sortedResults.length; i++) {
        const studentResult = sortedResults[i];
        const position = i + 1;
        
        // Save or update result
        await client.query(`
          INSERT INTO preform_one_continuing_results 
          (student_id, admission_number, total_marks, average, grade, position, remarks, year)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (student_id, year) 
          DO UPDATE SET 
            total_marks = EXCLUDED.total_marks,
            average = EXCLUDED.average,
            grade = EXCLUDED.grade,
            position = EXCLUDED.position,
            remarks = EXCLUDED.remarks,
            updated_at = CURRENT_TIMESTAMP
        `, [
          studentResult.student_id,
          studentResult.admission_number,
          studentResult.total_marks,
          studentResult.average,
          studentResult.grade,
          position,
          getRemarks(studentResult.grade),
          parseInt(year)
        ]);
        
        // Update position in the array we return
        const originalResult = results.find(r => r.student_id === studentResult.student_id);
        if (originalResult) originalResult.position = position;
      }
      
      return results;
    });
    
    const result = await client;
    
    res.json({
      success: true,
      message: 'Continuing results calculated and saved successfully!',
      results: result
    });
  } catch (error) {
    console.error('Error calculating continuing results:', error);
    sendError(res, error, 500);
  }
});

// Get individual interview score
router.get('/interview-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    
    const result = await query(
      'SELECT score FROM preform_one_scores WHERE student_id = $1 AND subject_id = $2 AND subject_type = $3',
      [studentId, subjectId, 'interview']
    );
    
    res.json({
      success: true,
      data: result.rows[0]?.score || 0
    });
  } catch (error) {
    console.error('Error fetching interview score:', error);
    sendError(res, error, 500);
  }
});

// Get individual continuing score
router.get('/continuing-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    
    const result = await query(
      'SELECT score FROM preform_one_scores WHERE student_id = $1 AND subject_id = $2 AND subject_type = $3',
      [studentId, subjectId, 'continuing']
    );
    
    res.json({
      success: true,
      data: result.rows[0]?.score || 0
    });
  } catch (error) {
    console.error('Error fetching continuing score:', error);
    sendError(res, error, 500);
  }
});

// Save individual interview score
router.post('/interview-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { score } = req.body;
    
    const client = await withTransaction(async (client) => {
      const result = await client.query('INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_id, subject_id, subject_type) DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP', [studentId, subjectId, 'interview', score, req.user?.id || 1]);
      
      return result;
    });
    
    const result = await client;
    
    res.json({
      success: true,
      message: 'Interview score saved successfully!',
      data: result
    });
  } catch (error) {
    console.error('Error saving interview score:', error);
    sendError(res, error, 500);
  }
});

// Save individual continuing score
router.post('/continuing-score/:studentId/:subjectId', requireAuth, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { score } = req.body;
    
    const client = await withTransaction(async (client) => {
      const result = await client.query('INSERT INTO preform_one_scores (student_id, subject_id, subject_type, score, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_id, subject_id, subject_type) DO UPDATE SET score = EXCLUDED.score, updated_at = CURRENT_TIMESTAMP', [studentId, subjectId, 'continuing', score, req.user?.id || 1]);
      
      return result;
    });
    
    const result = await client;
    
    res.json({
      success: true,
      message: 'Continuing score saved successfully!',
      data: result
    });
  } catch (error) {
    console.error('Error saving continuing score:', error);
    sendError(res, error, 500);
  }
});

// Download interview results PDF
router.get('/:year/interview-results/pdf', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    // Get results for PDF generation
    const results = await query('SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number, s.parish FROM preform_one_interview_results r JOIN preform_one_students s ON r.student_id = s.id WHERE r.year = $1 ORDER BY r.position', [year]);
    
    // Check if there are any results
    if (results.rows.length === 0) {
      return sendError(res, clientError('No interview results found for this year. Please enter scores and calculate results first.'), 404);
    }
    
    // Get subjects for PDF generation
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    
    // Get subject scores for all students in the year
    const scores = await query(`
      SELECT sc.score, sc.student_id, sub.subject_code 
      FROM preform_one_scores sc
      JOIN preformone_interview_subjects sub ON sc.subject_id = sub.id
      WHERE sc.subject_type = 'interview' AND sc.student_id IN (
        SELECT student_id FROM preform_one_interview_results WHERE year = $1
      )
    `, [year]);
    
    // Create a map of student_id -> subject_code -> score
    const scoresMap = {};
    scores.rows.forEach(scoreRow => {
      const studentId = scoreRow.student_id;
      const subjectCode = scoreRow.subject_code;
      if (!scoresMap[studentId]) {
        scoresMap[studentId] = {};
      }
      scoresMap[studentId][subjectCode] = scoreRow.score;
    });
    
    // Add subject scores to results
    const resultsWithScores = results.rows.map(result => ({
      ...result,
      ...scoresMap[result.student_id] || {}
    }));
    
    console.log('🔍 PDF DEBUG: Starting PDF generation for interview results');
    console.log('🔍 PDF DEBUG: Results count:', resultsWithScores.length);
    console.log('🔍 PDF DEBUG: Subjects count:', subjects.rows.length);
    
    // Generate PDF using puppeteer
    try {
      const puppeteer = require('puppeteer');
      console.log('🔍 PDF DEBUG: Puppeteer module loaded');
      
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      });
      console.log('🔍 PDF DEBUG: Puppeteer browser launched');
      
      const page = await browser.newPage();
      console.log('🔍 PDF DEBUG: New page created');
      
      // Generate HTML content for PDF
      const htmlContent = generateInterviewResultsPDF(resultsWithScores, subjects.rows, year);
      console.log('🔍 PDF DEBUG: HTML content generated, length:', htmlContent.length);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      console.log('🔍 PDF DEBUG: HTML content set to page');
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        timeout: 15000
      });
      console.log('🔍 PDF DEBUG: PDF generated, buffer size:', pdfBuffer.length);
      
      await browser.close();
      console.log('🔍 PDF DEBUG: Browser closed');
      
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="preform-one-interview-results-${year}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      res.end(pdfBuffer);
      console.log('🔍 PDF DEBUG: PDF response sent');
      
    } catch (error) {
      console.error('🔍 PDF ERROR: PDF generation failed:', error);
      console.error('🔍 PDF ERROR: Error stack:', error.stack);
      sendError(res, error, 500);
    }
    
  } catch (error) {
    console.error('Error generating interview results PDF:', error);
    sendError(res, error, 500);
  }
});

// Download individual interview results PDF for a specific student
router.get('/:year/interview-results/:studentId/pdf', requireAuth, async (req, res) => {
  try {
    const { year, studentId } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    if (!studentId || isNaN(parseInt(studentId))) {
      return sendError(res, clientError('Invalid student ID parameter'), 400);
    }
    
    // Get student information
    const student = await query('SELECT * FROM preform_one_students WHERE id = $1 AND year = $2', [studentId, year]);
    
    if (student.rows.length === 0) {
      return sendError(res, clientError('Student not found'), 404);
    }
    
    const studentData = student.rows[0];
    
    // Get interview results for this student
    const results = await query('SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number, s.parish FROM preform_one_interview_results r JOIN preform_one_students s ON r.student_id = s.id WHERE r.student_id = $1 AND r.year = $2', [studentId, year]);
    
    if (results.rows.length === 0) {
      return sendError(res, clientError('No interview results found for this student. Please enter scores and calculate results first.'), 404);
    }
    
    const resultData = results.rows[0];
    
    // Get subjects for PDF generation
    const subjects = await query('SELECT id, subject_code FROM preformone_interview_subjects WHERE is_active = true ORDER BY subject_code');
    
    // Get subject scores for this student
    const scores = await query(`
      SELECT sc.score, sc.student_id, sub.subject_code 
        FROM preform_one_scores sc
        JOIN preformone_interview_subjects sub ON sc.subject_id = sub.id
        WHERE sc.subject_type = 'interview' AND sc.student_id = $1
    `, [studentId]);
    
    // Create a map of subject_code -> score
    const scoresMap = {};
    scores.rows.forEach(scoreRow => {
      const subjectCode = scoreRow.subject_code;
      scoresMap[subjectCode] = scoreRow.score;
    });
    
    console.log('🔍 PDF DEBUG: Starting individual student PDF generation');
    console.log('🔍 PDF DEBUG: Student:', studentData);
    console.log('🔍 PDF DEBUG: Results:', resultData);
    console.log('🔍 PDF DEBUG: Subjects:', subjects.rows.length);
    console.log('🔍 PDF DEBUG: Scores:', scoresMap);
    
    // Generate PDF using puppeteer
    try {
      const puppeteer = require('puppeteer');
      
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000
      });
      
      const page = await browser.newPage();
      
      // Generate HTML content for individual student PDF
      const htmlContent = generateIndividualInterviewPDF(studentData, resultData, subjects.rows, scoresMap, year);
      console.log('🔍 PDF DEBUG: Individual HTML content generated, length:', htmlContent.length);
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        timeout: 15000
      });
      
      await browser.close();
      
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PreFormOne_Interview_Report_${studentData.admission_number}_${year}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error('🔍 PDF ERROR: Individual PDF generation failed:', error);
      console.error('🔍 PDF ERROR: Error stack:', error.stack);
      sendError(res, error, 500);
    }
    
  } catch (error) {
    console.error('Error generating individual interview results PDF:', error);
    sendError(res, error, 500);
  }
});

// Download continuing results PDF
router.get('/:year/continuing-results/pdf', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, clientError('Invalid year parameter'), 400);
    }
    
    // Get results for PDF generation
    const results = await query('SELECT r.*, s.first_name, s.middle_name, s.surname, s.admission_number, s.parish FROM preform_one_continuing_results r JOIN preform_one_students s ON r.student_id = s.id WHERE r.year = $1 ORDER BY r.position', [year]);
    
    // Check if there are any results
    if (results.rows.length === 0) {
      return sendError(res, clientError('No continuing results found for this year. Please enter scores and calculate results first.'), 404);
    }
    
    // Get subjects for PDF generation
    const subjects = await query('SELECT id, subject_code FROM preformone_continuing_subjects WHERE is_active = true ORDER BY subject_code');
    
    // Get subject scores for all students in the year
    const scores = await query(`
      SELECT sc.score, sc.student_id, sub.subject_code 
      FROM preform_one_scores sc
      JOIN preformone_continuing_subjects sub ON sc.subject_id = sub.id
      WHERE sc.subject_type = 'continuing' AND sc.student_id IN (
        SELECT student_id FROM preform_one_continuing_results WHERE year = $1
      )
    `, [year]);
    
    // Create a map of student_id -> subject_code -> score
    const scoresMap = {};
    scores.rows.forEach(scoreRow => {
      const studentId = scoreRow.student_id;
      const subjectCode = scoreRow.subject_code;
      if (!scoresMap[studentId]) {
        scoresMap[studentId] = {};
      }
      scoresMap[studentId][subjectCode] = scoreRow.score;
    });
    
    // Add subject scores to results
    const resultsWithScores = results.rows.map(result => ({
      ...result,
      ...scoresMap[result.student_id] || {}
    }));
    
    console.log('🔍 PDF DEBUG: Starting PDF generation for continuing results');
    console.log('🔍 PDF DEBUG: Results count:', resultsWithScores.length);
    console.log('🔍 PDF DEBUG: Subjects count:', subjects.rows.length);
    
    // Generate PDF using puppeteer
    try {
      const puppeteer = require('puppeteer');
      console.log('🔍 PDF DEBUG: Puppeteer module loaded');
      
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        timeout: 30000
      });
      console.log('🔍 PDF DEBUG: Puppeteer browser launched');
      
      const page = await browser.newPage();
      console.log('🔍 PDF DEBUG: New page created');
      
      // Generate HTML content for PDF
      const htmlContent = generateContinuingResultsPDF(resultsWithScores, subjects.rows, year);
      console.log('🔍 PDF DEBUG: HTML content generated, length:', htmlContent.length);
      
      // Validate HTML content
      if (!htmlContent || htmlContent.length === 0) {
        throw new Error('HTML content is empty');
      }
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      console.log('🔍 PDF DEBUG: HTML content set to page');
      
      // Wait for page to render completely
      await page.waitForTimeout(1000);
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        timeout: 15000,
        scale: 1.0,
        displayHeaderFooter: false
      });
      console.log('🔍 PDF DEBUG: PDF generated, buffer size:', pdfBuffer.length);
      
      await browser.close();
      console.log('🔍 PDF DEBUG: Browser closed');
      
      // Validate PDF buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }
      
      // Check if it's a valid PDF (starts with %PDF)
      const header = pdfBuffer.toString('utf8', 0, 4);
      if (header !== '%PDF') {
        console.error('🔍 PDF ERROR: Invalid PDF header:', header);
        console.error('🔍 PDF ERROR: First 20 bytes:', pdfBuffer.slice(0, 20).toString('hex'));
        console.error('🔍 PDF ERROR: First 50 bytes as text:', pdfBuffer.slice(0, 50).toString('utf8'));
        console.error('🔍 PDF ERROR: HTML content length:', htmlContent.length);
        console.error('🔍 PDF ERROR: HTML content preview:', htmlContent.substring(0, 200));
        throw new Error('Generated file is not a valid PDF');
      }
      
      console.log('🔍 PDF DEBUG: PDF validation passed');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="preform-one-continuing-results-${year}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
      console.log('🔍 PDF DEBUG: PDF response sent');
      
    } catch (error) {
      console.error('🔍 PDF ERROR: PDF generation failed:', error);
      console.error('🔍 PDF ERROR: Error stack:', error.stack);
      sendError(res, error, 500);
    }
    
  } catch (error) {
    console.error('Error generating continuing results PDF:', error);
    sendError(res, error, 500);
  }
});

// Helper function to generate interview results PDF HTML
function generateInterviewResultsPDF(results, subjects, year) {
  const subjectHeaders = subjects.map(s => `<th>${s.subject_code}</th>`).join('');
  
  const tableRows = results.map((result, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${result.admission_number}</td>
      <td>${result.first_name}</td>
      <td>${result.middle_name || ''}</td>
      <td>${result.surname}</td>
      <td>${result.parish || ''}</td>
      ${subjects.map(subject => `<td>${result[subject.subject_code] || 0}</td>`).join('')}
      <td>${parseFloat(result.total_marks).toFixed(2)}</td>
      <td>${parseFloat(result.average).toFixed(2)}</td>
      <td>${result.grade}</td>
      <td>${result.position}</td>
      <td>${result.remarks || ''}</td>
    </tr>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pre-Form One Interview Results ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
      <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
      <h3>Pre-Form One Interview Results ${year}</h3>
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            <th>Admission No</th>
            <th>First Name</th>
            <th>Middle Name</th>
            <th>Surname</th>
            <th>Parish</th>
            ${subjectHeaders}
            <th>Total</th>
            <th>Average</th>
            <th>Grade</th>
            <th>Position</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

// Helper function to generate continuing results PDF HTML
function generateContinuingResultsPDF(results, subjects, year) {
  const subjectHeaders = subjects.map(s => `<th>${s.subject_code}</th>`).join('');
  
  const tableRows = results.map((result, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${result.admission_number}</td>
      <td>${result.first_name}</td>
      <td>${result.middle_name || ''}</td>
      <td>${result.surname}</td>
      <td>${result.parish || ''}</td>
      ${subjects.map(subject => `<td>${result[subject.subject_code] || 0}</td>`).join('')}
      <td>${parseFloat(result.total_marks).toFixed(2)}</td>
      <td>${parseFloat(result.average).toFixed(2)}</td>
      <td>${result.grade}</td>
      <td>${result.position}</td>
      <td>${result.remarks || ''}</td>
    </tr>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pre-Form One Continuing Results ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>CATHOLIC ARCHDIOCESE OF ARUSHA</h1>
      <h2>ARUSHA CATHOLIC SEMINARY-OLDONYOSAMBU</h2>
      <h3>Pre-Form One Continuing Results ${year}</h3>
      <table>
        <thead>
          <tr>
            <th>S/N</th>
            <th>Admission No</th>
            <th>First Name</th>
            <th>Middle Name</th>
            <th>Surname</th>
            <th>Parish</th>
            ${subjectHeaders}
            <th>Total</th>
            <th>Average</th>
            <th>Grade</th>
            <th>Position</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

// Helper functions
function calculateGrade(average) {
  if (average >= 80) return 'A';
  if (average >= 70) return 'B';
  if (average >= 55) return 'C';
  if (average >= 45) return 'D';
  return 'F';
}

function getRemarks(grade) {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Satisfactory';
    case 'D': return 'Needs Improvement';
    case 'F': return 'Fail';
    default: return '';
  }
}

// Save individual interview result
router.post('/interview-result', requireAuth, async (req, res) => {
  try {
    const { year, student_index, total_marks, average, grade, position, remarks } = req.body;
    
    if (!year || !student_index) {
      return sendError(res, clientError('Year and student index are required'), 400);
    }
    
    const client = await withTransaction(async (client) => {
      // Get student by admission number
      const studentResult = await client.query(
        'SELECT id FROM preform_one_students WHERE admission_number = $1 AND year = $2',
        [student_index, year]
      );
      
      if (studentResult.rowCount === 0) {
        return { success: false, message: 'Student not found' };
      }
      
      const studentId = studentResult.rows[0].id;
      
      // Save or update interview result
      const result = await client.query(`
        INSERT INTO preform_one_interview_results 
        (student_id, admission_number, total_marks, average, grade, position, remarks, year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET 
          total_marks = EXCLUDED.total_marks,
          average = EXCLUDED.average,
          grade = EXCLUDED.grade,
          position = EXCLUDED.position,
          remarks = EXCLUDED.remarks,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [studentId, student_index, total_marks, average, grade, position, remarks, year]);
      
      return { success: true, data: result.rows[0] };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error saving interview result:', error);
    sendError(res, error, 500);
  }
});

// Save individual continuing result
router.post('/continuing-result', requireAuth, async (req, res) => {
  try {
    const { year, student_index, total_marks, average, grade, position, remarks } = req.body;
    
    if (!year || !student_index) {
      return sendError(res, clientError('Year and student index are required'), 400);
    }
    
    const client = await withTransaction(async (client) => {
      // Get student by admission number
      const studentResult = await client.query(
        'SELECT id FROM preform_one_students WHERE admission_number = $1 AND year = $2',
        [student_index, year]
      );
      
      if (studentResult.rowCount === 0) {
        return { success: false, message: 'Student not found' };
      }
      
      const studentId = studentResult.rows[0].id;
      
      // Save or update continuing result
      const result = await client.query(`
        INSERT INTO preform_one_continuing_results 
        (student_id, admission_number, total_marks, average, grade, position, remarks, year)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, year) 
        DO UPDATE SET 
          total_marks = EXCLUDED.total_marks,
          average = EXCLUDED.average,
          grade = EXCLUDED.grade,
          position = EXCLUDED.position,
          remarks = EXCLUDED.remarks,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [studentId, student_index, total_marks, average, grade, position, remarks, year]);
      
      return { success: true, data: result.rows[0] };
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error saving continuing result:', error);
    sendError(res, error, 500);
  }
});

// Delete individual interview result
router.delete('/interview-result/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year } = req.query;
    
    if (!studentId || !year) {
      return sendError(res, clientError('Student ID and year are required'), 400);
    }
    
    const result = await query(
      'DELETE FROM preform_one_interview_results WHERE student_id = $1 AND year = $2 RETURNING *',
      [studentId, year]
    );
    
    res.json({
      success: true,
      message: 'Interview result deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting interview result:', error);
    sendError(res, error, 500);
  }
});

// Delete individual continuing result
router.delete('/continuing-result/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year } = req.query;
    
    if (!studentId || !year) {
      return sendError(res, clientError('Student ID and year are required'), 400);
    }
    
    const result = await query(
      'DELETE FROM preform_one_continuing_results WHERE student_id = $1 AND year = $2 RETURNING *',
      [studentId, year]
    );
    
    res.json({
      success: true,
      message: 'Continuing result deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting continuing result:', error);
    sendError(res, error, 500);
  }
});

module.exports = router;
