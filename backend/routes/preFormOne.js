const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { query, withTransaction } = require('../config/database');
const { sendError } = require('../utils/safeError');
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
      return sendError(res, 400, 'Invalid year parameter');
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
    sendError(res, 500, 'Failed to fetch students', error);
  }
});

// Create a new Pre-Form One student
router.post('/', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Pre-Form One student registration request received');
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 DEBUG: Request headers:', JSON.stringify(req.headers, null, 2));
  
  const client = await withTransaction(async (client) => {
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
  
  try {
    console.log('🔍 DEBUG: Transaction completed, preparing response');
    const result = await client;
    console.log('🔍 DEBUG: Sending response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error creating Pre-Form One student:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, 500, 'Failed to create student', error);
  }
});

// Create multiple Pre-Form One students (bulk registration)
router.post('/bulk', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Bulk Pre-Form One student registration request received');
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  
  const client = await withTransaction(async (client) => {
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
      
      const bulkInsertQuery = `INSERT INTO preform_one_students (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) VALUES ${placeholders}`;
      
      console.log('🔍 DEBUG: Executing bulk insert query');
      console.log('🔍 DEBUG: Query:', bulkInsertQuery);
      console.log('🔍 DEBUG: Flattened values:', values.flat());
      
      const result = await client.query(bulkInsertQuery, values.flat());
      
      console.log('🔍 DEBUG: Bulk insert query successful');
      console.log('🔍 DEBUG: Row count:', result.rowCount);
      
      return { success: true, data: result.rows, count: students.length };
    } catch (error) {
      console.error('Error creating bulk Pre-Form One students:', error);
      throw error;
    }
  });
  
  try {
    console.log('🔍 DEBUG: Bulk transaction completed, preparing response');
    const result = await client;
    console.log('🔍 DEBUG: Sending bulk response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error creating bulk Pre-Form One students:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, 500, 'Failed to create students', error);
  }
});

// Update a Pre-Form One student's details
router.put('/:id', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Student update request received');
  console.log('🔍 DEBUG: Request params:', JSON.stringify(req.params, null, 2));
  console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
  
  const client = await withTransaction(async (client) => {
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
  
  try {
    console.log('🔍 DEBUG: Student update transaction completed, preparing response');
    const result = await client;
    console.log('🔍 DEBUG: Sending student update response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error updating student:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, 500, 'Failed to update student', error);
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
    const result = await client;
    console.log('🔍 DEBUG: Sending parish update response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error updating student parish:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, 500, 'Failed to update parish', error);
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
    const result = await client;
    console.log('🔍 DEBUG: Sending bulk parish update response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error bulk updating parishes:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, 500, 'Failed to update parishes', error);
  }
});

// Delete a Pre-Form One student
router.delete('/:id', requireAuth, async (req, res) => {
  console.log('🔍 DEBUG: Delete student request received');
  console.log('🔍 DEBUG: Request params:', JSON.stringify(req.params, null, 2));
  
  const client = await withTransaction(async (client) => {
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
  
  try {
    console.log('🔍 DEBUG: Delete transaction completed, preparing response');
    const result = await client;
    console.log('🔍 DEBUG: Sending delete response:', JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error('🔍 DEBUG: Error deleting student:');
    console.error('🔍 DEBUG: Error details:', error);
    console.error('🔍 DEBUG: Error stack:', error.stack);
    sendError(res, 500, 'Failed to delete student', error);
  }
});

// Export Pre-Form One students to CSV
router.get('/:year/export', requireAuth, async (req, res) => {
  try {
    const { year } = req.params;
    
    if (!year || isNaN(parseInt(year))) {
      return sendError(res, 400, 'Invalid year parameter');
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
    sendError(res, 500, 'Failed to export students', error);
  }
});

module.exports = router;
