/**
 * Pre-Form One Continuing Subjects API Routes
 * Handles CRUD operations for continuing subjects management
 */

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { withTransaction } = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { requireAuth } = require('../middleware/auth');

// Get all continuing subjects
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Get continuing subjects request received');
    
    const result = await query(
      'SELECT * FROM preformone_continuing_subjects ORDER BY subject_name'
    );
    
    console.log('🔍 DEBUG: Continuing subjects retrieved successfully:', result.rowCount);
    
    return sendSuccess(res, 200, 'Continuing subjects retrieved successfully', result.rows);
  } catch (error) {
    console.error('🔍 DEBUG: Error fetching continuing subjects:', error);
    return sendError(res, 500, 'Failed to fetch continuing subjects', error);
  }
});

// Get continuing subject by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Get continuing subject by ID request received');
    console.log('🔍 DEBUG: Request params:', req.params);
    
    const { id } = req.params;
    
    // Validation
    if (!id || isNaN(parseInt(id))) {
      console.log('🔍 DEBUG: Invalid subject ID:', id);
      return sendError(res, 400, 'Invalid subject ID');
    }
    
    const result = await query(
      'SELECT * FROM preformone_continuing_subjects WHERE id = $1',
      [id]
    );
    
    console.log('🔍 DEBUG: Continuing subject retrieved successfully:', result.rowCount);
    
    if (result.rowCount === 0) {
      console.log('🔍 DEBUG: Continuing subject not found:', id);
      return sendError(res, 404, 'Continuing subject not found');
    }
    
    return sendSuccess(res, 200, 'Continuing subject retrieved successfully', result.rows[0]);
  } catch (error) {
    console.error('🔍 DEBUG: Error fetching continuing subject:', error);
    return sendError(res, 500, 'Failed to fetch continuing subject', error);
  }
});

// Create new continuing subject
router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Create continuing subject request received');
    console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      subject_name, 
      subject_code, 
      is_active 
    } = req.body;
    
    // Validation
    if (!subject_name || !subject_code) {
      console.log('🔍 DEBUG: Create continuing subject validation failed');
      console.log('🔍 DEBUG: Missing fields:', {
        subject_name: !subject_name,
        subject_code: !subject_code
      });
      return sendError(res, 400, 'Subject name and code are required');
    }
    
    const client = await withTransaction(async (client) => {
      try {
        console.log('🔍 DEBUG: Creating continuing subject with data:', {
          subject_name,
          subject_code,
          is_active
        });
        
        const insertQuery = `
          INSERT INTO preformone_continuing_subjects 
          (subject_name, subject_code, is_active, created_at, updated_at) 
          VALUES ($1, $2, $3, NOW(), NOW()) 
          RETURNING *
        `;
        
        const insertValues = [
          subject_name.trim(),
          subject_code.trim().toUpperCase(),
          is_active !== undefined ? is_active : true
        ];
        
        console.log('🔍 DEBUG: Insert query:', insertQuery);
        console.log('🔍 DEBUG: Insert values:', insertValues);
        
        const result = await client.query(insertQuery, insertValues);
        console.log('🔍 DEBUG: Continuing subject created successfully:', result.rows[0]);
        
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('🔍 DEBUG: Error creating continuing subject:', error);
        
        // Handle duplicate key constraints
        if (error.code === '23505') {
          console.log('🔍 DEBUG: Duplicate key constraint violation');
          console.log('🔍 DEBUG: Error constraint:', error.constraint);
          if (error.constraint && error.constraint.includes('subject_name')) {
            return { success: false, message: 'Subject name already exists' };
          }
          if (error.constraint && error.constraint.includes('subject_code')) {
            return { success: false, message: 'Subject code already exists' };
          }
          return { success: false, message: 'Subject already exists' };
        }
        
        throw error;
      }
    });
    
    if (client.success) {
      console.log('🔍 DEBUG: Create continuing subject transaction completed');
      return sendSuccess(res, 201, 'Continuing subject created successfully', client.data);
    } else {
      console.log('🔍 DEBUG: Create continuing subject failed:', client.message);
      return sendError(res, 400, client.message || 'Failed to create continuing subject');
    }
  } catch (error) {
    console.error('🔍 DEBUG: Error in create continuing subject route:', error);
    return sendError(res, 500, 'Failed to create continuing subject', error);
  }
});

