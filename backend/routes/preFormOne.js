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
      
      // Validate required fields
      if (!admission_number || !serial_number || !first_name || !surname || !sex) {
        return { success: false, message: 'Missing required fields: admission number, serial number, first name, surname, and sex' };
      }
      
      // Validate sex value
      if (!['Male', 'Female'].includes(sex)) {
        return { success: false, message: 'Sex must be either Male or Female' };
      }
      
      // Get current year or use provided year
      const studentYear = req.body.year || new Date().getFullYear();
      
      const result = await client.query(
        'INSERT INTO preform_one_students (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [admission_number, serial_number, first_name, middle_name, surname, sex, parish, studentYear]
      );
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error creating Pre-Form One student:', error);
      throw error;
    }
  });
  
  try {
    const result = await client;
    res.json(result);
  } catch (error) {
    console.error('Error creating Pre-Form One student:', error);
    sendError(res, 500, 'Failed to create student', error);
  }
});

// Create multiple Pre-Form One students (bulk registration)
router.post('/bulk', requireAuth, async (req, res) => {
  const client = await withTransaction(async (client) => {
    try {
      const { students } = req.body;
      
      if (!students || !Array.isArray(students) || students.length === 0) {
        return { success: false, message: 'Invalid students data' };
      }
      
      const studentYear = req.body.year || new Date().getFullYear();
      const values = students.map(student => [
        student.admission_number,
        student.serial_number,
        student.first_name,
        student.middle_name || '',
        student.surname,
        student.sex,
        student.parish || '',
        studentYear
      ]);
      
      const placeholders = students.map((_, index) => 
        `($${index + 1}, $${index + 2}, $${index + 3}, $${index + 4}, $${index + 5}, $${index + 6}, $${index + 7}, $${index + 8})`
      ).join(', ');
      
      const result = await client.query(
        `INSERT INTO preform_one_students (admission_number, serial_number, first_name, middle_name, surname, sex, parish, year) VALUES ${placeholders}`,
        values.flat()
      );
      
      return { success: true, data: result.rows, count: students.length };
    } catch (error) {
      console.error('Error creating bulk Pre-Form One students:', error);
      throw error;
    }
  });
  
  try {
    res.json(result);
  } catch (error) {
    console.error('Error creating bulk Pre-Form One students:', error);
    sendError(res, 500, 'Failed to create students', error);
  }
});

// Update a Pre-Form One student's parish
router.put('/:id/parish', requireAuth, async (req, res) => {
  const client = await withTransaction(async (client) => {
    try {
      const { id } = req.params;
      const { parish } = req.body;
      
      if (!id || !parish) {
        return { success: false, message: 'Student ID and parish are required' };
      }
      
      const result = await client.query(
        'UPDATE preform_one_students SET parish = $1 WHERE id = $2 RETURNING *',
        [parish, id]
      );
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error updating student parish:', error);
      throw error;
    }
  });
  
  try {
    res.json(result);
  } catch (error) {
    console.error('Error updating student parish:', error);
    sendError(res, 500, 'Failed to update parish', error);
  }
});

// Bulk update parishes for multiple students
router.put('/bulk-parish', requireAuth, async (req, res) => {
  const client = await withTransaction(async (client) => {
    try {
      const { updates } = req.body;
      
      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return { success: false, message: 'Invalid updates data' };
      }
      
      const placeholders = updates.map((_, index) => 
        `($${index + 1}, $${index + 2})`
      ).join(', ');
      
      const result = await client.query(
        `UPDATE preform_one_students SET parish = CASE serial_number WHEN ${placeholders} END WHERE serial_number IN (SELECT serial_number FROM preform_one_students WHERE parish IS NOT NULL)`,
        updates.map(u => u.parish)
      );
      
      return { success: true, data: result.rows, count: updates.length };
    } catch (error) {
      console.error('Error bulk updating parishes:', error);
      throw error;
    }
  });
  
  try {
    res.json(result);
  } catch (error) {
    console.error('Error bulk updating parishes:', error);
    sendError(res, 500, 'Failed to update parishes', error);
  }
});

// Delete a Pre-Form One student
router.delete('/:id', requireAuth, async (req, res) => {
  const client = await withTransaction(async (client) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return { success: false, message: 'Student ID is required' };
      }
      
      const result = await client.query(
        'DELETE FROM preform_one_students WHERE id = $1 RETURNING *',
        [id]
      );
      
      return { success: true, message: 'Student deleted successfully' };
    } catch (error) {
      console.error('Error deleting Pre-Form One student:', error);
      throw error;
    }
  });
  
  try {
    res.json(result);
  } catch (error) {
    console.error('Error deleting Pre-Form One student:', error);
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
