/**
 * System Grades API Routes
 * Handles system grade configuration and management
 */

const express = require('express');
const router = express.Router();
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { requireAuth } = require('../middleware/auth');
const { calculateGrade } = require('../utils/calculations');

// Get system grade configuration
router.get('/grade-config', requireAuth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Getting system grade configuration');
    
    // Default grade configuration (can be stored in database later)
    const gradeConfig = {
      oLevel: [
        { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
        { grade: 'B', min: 70, max: 84, description: 'Vizuri Sana' },
        { grade: 'C', min: 50, max: 69, description: 'Vizuri' },
        { grade: 'D', min: 40, max: 49, description: 'Dhaifu' },
        { grade: 'F', min: 0, max: 39, description: 'Feli' }
      ],
      aLevel: [
        { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
        { grade: 'B', min: 75, max: 84, description: 'Vizuri Sana' },
        { grade: 'C', min: 65, max: 74, description: 'Vizuri' },
        { grade: 'D', min: 55, max: 64, description: 'Dhaifu' },
        { grade: 'E', min: 45, max: 54, description: 'Wastani' },
        { grade: 'S', min: 40, max: 44, description: 'Kidogo' },
        { grade: 'F', min: 0, max: 39, description: 'Feli' }
      ]
    };
    
    return sendSuccess(res, 200, 'Grade configuration retrieved successfully', gradeConfig);
  } catch (error) {
    console.error('Error getting grade configuration:', error);
    return sendError(res, 500, 'Failed to get grade configuration', error);
  }
});

// Calculate grade using system configuration
router.post('/calculate-grade', requireAuth, async (req, res) => {
  try {
    const { score, level = 'O-Level' } = req.body;
    
    console.log('🔍 DEBUG: Calculating grade for score:', score, 'level:', level);
    
    // Validate input
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return sendError(res, 400, 'Invalid score. Must be a number between 0 and 100');
    }
    
    // Use existing calculateGrade function
    const grade = calculateGrade(score, level);
    
    // Get grade configuration for additional details
    const gradeConfig = await getGradeConfig();
    const isALevel = level.toUpperCase().includes('A-LEVEL') || level.toUpperCase().includes('FORM V') || level.toUpperCase().includes('FORM VI');
    const grades = isALevel ? gradeConfig.aLevel : gradeConfig.oLevel;
    
    // Find grade details
    const gradeDetails = grades.find(g => g.grade === grade) || grades[grades.length - 1]; // Fallback to F
    
    const result = {
      score: score,
      level: level,
      grade: grade,
      description: gradeDetails.description,
      range: `${gradeDetails.min} - ${gradeDetails.max}`
    };
    
    return sendSuccess(res, 200, 'Grade calculated successfully', result);
  } catch (error) {
    console.error('Error calculating grade:', error);
    return sendError(res, 500, 'Failed to calculate grade', error);
  }
});

// Update system grade configuration
router.post('/grade-config', requireAuth, async (req, res) => {
  try {
    const { oLevel, aLevel } = req.body;
    
    console.log('🔍 DEBUG: Updating grade configuration');
    
    // Validate grade configuration
    if (!oLevel || !Array.isArray(oLevel) || oLevel.length === 0) {
      return sendError(res, 400, 'Invalid O-Level grade configuration');
    }
    
    if (!aLevel || !Array.isArray(aLevel) || aLevel.length === 0) {
      return sendError(res, 400, 'Invalid A-Level grade configuration');
    }
    
    // Validate each grade entry
    const validateGrades = (grades) => {
      for (const grade of grades) {
        if (!grade.grade || typeof grade.min !== 'number' || typeof grade.max !== 'number') {
          throw new Error(`Invalid grade configuration for ${grade.grade}`);
        }
        if (grade.min < 0 || grade.max > 100 || grade.min > grade.max) {
          throw new Error(`Invalid score range for grade ${grade.grade}`);
        }
      }
    };
    
    validateGrades(oLevel);
    validateGrades(aLevel);
    
    // For now, just return success (in a real implementation, this would be saved to database)
    const updatedConfig = { oLevel, aLevel };
    
    return sendSuccess(res, 200, 'Grade configuration updated successfully', updatedConfig);
  } catch (error) {
    console.error('Error updating grade configuration:', error);
    return sendError(res, 500, 'Failed to update grade configuration', error);
  }
});

// Helper function to get grade configuration
async function getGradeConfig() {
  return {
    oLevel: [
      { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
      { grade: 'B', min: 70, max: 84, description: 'Vizuri Sana' },
      { grade: 'C', min: 50, max: 69, description: 'Vizuri' },
      { grade: 'D', min: 40, max: 49, description: 'Dhaifu' },
      { grade: 'F', min: 0, max: 39, description: 'Feli' }
    ],
    aLevel: [
      { grade: 'A', min: 85, max: 100, description: 'Bora Sana' },
      { grade: 'B', min: 75, max: 84, description: 'Vizuri Sana' },
      { grade: 'C', min: 65, max: 74, description: 'Vizuri' },
      { grade: 'D', min: 55, max: 64, description: 'Dhaifu' },
      { grade: 'E', min: 45, max: 54, description: 'Wastani' },
      { grade: 'S', min: 40, max: 44, description: 'Kidogo' },
      { grade: 'F', min: 0, max: 39, description: 'Feli' }
    ]
  };
}

module.exports = router;