// Update continuing subject
router.put('/:id', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Update continuing subject request received');
    console.log('🔍 DEBUG: Request params:', req.params);
    console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    
    const { id } = req.params;
    const { 
      subject_name, 
      subject_code, 
      is_active 
    } = req.body;
    
    // Validation
    if (!id || isNaN(parseInt(id))) {
      console.log('🔍 DEBUG: Invalid subject ID:', id);
      return sendError(res, 400, 'Invalid subject ID');
    }
    
    if (!subject_name || !subject_code) {
      console.log('🔍 DEBUG: Update continuing subject validation failed');
      console.log('🔍 DEBUG: Missing fields:', {
        subject_name: !subject_name,
        subject_code: !subject_code
      });
      return sendError(res, 400, 'Subject name and code are required');
    }
    
    const client = await withTransaction(async (client) => {
      try {
        console.log('🔍 DEBUG: Updating continuing subject with data:', {
          id,
          subject_name,
          subject_code,
          is_active
        });
        
        // First check if subject exists
        const checkQuery = 'SELECT * FROM preformone_continuing_subjects WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          console.log('🔍 DEBUG: Continuing subject not found:', id);
          return { success: false, message: 'Continuing subject not found' };
        }
        
        console.log('🔍 DEBUG: Continuing subject exists:', checkResult.rows[0]);
        
        const updateQuery = `
          UPDATE preformone_continuing_subjects 
          SET subject_name = $1, subject_code = $2, is_active = $3, updated_at = NOW() 
          WHERE id = $4 
          RETURNING *
        `;
        
        const updateValues = [
          subject_name.trim(),
          subject_code.trim().toUpperCase(),
          is_active !== undefined ? is_active : true,
          parseInt(id)
        ];
        
        console.log('🔍 DEBUG: Update query:', updateQuery);
        console.log('🔍 DEBUG: Update values:', updateValues);
        
        const result = await client.query(updateQuery, updateValues);
        console.log('🔍 DEBUG: Continuing subject updated successfully:', result.rows[0]);
        
        return { success: true, data: result.rows[0] };
      } catch (error) {
        console.error('🔍 DEBUG: Error updating continuing subject:', error);
        
        // Handle duplicate key constraints
        if (error.code === '23505') {
          console.log('🔍 DEBUG: Duplicate key constraint violation');
          console.log('🔍 DEBUG: Error constraint:', error.constraint);
          if (error.constraint && error.constraint.includes('subject_name')) {
            return { success: false, message: 'Subject name already exists' };
          }
          if (error.constraint && error.constraint.includes('subject_code')) {
            return { success: false, message: 'Subject code already exists' };
          }
          return { success: false, message: 'Subject already exists' };
        }
        
        throw error;
      }
    });
    
    if (client.success) {
      console.log('🔍 DEBUG: Update continuing subject transaction completed');
      return sendSuccess(res, 200, 'Continuing subject updated successfully', client.data);
    } else {
      console.log('🔍 DEBUG: Update continuing subject failed:', client.message);
      return sendError(res, 400, client.message || 'Failed to update continuing subject');
    }
  } catch (error) {
    console.error('🔍 DEBUG: Error in update continuing subject route:', error);
    return sendError(res, 500, 'Failed to update continuing subject', error);
  }
});

// Delete continuing subject
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Delete continuing subject request received');
    console.log('🔍 DEBUG: Request params:', req.params);
    
    const { id } = req.params;
    
    // Validation
    if (!id || isNaN(parseInt(id))) {
      console.log('🔍 DEBUG: Invalid subject ID:', id);
      return sendError(res, 400, 'Invalid subject ID');
    }
    
    const client = await withTransaction(async (client) => {
      try {
        console.log('🔍 DEBUG: Deleting continuing subject with ID:', id);
        
        // First check if subject exists
        const checkQuery = 'SELECT * FROM preformone_continuing_subjects WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);
        
        if (checkResult.rowCount === 0) {
          console.log('🔍 DEBUG: Continuing subject not found:', id);
          return { success: false, message: 'Continuing subject not found' };
        }
        
        const deleteQuery = 'DELETE FROM preformone_continuing_subjects WHERE id = $1';
        const deleteResult = await client.query(deleteQuery, [id]);
        
        console.log('🔍 DEBUG: Continuing subject deleted successfully:', deleteResult.rowCount);
        
        return { success: true, message: 'Continuing subject deleted successfully' };
      } catch (error) {
        console.error('🔍 DEBUG: Error deleting continuing subject:', error);
        return { success: false, message: error.message || 'Failed to delete continuing subject' };
      }
    });
    
    if (client.success) {
      console.log('🔍 DEBUG: Delete continuing subject transaction completed');
      return sendSuccess(res, 200, 'Continuing subject deleted successfully');
    } else {
      console.log('🔍 DEBUG: Delete continuing subject failed:', client.message);
      return sendError(res, 400, client.message || 'Failed to delete continuing subject');
    }
  } catch (error) {
    console.error('🔍 DEBUG: Error in delete continuing subject route:', error);
    return sendError(res, 500, 'Failed to delete continuing subject', error);
  }
});

// Export continuing subjects to Excel
router.get('/export', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Export continuing subjects request received');
    
    const result = await query(
      'SELECT subject_name, subject_code, is_active FROM preformone_continuing_subjects ORDER BY subject_name'
    );
    
    console.log('🔍 DEBUG: Continuing subjects for export:', result.rowCount);
    
    // Create CSV content
    const csvContent = [
      'Subject Name,Subject Code,Status',
      ...result.rows.map(subject => [
        subject.subject_name,
        subject.subject_code,
        subject.is_active ? 'Active' : 'Inactive'
      ])
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="preformone-continuing-subjects.csv"');
    res.send(csvContent);
    
    console.log('🔍 DEBUG: Continuing subjects exported successfully');
  } catch (error) {
    console.error('🔍 DEBUG: Error exporting continuing subjects:', error);
    return sendError(res, 500, 'Failed to export continuing subjects', error);
  }
});

module.exports = router;
